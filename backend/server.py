from flask import Flask, request, jsonify
from flask_cors import CORS
import git
import os
import shutil

app = Flask(__name__)
CORS(app)

# Directory where we clone the target repository. It sits alongside this server file
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
REPO_DIR = os.path.join(BASE_DIR, "cloned_repos")


def _safe_init_repo_dir():
    """(Re)create a clean directory that will hold the cloned repository."""
    if os.path.exists(REPO_DIR):
        shutil.rmtree(REPO_DIR)
    os.makedirs(REPO_DIR)


@app.route("/api/repo", methods=["POST"])
def clone_repo():
    """Clone a public repository URL and return the most recent 50 commits.

    Expected payload: { "url": "https://github.com/user/repo" }
    """
    data = request.get_json(force=True)
    repo_url = data.get("url") if data else None

    if not repo_url:
        return jsonify({"error": "Repository URL is required"}), 400

    try:
        _safe_init_repo_dir()
        # Clone the repository (shallow, but include ALL branches)
        git.Repo.clone_from(
            repo_url,
            REPO_DIR,
            multi_options=["--no-single-branch"],  # fetch all branches
        )
        repo = git.Repo(REPO_DIR)

        # Determine repository's checked-out default branch (the one HEAD points to)
        try:
            default_branch = repo.head.reference.name  # e.g., 'main', 'master', 'develop'
        except TypeError:
            # Detached HEAD (rare) – fall back to first branch or all commits
            default_branch = None

        if default_branch and default_branch in repo.heads:
            commits = list(repo.iter_commits(default_branch, max_count=50))
        else:
            # As a fallback, take the 50 most recent commits across all branches
            commits = list(repo.iter_commits("--all", max_count=50))

        commit_history = [
            {
                "sha": c.hexsha,
                "author": c.author.name,
                "date": c.committed_datetime.isoformat(),
                "message": c.message.strip(),
            }
            for c in commits
        ]

        return jsonify({"message": f"Successfully cloned {repo_url}", "commit_history": commit_history}), 200

    except git.exc.GitCommandError:
        return (
            jsonify(
                {
                    "error": "Failed to clone repository. Is the URL correct and the repo public?",
                }
            ),
            500,
        )
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/api/commit-tree", methods=["GET"])
def commit_tree():
    """Return the commit DAG (nodes & edges) for the cloned repo.

    Each node contains: sha, author, date, message, branches (list).
    Each edge connects child->parent commit shas.
    """
    if not os.path.exists(REPO_DIR):
        return jsonify({"error": "Repository not initialised. Clone a repo first via POST /api/repo"}), 400

    try:
        repo = git.Repo(REPO_DIR)

        # Ensure we have latest refs
        repo.remotes.origin.fetch(prune=True)

        branch_map = {}
        # Process local branches
        for head in repo.heads:
            for commit in repo.iter_commits(head.name):
                branch_map.setdefault(commit.hexsha, set()).add(head.name)

        # Process remote branches
        if hasattr(repo.remotes, 'origin'):
            for ref in repo.remotes.origin.refs:
                # remote ref name is like 'origin/main', we want 'main'
                ref_name = ref.name.split('/', 1)[-1]
                # Skip the remote's HEAD ref
                if ref_name == 'HEAD':
                    continue
                for commit in repo.iter_commits(ref):
                    branch_map.setdefault(commit.hexsha, set()).add(ref_name)

        nodes = []
        edges = []

        for commit in repo.iter_commits("--all"):
            sha = commit.hexsha
            # gather changed files (limited to 20 for performance)
            try:
                changed_files = list(commit.stats.files.keys())[:20]
            except Exception:
                changed_files = []

            nodes.append(
                {
                    "sha": sha,
                    "author": commit.author.name,
                    "date": commit.committed_datetime.isoformat(),
                    "message": commit.message.strip(),
                    "branches": list(branch_map.get(sha, [])),
                    "isMerge": len(commit.parents) > 1,
                    "files": changed_files,
                }
            )
            for parent in commit.parents:
                edges.append({"from": sha, "to": parent.hexsha})

        return jsonify({"nodes": nodes, "edges": edges}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to construct commit tree: {str(e)}"}), 500


if __name__ == "__main__":
    # Default to port 5001 to keep parity with previous implementation
    app.run(debug=True, port=5001) 
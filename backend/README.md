# Git Chronicle Backend

This is a lightweight Flask server that powers the Git Chronicle visualiser.

## Prerequisites

- Python 3.10+
- Git installed and on your `PATH`

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Running the server

```bash
python server.py
```

The server listens on port `5001` by default.

### Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST   | `/api/repo` | Clone a public repository. Body: `{ "url": "https://github.com/user/repo" }`. Returns the last 50 commits for quick feedback. |
| GET    | `/api/commit-tree` | Returns the full commit **Directed Acyclic Graph (DAG)**: `{ nodes: [...], edges: [...] }` after a repo has been cloned. |

The repo is cloned into `backend/cloned_repos` on each request; the directory is cleared first to keep things tidy.

## Notes

- The clone operation is shallow (`--depth 100`) for performance. Adjust as needed.
- The server prefers the `main` branch but falls back to `master` when generating the initial commit list. 
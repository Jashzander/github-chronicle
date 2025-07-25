
# GitHub Chronicle

GitHub Chronicle is a web-based visualization tool that displays the commit history of any public Git repository as an interactive, directed graph. This allows for an intuitive understanding of the project's evolution, branching, and merging over time.

The application is built with a React front-end and a Python Flask back-end.

## Features

- **Interactive Git Graph**: Visualize the commit history as a dynamic graph.
- **Repository Cloning**: Simply provide a public repository URL to get started.
- **Commit Details**: Click on any node in the graph to view detailed information about that commit.
- **Responsive Design**: The application is designed to work on various screen sizes.

## Architecture

The project is a monorepo with two main components:

- **`frontend/`**: A React application built with Vite that renders the commit graph.
- **`backend/`**: A Flask server that clones repositories and provides the commit data to the front-end.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Python](https://www.python.org/downloads/) (v3.10 or higher)
- [Git](https://git-scm.com/downloads/)

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/github-chronicle.git
    cd github-chronicle
    ```

2.  **Set up the Back-end:**

    ```bash
    cd backend
    python -m venv .venv
    source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`
    pip install -r requirements.txt
    ```

3.  **Set up the Front-end:**

    In a new terminal, navigate to the `frontend` directory:

    ```bash
    cd frontend
    npm install
    ```

### Running the Application

1.  **Start the Back-end Server:**

    In the terminal where you set up the back-end:

    ```bash
    python server.py
    ```

    The back-end server will start on `http://localhost:5001`.

2.  **Start the Front-end Development Server:**

    In the terminal where you set up the front-end:

    ```bash
    npm run dev
    ```

    The front-end development server will start on `http://localhost:5173`. You can now open your browser and navigate to this URL to use the application.

## How It Works

1.  Enter the URL of a public GitHub repository into the input field and click "Go".
2.  The front-end sends a request to the back-end to clone the repository.
3.  The back-end clones the repository, processes the commit history, and sends back the data as a graph structure (nodes and edges).
4.  The front-end then renders this data as an interactive graph.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any bugs or feature requests.

## License

This project is licensed under the MIT License. - see the [LICENSE](LICENSE) file for details.

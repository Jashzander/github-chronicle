// frontend/src/App.jsx

import React, { useState } from 'react';
import './App.css';
import Visualization from './Visualization';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Fetching repository...');
  const [error, setError] = useState('');
  const [showViz, setShowViz] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setLoadingMessage('Fetching repository...');
    setError('');

    document.querySelector('.input-container')?.classList.add('fade-out');

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${BACKEND_URL}/api/repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Something went wrong');
      }

      // Wait for clone to finish, then request full commit tree
      await response.json(); // we only need the side-effect of cloning

      setLoadingMessage('Building commit graph...');

      const treeRes = await fetch(`${BACKEND_URL}/api/commit-tree`);
      if (!treeRes.ok) {
        const errTree = await treeRes.json();
        throw new Error(errTree.error || 'Failed to retrieve commit graph');
      }

      const treeData = await treeRes.json();
      setGraphData({ ...treeData, repoUrl: repoUrl.replace(/\.git$/, '').replace(/\/$/, '') });

      setLoadingMessage('Rendering visualization...');

      setTimeout(() => {
        setShowViz(true);
      }, 500); 

    } catch (err) {
      setError(err.message);
      document.querySelector('.input-container')?.classList.remove('fade-out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      {loading && (
        <div className="loading-overlay">
          <div className="loader large"></div>
          <p className="loading-text">{loadingMessage}</p>
        </div>
      )}
      {!showViz ? (
        <>
          <div className="input-container">
            <h1>Git Chronicle</h1>
            <p>Embark on an interstellar journey through any public GitHub repository’s history. Paste the repo link below and launch!</p>
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <input
                type="text"
                className="repo-input"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                disabled={loading}
              />
              <button type="submit" className="submit-btn" disabled={loading}>
                Launch
              </button>
            </form>
            {/* input-level loader removed as global overlay handles */}
            {error && <p style={{ color: '#ff7675', marginTop: '15px' }}>Error: {error}</p>}
          </div>
          <div className="rocket" />
          <div className="planet" />
          <div className="shooting-star" />
        </>
      ) : (
        <Visualization graph={graphData} />
      )}
    </div>
  );
}

export default App;
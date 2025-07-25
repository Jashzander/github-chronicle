import React from 'react';

function HelpModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Welcome to Git Chronicle!</h2>
        <p>
          This tool visualizes a GitHub repository's commit history as a 3D interactive graph.
          Here's how to navigate and explore:
        </p>
        
        <h4>Camera Controls:</h4>
        <ul>
          <li><strong>Pan:</strong> Click and drag with the left mouse button.</li>
          <li><strong>Rotate:</strong> Click and drag with the right mouse button.</li>
          <li><strong>Zoom:</strong> Use the mouse scroll wheel or the slider at the bottom right.</li>
        </ul>

        <h4>Interaction:</h4>
        <ul>
          <li><strong>Select Commit:</strong> Click on any node (sphere) to view its details in the panel at the bottom. The camera will follow the selected node.</li>
          <li><strong>Navigate History:</strong> Use the <strong>Up/Down Arrow Keys</strong> to move to newer or older commits on the currently selected branch.</li>
          <li><strong>View on GitHub:</strong> Click the "View on GitHub" link in the details panel to open the commit in a new tab.</li>
        </ul>

        <h4>Branch Legend:</h4>
        <ul>
          <li>The legend on the left shows all branches in the repository, sorted by their most recent activity.</li>
          <li><strong>Focus on Branch:</strong> Click any branch name to jump to its latest commit.</li>
          <li><strong>Reset View:</strong> Click "Reset View" at the top of the legend to return the camera to the latest commit of the default branch.</li>
        </ul>
        
        <button onClick={onClose} className="close-btn">Got it!</button>
      </div>
    </div>
  );
}

export default HelpModal; 
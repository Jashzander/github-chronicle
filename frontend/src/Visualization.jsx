// frontend/src/Visualization.jsx

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import HelpModal from './HelpModal';

// The fixed color palette is no longer needed.

function Visualization({ graph }) {
  const mountRef = useRef(null);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [branchColors, setBranchColors] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [zoomLevel, setZoomLevel] = useState(40); // initial camera distance
  const [showHelp, setShowHelp] = useState(false);

  const focusOnBranchRef = useRef(null);
  const resetViewRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const nodeMeshesRef = useRef({});
  const highlightedMeshRef = useRef(null);
  const branchNodesMapRef = useRef({});
  const currentNodeIdxRef = useRef({});
  const selectedBranchRef = useRef(null);
  const nodeBranchMapRef = useRef({});
  const lineMeshesRef = useRef([]);

  useEffect(() => {
    if (!graph) return;

    // Clear refs to prevent data duplication on re-renders (e.g., in StrictMode)
    nodeMeshesRef.current = {};
    branchNodesMapRef.current = {};
    currentNodeIdxRef.current = {};
    nodeBranchMapRef.current = {};
    lineMeshesRef.current = [];

    const currentMount = mountRef.current;
    if (!currentMount) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);
    camera.position.z = 40;
    cameraRef.current = camera;

    // Add OrbitControls for user-driven exploration
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.3;
    controls.zoomSpeed = 0.6;
    controls.minDistance = 5;
    controls.maxDistance = 300;

    // --- Starfield background ---
    const starGeometry = new THREE.BufferGeometry();
    const STAR_EXTENT = 4000;
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * STAR_EXTENT;
      positions[i + 1] = (Math.random() - 0.5) * STAR_EXTENT;
      positions[i + 2] = (Math.random() - 0.5) * STAR_EXTENT;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: true });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // --- Helpers & Materials ---
    const branchColourMap = new Map();

    // Determine trunk branch (main or master)
    const TRUNK_BRANCH = graph.nodes.find((n) => n.branches?.includes('main'))
      ? 'main'
      : 'master';
    const TRUNK_COLOR = 0xffe600; // bright yellow to stand out

    // Collect all side branches
    const sideBranches = [];
    graph.nodes.forEach((n) => {
      (n.branches || []).forEach((b) => {
        if (b !== TRUNK_BRANCH && !sideBranches.includes(b)) sideBranches.push(b);
      });
    });

    const getBranchColour = (branch) => {
      if (branch === TRUNK_BRANCH) return TRUNK_COLOR;
      if (!branchColourMap.has(branch)) {
        const randomColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
        branchColourMap.set(branch, randomColor.getHex());
      }
      return branchColourMap.get(branch);
    };

    const nodeMeshes = {};
    const mergeNodes = []; // for pulsation
    const lineMeshes = [];
    const nodeBranchMap = new Map();

    // --- Position calculation ---
    const seenShas = new Set();
    const uniqueNodes = graph.nodes.filter(node => {
        if (seenShas.has(node.sha)) {
            return false;
        }
        seenShas.add(node.sha);
        return true;
    });

    const sortedNodes = [...uniqueNodes].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const shaToPosition = new Map();

    const pickDisplayBranch = (branches) => {
      // If a commit is on the trunk, it belongs there.
      if (branches.includes(TRUNK_BRANCH)) {
        return TRUNK_BRANCH;
      }
      // For non-trunk commits, prefer the first branch name listed.
      // This helps stabilize the visual representation.
      if (branches.length > 0) {
        return branches[0];
      }
      // Fallback for commits with no explicit branch (should be rare)
      return 'unassigned';
    };

    // --- Radial branch layout params ---
    const allBranches = [TRUNK_BRANCH, ...sideBranches];
    const branchAngleMap = new Map();
    allBranches.forEach((b, idx) => {
      const angle = (idx / allBranches.length) * Math.PI * 2;
      branchAngleMap.set(b, angle);
    });

    const SWIRL_FACTOR = 0.12; // radians added per commit index for helical twist
    const RADIUS_STEP = 6; // distance between branch rings

    sortedNodes.forEach((node) => {
      const displayBranch = pickDisplayBranch(node.branches);
      const branchIdx = allBranches.indexOf(displayBranch);
      const radius = 6 + branchIdx * RADIUS_STEP;
      const angle = branchAngleMap.get(displayBranch);
      const colour = getBranchColour(displayBranch);

      const material = new THREE.MeshStandardMaterial({
        color: colour,
        emissive: colour,
        emissiveIntensity: 0.35,
      });
      const geometry = new THREE.SphereGeometry(0.6, 24, 16);
      const mesh = new THREE.Mesh(geometry, material);

      const index = shaToPosition.size;
      const angleWithTwist = angle + index * SWIRL_FACTOR;
      const posY = index * -2.2 + sortedNodes.length * 2;
      const posX = Math.cos(angleWithTwist) * radius;
      const posZ = Math.sin(angleWithTwist) * radius;
      const pos = new THREE.Vector3(posX, posY, posZ);

      shaToPosition.set(node.sha, pos);
      mesh.position.copy(pos);
      mesh.userData = node;
      scene.add(mesh);
      nodeMeshes[node.sha] = mesh;
      if (node.isMerge) mergeNodes.push(mesh);
      nodeBranchMap.set(node.sha, displayBranch);

      if (!branchNodesMapRef.current[displayBranch]) {
        branchNodesMapRef.current[displayBranch] = [];
      }
      const branchArr = branchNodesMapRef.current[displayBranch];
      branchArr.push(mesh);
      mesh.userData.branchIndex = branchArr.length - 1;
    });

    nodeMeshesRef.current = nodeMeshes;
    nodeBranchMapRef.current = Object.fromEntries(nodeBranchMap.entries());

    selectedBranchRef.current = TRUNK_BRANCH;
    setSelectedBranch(TRUNK_BRANCH);
    currentNodeIdxRef.current[TRUNK_BRANCH] = 0;

    // --- Create Edge Lines ---
    const greyMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });

    graph.edges.forEach((edge) => {
      const fromPos = shaToPosition.get(edge.from);
      const toPos = shaToPosition.get(edge.to);
      if (!fromPos || !toPos) return;
      const points = [fromPos, toPos];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const line = new THREE.Line(geometry, greyMaterial);
      scene.add(line);
      lineMeshes.push(line);
    });
    lineMeshesRef.current = lineMeshes;

    // ---------------- Legend branch selection ----------------
    // Collect all unique side branches from the entire graph data
    const allSideBranches = new Set();
    graph.nodes.forEach(node => {
        (node.branches || []).forEach(branch => {
            if (branch !== TRUNK_BRANCH) {
                allSideBranches.add(branch);
            }
        });
    });

    const sideBranchesList = Array.from(allSideBranches);

    // Create a map of branch -> latest commit date to sort them
    const branchLastCommitDate = new Map();
    sideBranchesList.forEach(branch => {
        let maxDate = 0;
        graph.nodes.forEach(node => {
            if (node.branches.includes(branch)) {
                const commitDate = new Date(node.date).getTime();
                if (commitDate > maxDate) {
                    maxDate = commitDate;
                }
            }
        });
        branchLastCommitDate.set(branch, maxDate);
    });

    // Sort side branches by their latest commit date, descending
    sideBranchesList.sort((a, b) => branchLastCommitDate.get(b) - branchLastCommitDate.get(a));

    const legendBranchNames = [TRUNK_BRANCH, ...sideBranchesList];

    const legendArray = legendBranchNames.map((name) => [
      name,
      name === TRUNK_BRANCH ? TRUNK_COLOR : getBranchColour(name),
    ]);

    setBranchColors(legendArray);

    // --- Lighting ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(0, 0, 50);
    scene.add(pointLight);

    // --- Interactivity ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const focusOnPosition = (pos, meshHighlight = null, zoomDistance = null, fixedAngle = false, localPosForAngle = null) => {
      let newCameraPosition;

      if (fixedAngle) {
        const refPos = localPosForAngle || pos;
        const radialDir = new THREE.Vector3(refPos.x, 0, refPos.z).normalize();
        if (radialDir.lengthSq() === 0) { // Avoid division by zero for commits at origin
            radialDir.x = 1;
        }
        radialDir.y = 0.25; // look down slightly
        radialDir.normalize();
        const distance = zoomDistance !== null ? zoomDistance : camera.position.distanceTo(controls.target);
        newCameraPosition = pos.clone().add(radialDir.multiplyScalar(distance));
      } else {
        const offset = camera.position.clone().sub(controls.target);
        newCameraPosition = pos.clone().add(offset);
      }
      
      controls.target.copy(pos);
      camera.position.copy(newCameraPosition);
      controls.update();

      if (highlightedMeshRef.current) {
        highlightedMeshRef.current.material.emissiveIntensity = 0.35;
        highlightedMeshRef.current.scale.set(1, 1, 1);
      }
      if (meshHighlight) {
        meshHighlight.material.emissiveIntensity = 1.0;
        meshHighlight.scale.set(1.4, 1.4, 1.4);
        highlightedMeshRef.current = meshHighlight;
      }
    };

    const handleClick = (event) => {
      if (event.target.closest('.commit-info')) {
        return;
      }

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const meshesArray = Object.values(nodeMeshesRef.current);
      const intersects = raycaster.intersectObjects(meshesArray);
      if (intersects.length > 0) {
        const firstHit = intersects[0];
        const intersectObj = firstHit.object;
        const commitData = intersectObj.userData;
        setSelectedCommit(commitData);

        const branch = commitData.branches?.[0] || nodeBranchMapRef.current[commitData.sha];
        if (branch) {
          selectedBranchRef.current = branch;
          setSelectedBranch(branch);
          currentNodeIdxRef.current[branch] = commitData.branchIndex ?? 0;
        }
        focusOnPosition(firstHit.point, intersectObj, 20, true, intersectObj.position);
      } else {
        setSelectedCommit(null);
        if (highlightedMeshRef.current) {
          highlightedMeshRef.current.material.emissiveIntensity = 0.35;
          highlightedMeshRef.current.scale.set(1, 1, 1);
          highlightedMeshRef.current = null;
        }
      }
    };

    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    window.addEventListener('click', handleClick);

    const focusOnBranch = (branchName, zoomDistance = 20) => {
      selectedBranchRef.current = branchName;
      setSelectedBranch(branchName);
      currentNodeIdxRef.current[branchName] = 0;

      const branchList = branchNodesMapRef.current[branchName];
      if (branchList && branchList.length > 0) {
        const mesh = branchList[0]; // Focus on the most recent commit
        const worldPosition = new THREE.Vector3();
        mesh.getWorldPosition(worldPosition);
        focusOnPosition(worldPosition, mesh, zoomDistance, true, mesh.position);
        setSelectedCommit(mesh.userData);
      }
    };

    focusOnBranchRef.current = focusOnBranch;

    resetViewRef.current = () => {
      focusOnBranch(TRUNK_BRANCH, 40);
    };

    const applyZoom = (dist) => {
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target.clone().add(dir.multiplyScalar(dist)));
      controls.update();
      setZoomLevel(dist);
    };

    setZoomLevel(camera.position.distanceTo(controls.target));
    controlsRef.current.applyZoom = applyZoom;

    const handleKeyDown = (event) => {
      const branch = selectedBranchRef.current;
      const list = branchNodesMapRef.current[branch] || [];
      let idx = currentNodeIdxRef.current[branch] ?? 0;
      let targetMesh = null;

      switch (event.code) {
        case 'ArrowUp': {
          if (idx > 0) {
            idx -= 1;
            currentNodeIdxRef.current[branch] = idx;
            targetMesh = list[idx];
          }
          break;
        }
        case 'ArrowDown': {
          if (idx < list.length - 1) {
            idx += 1;
            currentNodeIdxRef.current[branch] = idx;
            targetMesh = list[idx];
          }
          break;
        }
        default:
          break;
      }

      if (targetMesh) {
        const worldPosition = new THREE.Vector3();
        targetMesh.getWorldPosition(worldPosition);
        focusOnPosition(worldPosition, targetMesh, null, true, targetMesh.position);
        setSelectedCommit(targetMesh.userData);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = performance.now() * 0.002;

      mergeNodes.forEach((m) => {
        const scale = 1 + Math.sin(time) * 0.2;
        m.scale.set(scale, scale, scale);
      });

      if (highlightedMeshRef.current) {
        const worldPosition = new THREE.Vector3();
        highlightedMeshRef.current.getWorldPosition(worldPosition);
        controls.target.copy(worldPosition);
      }

      controls.update();
      scene.rotation.y += 0.0008;
      starField.rotation.y -= 0.0004;
      starField.position.copy(camera.position);

      renderer.render(scene, camera);
    };
    animate();

    const handleControlChange = () => {
      const dist = camera.position.distanceTo(controls.target);
      setZoomLevel(dist);
    };

    controls.addEventListener('change', handleControlChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', handleControlChange);

      Object.values(nodeMeshes).forEach((mesh) => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
      lineMeshes.forEach((line) => {
        if (line.geometry) line.geometry.dispose();
      });
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
      if (currentMount) currentMount.removeChild(renderer.domElement);
    };
  }, [graph]);

  return (
    <>
      <div className="visualization-container fade-in" ref={mountRef} />
      <div className="zoom-slider">
        <input
          type="range"
          min="5"
          max="300"
          value={zoomLevel}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (controlsRef.current?.applyZoom) controlsRef.current.applyZoom(v);
          }}
        />
      </div>
      {selectedCommit && (
        <div
          className="commit-info"
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface)',
            padding: '15px 20px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
            zIndex: 9999,
            maxWidth: '90vw',
            width: '800px',
            maxHeight: '60vh',
            overflowY: 'auto',
            
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
            {selectedCommit.message}
          </h3>
          {graph.repoUrl && (
            <p style={{ margin: '4px 100px 8px', fontSize: '0.8rem'}}>
              <a href={`${graph.repoUrl}/commit/${selectedCommit.sha}`} target="_blank" rel="noopener noreferrer" style={{ color: '#bb86fc' }}>
                View on GitHub ↗
              </a>
            </p>
          )}
          <p style={{ margin: '4px 100px 8px', fontSize: '0.85rem', color: '#a0a0a0'}}>
            {selectedCommit.author} &middot;{' '}
            {new Date(selectedCommit.date).toLocaleString()}
          </p>
          {selectedCommit.files?.length > 0 && (
            <ul
              style={{
                marginTop: 10,
                maxHeight: 120,
                overflowY: 'auto',
                padding: 0,
                listStyle: 'none',
                textAlign: 'left',
                fontSize: '0.75rem',
              }}
            >
              {selectedCommit.files.map((f) => (
                <li key={f} style={{ padding: '2px 0', color: '#c2c2c2' }}>
                  {f}
                </li>
              ))}
            </ul>
          )}
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: '0.8rem',
              color: '#a0a0a0',
              textAlign: 'center',
            }}
          >
            (click elsewhere to dismiss)
          </p>
        </div>
      )}

      {branchColors.length > 0 && (
        <div className="branch-legend">
            <div
              className="branch-item legend-header"
              onClick={() => {
                if (resetViewRef.current) resetViewRef.current();
              }}
            >
              Reset View
            </div>
            {branchColors.map(([name, col]) => (
              <div
                key={name}
                className="branch-item"
                title={name}
                onClick={() => focusOnBranchRef.current && focusOnBranchRef.current(name)}
                style={{ cursor: 'pointer' }}
              >
                <span
                  className="branch-swatch"
                  style={{ background: `#${col.toString(16).padStart(6, '0')}`}}
                />
                <span
                  className="branch-name"
                  title={name}
                  style={{
                    fontWeight: selectedBranch === name ? '700' : '400',
                  }}
                >
                  {name}
                </span>
              </div>
            ))}
        </div>
      )}

      <button className="help-btn" onClick={() => setShowHelp(true)}>
        Help
      </button>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}

export default Visualization;
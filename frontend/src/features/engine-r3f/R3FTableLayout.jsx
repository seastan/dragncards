/**
 * R3F Table Layout - 3D rendering alternative to TableLayout
 *
 * This component provides a 3D view of the game table using React Three Fiber.
 * It reads from the same Redux state as the 2D TableLayout but renders in 3D.
 */

import React, { Suspense, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useRef } from 'react';
import { getCameraPosition } from './utils/cameraUtils';
import { R3FSceneFromRedux } from './components/R3FScene';
import { useDoActionList } from '../engine/hooks/useDoActionList';
import { useR3FDragActions } from './R3FDragSystem';

// Loading fallback for Suspense
const LoadingFallback = () => (
  <mesh>
    <boxGeometry args={[5, 5, 0.1]} />
    <meshStandardMaterial color="#333" />
  </mesh>
);

// Camera component that looks at a target point
const CameraWithTarget = ({ position, yOffset }) => {
  const cameraRef = useRef();

  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.lookAt(0, yOffset, 0);
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={position} fov={50} near={0.1} far={1000} />;
};

// Main R3F Table Layout component
export const R3FTableLayout = ({
  cameraTilt = 80,
  yOffset = -14,
  zoom = 132,
  showControls = false
}) => {
  const [localCameraTilt, setLocalCameraTilt] = useState(cameraTilt);
  const [localYOffset, setLocalYOffset] = useState(yOffset);
  const [localZoom, setLocalZoom] = useState(zoom);
  const [showRegionBoundaries, setShowRegionBoundaries] = useState(true);

  // Get doActionList hook for executing game actions
  const doActionList = useDoActionList();

  // Get drag handler that integrates with the action list system
  const { handleDrop } = useR3FDragActions(doActionList);

  const cameraPosition = useMemo(
    () => getCameraPosition(localCameraTilt, localZoom),
    [localCameraTilt, localZoom]
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0a', position: 'relative' }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ touchAction: 'none' }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <CameraWithTarget position={cameraPosition} yOffset={localYOffset} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[0, 100, 0]} intensity={0.9} />
          <R3FSceneFromRedux
            showRegionBoundaries={showRegionBoundaries}
            onCardDrop={handleDrop}
          />
        </Suspense>
      </Canvas>

      {/* Info overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.85)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '8px',
        fontFamily: 'system-ui',
        fontSize: '12px'
      }}>
        <div>3D Mode (Beta)</div>
      </div>

      {/* Optional camera controls overlay */}
      {showControls && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.85)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          fontFamily: 'system-ui',
          width: '220px',
          fontSize: '12px'
        }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Angle: {localCameraTilt}°
          </label>
          <input
            type="range"
            min={20}
            max={90}
            value={localCameraTilt}
            onChange={(e) => setLocalCameraTilt(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', marginBottom: '10px' }}
          />

          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Y Offset: {localYOffset}
          </label>
          <input
            type="range"
            min={-50}
            max={50}
            value={localYOffset}
            onChange={(e) => setLocalYOffset(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', marginBottom: '10px' }}
          />

          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Zoom: {localZoom}%
          </label>
          <input
            type="range"
            min={25}
            max={200}
            value={localZoom}
            onChange={(e) => setLocalZoom(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', marginBottom: '10px' }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showRegionBoundaries}
              onChange={(e) => setShowRegionBoundaries(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Show Regions</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default R3FTableLayout;

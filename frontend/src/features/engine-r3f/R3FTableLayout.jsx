/**
 * R3F Table Layout - 3D rendering alternative to TableLayout
 *
 * This component provides a 3D view of the game table using React Three Fiber.
 * It reads from the same Redux state as the 2D TableLayout but renders in 3D.
 */

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useSelector } from 'react-redux';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useRef } from 'react';
import { getCameraPosition } from './utils/cameraUtils';
import { TableDimensionsProvider } from './contexts/TableDimensionsContext';
import { R3FSceneFromRedux } from './components/R3FScene';
import { useDoActionList } from '../engine/hooks/useDoActionList';
import { useR3FDragActions } from './R3FDragSystem';
import { R3FBrowsePanel } from './components/R3FBrowsePanel';
import { useBrowseFiltering } from '../engine/hooks/useBrowseFiltering';
import { useLayout } from '../engine/hooks/useLayout';
import { useGameL10n } from '../engine/hooks/useGameL10n';
import { convertToPercentage } from '../engine/functions/common';

// Triggers a render whenever Redux game state changes
const ReduxInvalidator = () => {
  const { invalidate } = useThree();
  const gameUi = useSelector(state => state?.gameUi);
  useEffect(() => { invalidate(); }, [gameUi, invalidate]);
  return null;
};

// Loading fallback for Suspense
const LoadingFallback = () => (
  <mesh>
    <boxGeometry args={[5, 5, 0.1]} />
    <meshStandardMaterial color="#333" />
  </mesh>
);

// Component to configure renderer settings (disable tone mapping for accurate colors)
const RendererConfig = () => {
  const { gl } = useThree();
  gl.toneMapping = THREE.NoToneMapping;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.setPixelRatio(2);
  return null;
};

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

  const layout = useLayout();
  const gameL10n = useGameL10n();

  // Browse filtering state (shared between 3D scene and browse panel overlay)
  const { filteredStackIndices, searchForProperty, setSearchForProperty, searchForText, setSearchForText, resetFilters } = useBrowseFiltering();

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
        dpr={window.devicePixelRatio}
        gl={{ antialias: true, alpha: false, stencil: true, powerPreference: 'high-performance' }}
        style={{ touchAction: 'none' }}
        frameloop="demand"
      >
        <Suspense fallback={<LoadingFallback />}>
          <ReduxInvalidator />
          <RendererConfig />
          <CameraWithTarget position={cameraPosition} yOffset={localYOffset} />
          <TableDimensionsProvider>
            <ambientLight intensity={0.4} />
            <directionalLight position={[0, 100, 0]} intensity={0.9} />
            <R3FSceneFromRedux
              showRegionBoundaries={showRegionBoundaries}
              onCardDrop={handleDrop}
              browseFilteredStackIndices={filteredStackIndices}
            />
          </TableDimensionsProvider>
        </Suspense>
      </Canvas>

      {/* Hover TextBox overlays — screen-space, positioned relative to this container */}
      {layout?.textBoxes && Object.entries(layout.textBoxes).map(([id, tb]) => {
        if (tb.visible === false || !tb.hover) return null;
        const customStyle = tb.style || {};
        return (
          <div key={id} style={{
            position: 'absolute',
            left: convertToPercentage(tb.left),
            top: convertToPercentage(tb.top),
            width: convertToPercentage(tb.width),
            height: convertToPercentage(tb.height),
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid #6b7280',
            color: '#9ca3af',
            backgroundColor: '#374151',
            pointerEvents: 'none',
            zIndex: 50,
            ...customStyle,
          }}>
            {gameL10n(tb.label)}
          </div>
        );
      })}

      {/* Browse panel overlay */}
      <R3FBrowsePanel
        searchForProperty={searchForProperty}
        setSearchForProperty={setSearchForProperty}
        searchForText={searchForText}
        setSearchForText={setSearchForText}
        resetFilters={resetFilters}
      />

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
            max={1800}
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

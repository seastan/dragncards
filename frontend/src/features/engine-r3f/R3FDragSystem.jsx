/**
 * R3F Drag and Drop System
 *
 * Handles card dragging, drop target detection, and backend action execution
 * in the 3D view.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import store from '../../store';
import { TABLE_WIDTH, TABLE_HEIGHT } from './utils/cameraUtils';
import { parsePercent, worldToPercent } from './utils/regionUtils';

// Context to share drag state across components
const DragContext = createContext(null);

export const useDragContext = () => useContext(DragContext);

/**
 * Get region bounds in 3D world coordinates
 */
export const getRegionBounds = (region) => {
  const left = parsePercent(region.left);
  const top = parsePercent(region.top);
  const width = parsePercent(region.width);
  const height = parsePercent(region.height);

  const minX = ((left / 100) - 0.5) * TABLE_WIDTH;
  const maxX = (((left + width) / 100) - 0.5) * TABLE_WIDTH;
  const minZ = ((top / 100) - 0.5) * TABLE_HEIGHT;
  const maxZ = (((top + height) / 100) - 0.5) * TABLE_HEIGHT;

  return {
    minX, maxX, minZ, maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX,
    height: maxZ - minZ
  };
};

/**
 * Check if a 3D point is inside a region
 */
export const isPointInRegion = (x, z, region) => {
  const bounds = getRegionBounds(region);
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
};

/**
 * DragProvider - Provides drag state and handlers to child components
 */
export const DragProvider = ({ children, onDrop }) => {
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedCardId: null,
    draggedStackId: null,
    sourceGroupId: null,
    sourceRegion: null,
    currentPosition: null,
    hoverRegion: null,
    hoverGroupId: null,
  });

  const startDrag = useCallback((cardId, stackId, groupId, region, position) => {
    setDragState({
      isDragging: true,
      draggedCardId: cardId,
      draggedStackId: stackId,
      sourceGroupId: groupId,
      sourceRegion: region,
      currentPosition: position,
      hoverRegion: region,
      hoverGroupId: groupId,
    });
  }, []);

  const updateDrag = useCallback((position, hoverRegion, hoverGroupId) => {
    setDragState(prev => ({
      ...prev,
      currentPosition: position,
      hoverRegion: hoverRegion || prev.hoverRegion,
      hoverGroupId: hoverGroupId || prev.hoverGroupId,
    }));
  }, []);

  const endDrag = useCallback((finalPosition) => {
    if (dragState.isDragging && onDrop) {
      onDrop({
        stackId: dragState.draggedStackId,
        cardId: dragState.draggedCardId,
        sourceGroupId: dragState.sourceGroupId,
        sourceRegion: dragState.sourceRegion,
        targetGroupId: dragState.hoverGroupId,
        targetRegion: dragState.hoverRegion,
        position: finalPosition,
      });
    }

    setDragState({
      isDragging: false,
      draggedCardId: null,
      draggedStackId: null,
      sourceGroupId: null,
      sourceRegion: null,
      currentPosition: null,
      hoverRegion: null,
      hoverGroupId: null,
    });
  }, [dragState, onDrop]);

  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedCardId: null,
      draggedStackId: null,
      sourceGroupId: null,
      sourceRegion: null,
      currentPosition: null,
      hoverRegion: null,
      hoverGroupId: null,
    });
  }, []);

  const value = useMemo(() => ({
    ...dragState,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  }), [dragState, startDrag, updateDrag, endDrag, cancelDrag]);

  return (
    <DragContext.Provider value={value}>
      {children}
    </DragContext.Provider>
  );
};

/**
 * RegionBoundary - Visual representation of a region's boundaries
 */
export const RegionBoundary = ({ region, isHovered = false, showLabel = true, stackCount = 0 }) => {
  const bounds = getRegionBounds(region);
  const y = 0.01; // Slightly above the table

  // Colors based on region type
  const colors = {
    free: '#4A90E2',
    row: '#7ED321',
    pile: '#F5A623',
    fan: '#BD10E0',
    default: '#888888'
  };

  const color = colors[region.type] || colors.default;
  const opacity = isHovered ? 0.4 : 0.15;
  const borderOpacity = isHovered ? 0.8 : 0.4;

  // Import Html from drei for text labels
  const { Html } = require('@react-three/drei');

  return (
    <group position={[bounds.centerX, y, bounds.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Region fill */}
      <mesh>
        <planeGeometry args={[bounds.width, bounds.height]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>

      {/* Region border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(bounds.width, bounds.height)]} />
        <lineBasicMaterial color={color} transparent opacity={borderOpacity} linewidth={2} />
      </lineSegments>

      {/* Region label - positioned at center, always faces camera */}
      {showLabel && (
        <Html
          position={[0, 0.5, 0]}
          center
          style={{ pointerEvents: 'none' }}
          zIndexRange={[0, 0]}
        >
          <div style={{
            color: 'white',
            fontSize: '11px',
            fontFamily: 'system-ui, sans-serif',
            textShadow: '0 0 3px black, 0 0 3px black, 0 0 6px black',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.5)',
            padding: '2px 6px',
            borderRadius: '4px',
          }}>
            <div style={{ fontWeight: 'bold', color: color }}>{region.label || region.id || 'Region'}</div>
            <div style={{ fontSize: '9px', opacity: 0.8 }}>{region.type} | {stackCount} stacks</div>
          </div>
        </Html>
      )}
    </group>
  );
};

/**
 * DropTargetDetector - Detects which region the cursor/card is over
 */
export const useDropTargetDetection = (regions) => {
  const findRegionAtPoint = useCallback((x, z) => {
    if (!regions) return null;

    for (const [regionId, region] of Object.entries(regions)) {
      if (region.visible === false) continue;
      if (isPointInRegion(x, z, region)) {
        return { regionId, region };
      }
    }
    return null;
  }, [regions]);

  return { findRegionAtPoint };
};

/**
 * Hook to handle drag operations with the action list system
 */
export const useR3FDragActions = (doActionList) => {
  const handleDrop = useCallback((dropData) => {
    const {
      stackId,
      sourceGroupId,
      targetGroupId,
      targetRegion,
      position,
      insertionIndex
    } = dropData;

    if (!stackId || !targetGroupId) {
      console.warn('Invalid drop data:', dropData);
      return;
    }

    const game = store.getState()?.gameUi?.game;
    if (!game) return;

    const stack = game.stackById?.[stackId];
    if (!stack) return;

    const cardId = stack.cardIds?.[0];
    const card = game.cardById?.[cardId];
    const cardName = card?.sides?.[card?.currentSide]?.name || 'card';

    const sourceGroup = game.groupById?.[sourceGroupId];
    const targetGroup = game.groupById?.[targetGroupId];

    // Calculate position for free regions
    let stackLeft = null;
    let stackTop = null;

    if (targetRegion?.type === 'free' && position) {
      // Convert 3D position to percentage within the region
      const regionBounds = getRegionBounds(targetRegion);
      const regionLeft = parsePercent(targetRegion.left);
      const regionTop = parsePercent(targetRegion.top);
      const regionWidth = parsePercent(targetRegion.width);
      const regionHeight = parsePercent(targetRegion.height);

      // Convert world position to table percentage
      const tablePercent = worldToPercent(position[0], position[2]);

      // Convert to percentage within region
      stackLeft = ((tablePercent.left - regionLeft) / regionWidth * 100) + '%';
      stackTop = ((tablePercent.top - regionTop) / regionHeight * 100) + '%';
    }

    // Determine destination index
    // Use insertionIndex for row/fan regions, 0 for piles, end for others
    let destIndex;
    if (targetRegion?.type === 'pile') {
      destIndex = 0;
    } else if (insertionIndex !== null && insertionIndex !== undefined) {
      destIndex = insertionIndex;
    } else {
      destIndex = targetGroup?.stackIds?.length || 0;
    }

    // Build the action list
    const actionList = [
      ["LOG", "$ALIAS_N", " moved ", cardName, " from ", `$GAME.groupById.${sourceGroupId}.label`, " to ", `$GAME.groupById.${targetGroupId}.label`, "."],
      ["MOVE_STACK", stackId, targetGroupId, destIndex, { "allowFlip": true }],
    ];

    // Add position for free regions
    if (stackLeft !== null && stackTop !== null) {
      actionList.push(
        ["COND",
          ["DEFINED", `$GAME.stackById.${stackId}`],
          [
            ["SET", `/stackById/${stackId}/left`, stackLeft],
            ["SET", `/stackById/${stackId}/top`, stackTop]
          ]
        ]
      );
    }

    console.log('R3F Drop action:', { actionList, dropData, destIndex, insertionIndex });

    doActionList(actionList, `Moved ${cardName} from ${sourceGroup?.label} to ${targetGroup?.label}`);

  }, [doActionList]);

  return { handleDrop };
};

export default DragProvider;

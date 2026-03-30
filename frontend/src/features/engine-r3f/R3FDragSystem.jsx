/**
 * R3F Drag and Drop System
 *
 * Handles card dragging, drop target detection, and backend action execution
 * in the 3D view.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import * as THREE from 'three';
import store from '../../store';
import { TABLE_WIDTH, TABLE_HEIGHT } from './utils/cameraUtils';
import { parsePercent, worldToPercent } from './utils/regionUtils';
import { useTableDimensions } from './contexts/TableDimensionsContext';

// Context to share drag state across components
const DragContext = createContext(null);

export const useDragContext = () => useContext(DragContext);

/**
 * Get region bounds in 3D world coordinates
 */
export const getRegionBounds = (region, tw = TABLE_WIDTH, th = TABLE_HEIGHT) => {
  const left = parsePercent(region.left);
  const top = parsePercent(region.top);
  const width = parsePercent(region.width);
  const height = parsePercent(region.height);

  const minX = ((left / 100) - 0.5) * tw;
  const maxX = (((left + width) / 100) - 0.5) * tw;
  const minZ = ((top / 100) - 0.5) * th;
  const maxZ = (((top + height) / 100) - 0.5) * th;

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
export const isPointInRegion = (x, z, region, tw = TABLE_WIDTH, th = TABLE_HEIGHT) => {
  const bounds = getRegionBounds(region, tw, th);
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
  const { tableWidth, tableHeight } = useTableDimensions();
  const bounds = getRegionBounds(region, tableWidth, tableHeight);
  const layerIndex = region.layerIndex || 0;
  const y = layerIndex > 0 ? layerIndex * 0.5 - 0.01 : 0.01; // Elevated regions sit just below their cards

  // Colors based on region type
  const colors = {
    free: '#4A90E2',
    row: '#7ED321',
    pile: '#F5A623',
    fan: '#BD10E0',
    default: '#888888'
  };

  const color = colors[region.type] || colors.default;
  const isElevated = layerIndex > 0;
  const opacity = isElevated ? 1.0 : (isHovered ? 0.4 : 0.15);
  const borderOpacity = isHovered ? 0.8 : 0.4;

  // Import Html from drei for text labels
  const { Html } = require('@react-three/drei');

  return (
    <group position={[bounds.centerX, y, bounds.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Region fill */}
      <mesh>
        <planeGeometry args={[bounds.width, bounds.height]} />
        <meshBasicMaterial
          color={isElevated ? '#1a1a2e' : color}
          transparent={!isElevated}
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={isElevated}
        />
      </mesh>

      {/* Region border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(bounds.width, bounds.height)]} />
        <lineBasicMaterial color={color} transparent opacity={borderOpacity} linewidth={2} />
      </lineSegments>

      {/* Region label - only shown for pile regions */}
      {showLabel && region.type === 'pile' && (
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
            {stackCount} <FontAwesomeIcon icon={faLayerGroup} />
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

    let best = null;
    let bestLayer = -1;
    for (const [regionId, region] of Object.entries(regions)) {
      if (region.visible === false) continue;
      if (isPointInRegion(x, z, region)) {
        const layer = region.layerIndex || 0;
        if (layer > bestLayer) {
          best = { regionId, region };
          bestLayer = layer;
        }
      }
    }
    return best;
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
      insertionIndex,
      combineStackId,
      combineDirection,
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

    // --- Combine (attachment) drop ---
    if (combineStackId && combineDirection) {
      const destStack = game.stackById?.[combineStackId];
      const destCardId = destStack?.cardIds?.[0];
      const destCard = game.cardById?.[destCardId];
      const destStackIndex = destCard?.stackIndex ?? 0;

      const actionList = [
        ["LOG", "$ALIAS_N", " attached ", cardName, " from ", `$GAME.groupById.${sourceGroupId}.label`, " to ", ["FACEUP_NAME_FROM_STACK_ID", combineStackId], "."],
        ["MOVE_STACK", stackId, targetGroupId, destStackIndex, { "combine": combineDirection, "allowFlip": true }],
      ];

      console.log('R3F Combine action:', { actionList, dropData, combineStackId, combineDirection });

      doActionList(actionList, `Attached ${cardName} to ${destCard?.sides?.[destCard?.currentSide]?.name || 'card'}`);
      return;
    }

    // --- Normal move drop ---

    // Calculate position for free regions
    let stackLeft = null;
    let stackTop = null;

    if (targetRegion?.type === 'free' && position) {
      // Convert 3D position to percentage within the region
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

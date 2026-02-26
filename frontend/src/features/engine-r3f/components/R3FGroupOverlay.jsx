/**
 * R3FGroupOverlay - Per-region hover label with eye/menu buttons
 * Shown when isHovered is true (driven by canvas-level pointer tracking).
 * Falls back to htmlHovered state when mouse is over the label itself.
 */

import React, { useState, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useSelector, useDispatch } from 'react-redux';
import { faBars, faEye } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getRegionBounds } from '../R3FDragSystem';
import { useBrowseTopN } from '../../engine/hooks/useBrowseTopN';
import { useGameL10n } from '../../engine/hooks/useGameL10n';
import { setDropdownMenu } from '../../store/playerUiSlice';

export const R3FGroupOverlay = ({ region, groupId, isHovered }) => {
  // Track hover of the Html label itself so moving from the 3D canvas to the
  // label doesn't cause a flicker (canvas pointerleave fires before Html onMouseEnter)
  const [htmlHovered, setHtmlHovered] = useState(false);
  const htmlHideTimeout = useRef(null);

  const handleHtmlEnter = () => {
    if (htmlHideTimeout.current) clearTimeout(htmlHideTimeout.current);
    setHtmlHovered(true);
  };

  const handleHtmlLeave = () => {
    htmlHideTimeout.current = setTimeout(() => setHtmlHovered(false), 150);
  };

  const dispatch = useDispatch();
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const gameL10n = useGameL10n();
  const browseTopN = useBrowseTopN();

  if (!group || region.hideTitle || region.id === 'browse') return null;

  const bounds = getRegionBounds(region);
  const layerIndex = region.layerIndex || 0;
  // Sit just above the region background, below cards
  const y = layerIndex * 0.5 + 0.05;

  const isPile = region.type === 'pile';
  const iconsVisible = playerN && (region.showMenu || (isPile && region.showMenu !== false));
  const numStacks = group.stackIds?.length || 0;
  const tableLabel = gameL10n(group.tableLabel || group.label);

  const visible = isHovered || htmlHovered;

  const handleEyeClick = (e) => {
    e.stopPropagation();
    browseTopN(groupId, 'All');
  };

  const handleBarsClick = (e) => {
    e.stopPropagation();
    if (!playerN) return;
    dispatch(setDropdownMenu({
      type: 'group',
      group,
      title: gameL10n(group.label),
    }));
  };

  return (
    <group position={[bounds.centerX, y, bounds.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Label anchored to top-left corner of region.
          In this group's local space (rotated -90° around X):
            local X  → world X  (left-right)
            local Y  → world -Z (positive = far/top edge of table = CSS "top")
          So [-width/2, height/2] = top-left corner of the region. */}
      <Html
        position={[-bounds.width / 2, bounds.height / 2, 0.01]}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[5, 5]}
      >
        <div
          onMouseEnter={handleHtmlEnter}
          onMouseLeave={handleHtmlLeave}
          style={{
            pointerEvents: 'auto',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0,0,0,0.72)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            padding: '4px 8px',
            color: 'white',
            fontFamily: 'system-ui',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}>
          <span>{tableLabel}{isPile ? ` (${numStacks})` : ''}</span>
          {iconsVisible && (
            <span style={{ display: 'flex', gap: '4px', marginLeft: '2px' }}>
              <span
                onClick={handleEyeClick}
                style={{ cursor: 'pointer', padding: '2px 5px', borderRadius: '4px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FontAwesomeIcon icon={faEye} />
              </span>
              <span
                onClick={handleBarsClick}
                style={{ cursor: 'pointer', padding: '2px 5px', borderRadius: '4px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FontAwesomeIcon icon={faBars} />
              </span>
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};

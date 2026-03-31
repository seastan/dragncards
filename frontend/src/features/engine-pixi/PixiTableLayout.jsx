/**
 * PixiTableLayout - PixiJS rendering alternative to TableLayout and R3FTableLayout.
 *
 * Uses PixiJS 2D WebGL rendering for better performance than R3F/Three.js
 * while maintaining the same visual polish (flip animations, glow, shadows, perspective).
 *
 * Perspective is achieved via CSS `rotateX` on the canvas container. A PixiEventFix
 * component inside the Stage overrides PixiJS's mapPositionToPoint so that
 * hover/click coordinates remain accurate after the CSS transform.
 */

import React, { useRef, useEffect, useState, useContext } from 'react';
import { Stage, useApp } from '@pixi/react';
import { PixiSceneFromRedux } from './components/PixiScene';
import { useDoActionList } from '../engine/hooks/useDoActionList';
import { usePixiDragActions } from './PixiDragSystem';
import { useBrowseFiltering } from '../engine/hooks/useBrowseFiltering';
import { useLayout } from '../engine/hooks/useLayout';
import { useGameL10n } from '../engine/hooks/useGameL10n';
import { convertToPercentage } from '../engine/functions/common';
import { PluginContext } from '../../contexts/PluginContext';
import { screenToCanvas, getPerspectiveStyles } from './utils/perspectiveUtils';

// Default view angle: 10° from vertical = 80° from horizontal (matches R3F default)
const DEFAULT_TILT = 10;
const PERSPECTIVE_PX = 1200;

const PIXI_APP_OPTIONS = {
  background: 0x0a0a0a,
  antialias: true,
  resolution: Math.min(window.devicePixelRatio, 2),
  autoDensity: true,
};

/**
 * Runs inside the Stage reconciler and overrides PixiJS's mapPositionToPoint so
 * that pointer hit-testing works correctly when the canvas has a CSS rotateX transform.
 */
const PixiEventFix = ({ tiltDeg, perspPx, tw, th }) => {
  const app = useApp();

  useEffect(() => {
    const events = app?.renderer?.events;
    if (!events) return;

    const original = events.mapPositionToPoint.bind(events);

    events.mapPositionToPoint = (point, clientX, clientY) => {
      if (tiltDeg === 0) {
        original(point, clientX, clientY);
        return;
      }
      const canvas = app.renderer.view;
      const rect = canvas.getBoundingClientRect();
      const corrected = screenToCanvas(clientX, clientY, rect, tiltDeg, perspPx, tw, th);
      // PixiJS expects CSS-pixel coordinates from the top-left of the canvas element.
      // With autoDensity, point.x/y should be in CSS pixels (not device pixels).
      point.x = corrected.x;
      point.y = corrected.y;
    };

    return () => {
      events.mapPositionToPoint = original;
    };
  }, [app, tiltDeg, perspPx, tw, th]);

  return null;
};

export const PixiTableLayout = ({ showControls = false }) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [tiltDeg, setTiltDeg] = useState(DEFAULT_TILT);
  const [showRegionBoundaries, setShowRegionBoundaries] = useState(true);

  const layout = useLayout();
  const gameL10n = useGameL10n();

  const { filteredStackIndices } = useBrowseFiltering();
  const doActionList = useDoActionList();
  const { handleDrop } = usePixiDragActions(doActionList);

  // Bridge outer React contexts into the @pixi/react Stage reconciler root
  const pluginCtx = useContext(PluginContext);

  // Track container size for responsive canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });
    observer.observe(containerRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    }
    return () => observer.disconnect();
  }, []);

  const hasSize = size.width > 0 && size.height > 0;
  const { outerStyle, innerStyle } = getPerspectiveStyles(tiltDeg, PERSPECTIVE_PX);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#0a0a0a', position: 'relative' }}
    >
      {/* Perspective wrapper — CSS rotateX gives the angled table view */}
      <div style={outerStyle}>
        <div style={innerStyle}>
          {hasSize && (
            <Stage
              width={size.width}
              height={size.height}
              options={PIXI_APP_OPTIONS}
              style={{ display: 'block', touchAction: 'none' }}
            >
              {/* Fix PixiJS pointer coordinate mapping for the CSS rotateX transform */}
              <PixiEventFix tiltDeg={tiltDeg} perspPx={PERSPECTIVE_PX} tw={size.width} th={size.height} />

              <PixiSceneFromRedux
                tw={size.width}
                th={size.height}
                onCardDrop={handleDrop}
                browseFilteredStackIndices={filteredStackIndices}
                showRegionBoundaries={showRegionBoundaries}
                pluginCtx={pluginCtx}
                tiltDeg={tiltDeg}
                perspPx={PERSPECTIVE_PX}
              />
            </Stage>
          )}
        </div>
      </div>

      {/* HTML overlays sit outside the perspective div to remain unrotated */}
      {layout?.textBoxes && Object.entries(layout.textBoxes).map(([id, tb]) => {
        if (tb.visible === false || !tb.hover) return null;
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
            ...(tb.style || {}),
          }}>
            {gameL10n(tb.label)}
          </div>
        );
      })}

      {/* Info label */}
      <div style={{
        position: 'absolute', bottom: '20px', right: '20px',
        background: 'rgba(0,0,0,0.85)', color: 'white',
        padding: '10px 15px', borderRadius: '8px',
        fontFamily: 'system-ui', fontSize: '12px',
        pointerEvents: 'none', zIndex: 10,
      }}>
        PixiJS Mode (Beta)
      </div>

      {/* Optional controls — mirrors R3F camera controls */}
      {showControls && (
        <div style={{
          position: 'absolute', top: '20px', left: '20px',
          background: 'rgba(0,0,0,0.85)', color: 'white',
          padding: '15px', borderRadius: '10px',
          fontFamily: 'system-ui', width: '220px', fontSize: '12px',
          zIndex: 10,
        }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Angle: {90 - tiltDeg}°
          </label>
          <input
            type="range" min={0} max={30} value={tiltDeg}
            onChange={(e) => setTiltDeg(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', marginBottom: '10px' }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showRegionBoundaries}
              onChange={(e) => setShowRegionBoundaries(e.target.checked)}
            />
            <span>Show Regions</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default PixiTableLayout;

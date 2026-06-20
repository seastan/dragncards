// Perspective must stay in sync with CSS perspective: 300vw
export const PERSP_VW = 300;

// Card lift / flip animation constants
export const BASE_LIFT           = 0.01; // keep a tiny non-zero Z to avoid first-drag layer flash
export const MAX_PILE_VISUAL_DEPTH = 30; // pile visual depth is capped at this many cards

// translateZ depths are a fraction of the rendered card height. The on-screen
// gap a translateZ produces and the card's on-screen height share the same
// perspective factor (P/D), so it cancels: pile-gap / card-height ≈
// (Z / cardHeight)·tanθ. Keying Z to card height therefore holds the apparent
// pile/layer depth constant relative to the cards under any resize — when the
// cards shrink, the gap shrinks with them. (vw / dvh bases fail here: they
// don't track card height, so the gap stays put as the cards shrink.)
export const PILE_STACK_Z_FRAC = 0.0175; // fraction of card height per card position in a pile
export const LAYER_Z_FRAC      = 0.7;   // fraction of card height per layerIndex step

export const dvhPx        = () => window.innerHeight / 100;
export const pileStackZPx = (cardH) => PILE_STACK_Z_FRAC * cardH;
export const layerZPx     = (cardH) => LAYER_Z_FRAC * cardH;
// Height scale factor applied to cards based on table tilt angle.
// At 0°: ×0.9 (−10%), at 45°: ×1.1 (+10%), linear between.
// Adjust the 0.9 / 0.2 constants to tune the effect.
export const cardHeightScaleForTilt = (deg) =>
  0.9 + (Math.min(Math.max(deg, 0), 45) / 45) * 0.2;
export const ANIMATION_SPEED_MULTIPLIER = 1;
export const ATTACH_WIGGLE_DVH = 8; // horizontal wiggle on card attachment, in dvh
export const DRAG_EDGE_SCROLL_SPEED = 0.048; // auto-scroll speed when dragging near region edge, as fraction of card width per frame (~60fps)
export const MAX_ZOOM  = 0.3;
export const GROW      = 100;
export const FLIP      = 500;
export const SHRINK    = 100;
export const OVERLAP   = 50;
export const T2        = GROW - OVERLAP;
export const T3        = T2 + FLIP - OVERLAP;
export const TOTAL     = T3 + SHRINK;

export function scaleDuration(ms) {
  return Math.max(1, ms * ANIMATION_SPEED_MULTIPLIER);
}

// Builds a card element's CSS transform in "own-axis" order. The in-plane
// rotation (rotateZ — layout rotation + exhaust/game rotation) establishes the
// card's local frame FIRST, then the flip (rotateY) is applied within it, so a
// card always flips about its OWN vertical axis no matter how it's turned —
// rather than always swinging left-right in screen space. A consequence is that
// a face-down rotated card now rests at +rot instead of the old mirror's -rot.
//
// swingPct is the lateral arc offset during a flip; it sits between rotateZ and
// rotateY so it tracks the card's width axis (and isn't foreshortened by the
// in-progress flip). Every cardEl.style.transform should go through this so the
// resting orientation and the flip animation share one convention and never
// snap against each other.
//   angleDeg : flip angle  (cardEl._angle)
//   rotDeg   : in-plane rotation (layoutRotation + gameRotation)
//   scale    : uniform scale (default 1)
//   swingPct : lateral flip swing as % of card width (default 0)
export function cardTransform(angleDeg, rotDeg, scale = 1, swingPct = 0, heightScale = 1) {
  const swing = swingPct ? ` translateX(${swingPct}%)` : '';
  const hs    = heightScale !== 1 ? ` scaleY(${heightScale})` : '';
  return `perspective(300vw) rotateZ(${rotDeg}deg)${swing} rotateY(${angleDeg}deg) scale(${scale})${hs}`;
}

// Default region layout — used for demo/sandbox mode.
// dragncards integration will pass regions from gameDef.layouts instead.
export const DEFAULT_REGIONS = {
  hand:      { left:  5, top: 70, width: 60, height: 25, type: 'fan'  },
  draw:      { left:  3, top: 10, width: 12, height: 22, type: 'pile' },
  table:     { left: 22, top: 10, width: 55, height: 50, type: 'free' },
  score:     { left: 82, top: 10, width: 15, height: 50, type: 'row',  layerIndex: 1, backgroundColor: 'rgb(30, 80, 180)' },
  sideboard: { left: 82, top: 60, width: 15, height: 40, type: 'fan',  direction: 'vertical', layerIndex: 1, backgroundColor: 'rgb(30, 80, 180)' },
};

// Per-player colours for targeting numbers and arrows. Keyed by the playerN
// string used in card.targeting / card.arrows (mirrors playerColorMap in the
// 2D engine's functions/common.js).
export const PLAYER_COLORS = {
  player1: 'rgb(255,90,139)',  // Red
  player2: 'rgb(121,180,255)', // Blue
  player3: 'rgb(101,241,18)',  // Green
  player4: 'rgb(255,223,76)',  // Yellow
  player5: 'rgb(225,138,244)', // Purple
  player6: 'rgb(255,187,191)', // Pink
  player7: 'rgb(0,201,187)',   // Teal
  player8: 'rgb(255,142,12)',  // Orange
};

// --- Token vertical-extrusion prototype (dnc3d only) ----------------------
// Fakes physical height on round PNG tokens with a single alpha-aware SVG
// filter pass (the filter primitives trace the PNG's transparency, so the
// fake "side wall" hugs the round silhouette automatically — no assumptions
// about token shape). Threaded CardTokens -> Tokens -> Token; the 2D engine
// never receives the prop, so its tokens are unaffected.
//
// Flip TOKEN_EXTRUDE to false to disable. The wall direction is constant
// because the live table tilt is a fixed 25° (no camera orbit), so a single
// baked-in direction stays correct every frame. +DY points toward the bottom
// of the screen, where the side wall of a raised object projects under a
// forward tilt.
export const TOKEN_EXTRUDE           = true;
export const TOKEN_EXTRUDE_FILTER_ID = 'dnc3d-token-extrude';
export const TOKEN_EXTRUDE_STEPS     = 4;            // # of offset copies forming the side wall
export const TOKEN_EXTRUDE_DX        = 0;            // wall direction x, px per step
export const TOKEN_EXTRUDE_DY        = 1;            // wall direction y, px per step (wall height ≈ STEPS*DY)
export const TOKEN_EXTRUDE_COLOR     = '#000000';    // side-wall fill colour
export const TOKEN_EXTRUDE_OPACITY   = 0.95;         // side-wall opacity (1 = fully opaque wall)
export const TOKEN_EXTRUDE_GROUND_BLUR    = 1.2;     // soft contact-shadow blur (px); 0 disables
export const TOKEN_EXTRUDE_GROUND_OPACITY = 0.35;    // soft contact-shadow opacity

export const COLORS = [
  '#c0392b', '#e67e22', '#d4ac0d', '#27ae60',
  '#16a085', '#2980b9', '#8e44ad', '#e91e63',
  '#00838f', '#6d4c41', '#f39c12', '#1abc9c',
  '#9b59b6', '#34495e',
];

// Perspective must stay in sync with CSS perspective: 300vw
export const PERSP_VW = 300;

// Card lift / flip animation constants
export const BASE_LIFT           = 0.01; // keep a tiny non-zero Z to avoid first-drag layer flash
export const PILE_STACK_Z        = 1.5;  // px of translateZ per card position in a pile
export const MAX_PILE_VISUAL_DEPTH = 30; // pile visual depth is capped at this many cards
export const LAYER_Z       = 60;  // px of translateZ per layerIndex step
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

// Default region layout — used for demo/sandbox mode.
// dragncards integration will pass regions from gameDef.layouts instead.
export const DEFAULT_REGIONS = {
  hand:      { left:  5, top: 70, width: 60, height: 25, type: 'fan'  },
  draw:      { left:  3, top: 10, width: 12, height: 22, type: 'pile' },
  table:     { left: 22, top: 10, width: 55, height: 50, type: 'free' },
  score:     { left: 82, top: 10, width: 15, height: 50, type: 'row',  layerIndex: 1, backgroundColor: 'rgb(30, 80, 180)' },
  sideboard: { left: 82, top: 60, width: 15, height: 40, type: 'fan',  direction: 'vertical', layerIndex: 1, backgroundColor: 'rgb(30, 80, 180)' },
};

export const COLORS = [
  '#c0392b', '#e67e22', '#d4ac0d', '#27ae60',
  '#16a085', '#2980b9', '#8e44ad', '#e91e63',
  '#00838f', '#6d4c41', '#f39c12', '#1abc9c',
  '#9b59b6', '#34495e',
];

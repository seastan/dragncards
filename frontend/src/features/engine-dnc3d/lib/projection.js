import { PERSP_VW } from './config';

export function createProjection() {
  // Updated by applyTilt() so card dimensions always scale proportionally
  // with the tilt element's coordinate system rather than the raw viewport.
  let _tiltW = window.innerWidth;
  let _tiltH = window.innerHeight;

  // Stage container dimensions and viewport-relative center.
  // Defaults to full viewport on init; applyTilt updates these from the
  // actual container element so the engine works in a sub-region of the page.
  let _stageW  = window.innerWidth;
  let _stageH  = window.innerHeight;
  let _stageCX = window.innerWidth  / 2;
  let _stageCY = window.innerHeight / 2;
  // Viewport offset of the stage container's top-left corner. The tilt element's
  // rotateX pivots about its top edge (transform-origin 50% 0%), which sits at
  // the stage's top — so table y=0 maps to viewport y=_stageTop, NOT y=0. The
  // projection must account for this whenever the stage is offset from the
  // viewport top (e.g. mounted below the TopBar).
  let _stageLeft = 0;
  let _stageTop  = 0;

  // Perspective distance — CSS uses 300vw, so this is always viewport-width-based.
  function stagePx() { return PERSP_VW * window.innerWidth / 100; }

  let _cardW = window.innerWidth  * 0.05;
  let _cardH = window.innerHeight * 0.07;

  function setTiltDims(w, h) { _tiltW = w; _tiltH = h; }
  function setCardDims(w, h) { _cardW = w; _cardH = h; }

  function setStageDims(w, h, cx, cy) {
    _stageW = w; _stageH = h;
    _stageCX = cx; _stageCY = cy;
    _stageLeft = cx - w / 2;
    _stageTop  = cy - h / 2;
  }

  function cardWidthPx()  { return _cardW; }
  function cardHeightPx() { return _cardH; }

  // Inverse projection: screen (viewport) coordinates → table-plane coordinates.
  // The plane pivots about its top edge (at viewport y=_stageTop) while the
  // perspective origin is the stage center (_stageCY); table y is measured from
  // the pivot, hence (sy − _stageTop) in the numerator.
  // Derivation: sy = _stageCY + (ty·cosA − vh/2)·P/(P − ty·sinA)
  //          →  ty = P·(sy − _stageTop) / (P·cosA + (sy − _stageCY)·sinA)
  function screenToTable(sx, sy, tiltEl, deg) {
    const rad  = deg * Math.PI / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const w    = parseFloat(tiltEl.style.width);
    const P    = stagePx();
    const ty = P * (sy - _stageTop) / (P * cosA + (sy - _stageCY) * sinA);
    const tx = w / 2 + (sx - _stageCX) * (P - ty * sinA) / P;
    return { x: tx, y: ty };
  }

  // Inverse projection accounting for a card's translateZ offset.
  // Derivation: ty = (P·(sy−_stageTop) + Z·(P·sinA − (sy−_stageCY)·cosA)) / (P·cosA + (sy−_stageCY)·sinA)
  function screenToTableAtZ(sx, sy, Z, tiltEl, deg) {
    const rad  = deg * Math.PI / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const w    = parseFloat(tiltEl.style.width);
    const P    = stagePx();
    const dsy  = sy - _stageCY;
    const D    = P * cosA + dsy * sinA;
    const ty   = (P * (sy - _stageTop) + Z * (P * sinA - dsy * cosA)) / D;
    const tx   = w / 2 + (sx - _stageCX) * (P - ty * sinA - Z * cosA) / P;
    return { x: tx, y: ty };
  }

  // Forward projection: table-plane coordinates at a given Z → screen coordinates.
  function tableToScreen(tx, ty, Z, tiltEl, deg) {
    const rad  = deg * Math.PI / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const w    = parseFloat(tiltEl.style.width);
    const P    = stagePx();
    const D    = P - ty * sinA - Z * cosA;
    const sx   = P * (tx - w / 2) / D + _stageCX;
    const sy   = P * (ty * cosA - Z * sinA - (_stageCY - _stageTop)) / D + _stageCY;
    return { x: sx, y: sy };
  }

  return { stagePx, setTiltDims, setCardDims, setStageDims, cardWidthPx, cardHeightPx, screenToTable, screenToTableAtZ, tableToScreen };
}

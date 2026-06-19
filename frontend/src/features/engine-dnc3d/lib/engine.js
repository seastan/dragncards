import { COLORS, BASE_LIFT, pileStackZPx, MAX_PILE_VISUAL_DEPTH, layerZPx, DEFAULT_REGIONS, scaleDuration, ATTACH_WIGGLE_DVH, DRAG_EDGE_SCROLL_SPEED, GROW, FLIP, OVERLAP, cardTransform } from './config';
import { createState } from './state';
import { createProjection } from './projection';
import { createLayout } from './layout';
import { createOverlay } from './overlay';
import { easeOut, easeIn, animateFlip } from './animation';
import { playFlipSound, playPickupSound, playDropSound } from './sound';

// Applies a game-definition region `style` CSS object (mirrors how TableRegion
// spreads `region.style`) onto a region's outline element. Accepts both
// camelCase (`backgroundColor`) and kebab-case (`background-color`) keys, since
// the game-def schema documents the kebab form.
function applyRegionStyle(el, style) {
  if (!style || typeof style !== 'object') return;
  for (const [key, value] of Object.entries(style)) {
    if (value == null) continue;
    if (key.includes('-')) el.style.setProperty(key, value);
    else el.style[key] = value;
  }
}

// Converts any dragncards coordinate format (number, "50%", "1/20") to a 0-1 fraction.
// Format-only — no coordinate-system conversion.
function parseFrac(val, fallback = 0) {
  if (val == null) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    if (val.endsWith('%')) { const n = parseFloat(val); return isNaN(n) ? fallback : n / 100; }
    const m = val.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
}

// Creates a self-contained dnc3d engine instance.
// options.regions         — region definitions (default: DEFAULT_REGIONS for demo/sandbox mode)
// options.onCardMove      — callback(cardId, fromRegionId, toRegionId, fracX, fracY, insertIdx)
// options.getCardName     — callback(cardId) → display name of a card (for the attach label)
// options.onAttach        — callback(cardId, targetCardId, side)
// options.onFlip          — callback(cardId)
// options.onTriggerAbility — callback(cardId) fired when a card's bolt affordance is clicked
// options.onCardClick     — callback(cardId, clientX, clientY) fired on click (no drag)
// options.onCardHover     — callback(cardId) fired on pointerenter
// options.onCardHoverEnd  — callback(cardId) fired on pointerleave
// options.onDragStart     — callback() fired when a drag gesture begins
// options.cardSize        — layout cardSize value (e.g. 16 for LotR); drives card pixel size
// options.cardDefaultH    — card height in cardSize units (e.g. 1.0); default 1.0
// options.cardDefaultW    — card width  in cardSize units (e.g. 0.72); default 0.72
// options.zoomFactor      — user zoom setting as a multiplier; default 1.0
export function createDnc3DEngine(options = {}) {
  const REGIONS       = options.regions    || DEFAULT_REGIONS;

  // Converts a dcStack.left/top value to a 0-1 tilt-relative fraction.
  // Number values are already tilt-relative (stored by 3D drag in onCardMove).
  // String values ("50%", "1/20") are region-relative (2D engine / game def) —
  // convert using the region's own tilt-relative bounds from REGIONS (0-100 scale).
  function dcPosFrac(val, regionId, isTop, fallback = 0) {
    if (val == null) return fallback;
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    const pct = parseFrac(val, fallback);
    const region = REGIONS[regionId];
    if (!region) return pct;
    return isTop
      ? (region.top  + pct * region.height) / 100
      : (region.left + pct * region.width)  / 100;
  }

  const onCardMove    = options.onCardMove || null;
  const onAttach      = options.onAttach   || null;
  const onFlip        = options.onFlip        || null;
  const onTriggerAbility = options.onTriggerAbility || null;
  const onCardClick    = options.onCardClick    || null;
  const onCardHover         = options.onCardHover         || null;
  const onCardHoverEnd      = options.onCardHoverEnd      || null;
  const onCardHoverTopBottom = options.onCardHoverTopBottom || null;
  const onDragStart    = options.onDragStart    || null;
  const onGroupBrowse  = options.onGroupBrowse  || null;
  const onGroupMenu    = options.onGroupMenu    || null;
  const getCardName    = options.getCardName    || null;
  // Card sizing — mirrors the 2D renderer's cardSize * zoomFactor * 1.7dvh formula.
  const _cardSize           = options.cardSize           || null;
  const _cardDefaultH       = options.cardDefaultH       || 1.0;
  const _cardDefaultW       = options.cardDefaultW       || 0.72;
  const _zoomFactor         = options.zoomFactor         || 1.0;
  const _tableBackgroundUrl = options.tableBackgroundUrl || null;
  const _playerN            = options.playerN            || null;

  // ── Sub-system instances ───────────────────────────────────────────────────
  const state = createState(REGIONS);
  const { cards, stacks, regionState, createStack, destroyStack, splitStack, attachStack, moveStackToRegion, nextTopZ } = state;

  const projection = createProjection();
  const { cardWidthPx, cardHeightPx, stagePx, screenToTableAtZ, tableToScreen, setTiltDims, setCardDims, setStageDims } = projection;

  const layout = createLayout(state, projection, REGIONS);
  const {
    initLayout, regionPx, layoutFan, layoutRow, layoutPile,
    placeCardAt, layoutRegion, setAfterLayoutHook, setScrollOuter, setIndicatorEl, applyTokenHostRotation,
    findRegionAtPoint, insertStackAtIndex, moveCardToTilt, moveCardFromTilt, moveStackToTilt,
    animateCardTo, animateCardArc, tiltSpacePosOf, stackCardOffsets, stackBaseCardIds, stackPositionsAtAnchor,
    showInsertionIndicator, hideInsertionIndicator, clearScrollOuters,
    rowTotalWidth,
  } = layout;

  // ── Engine-level state ─────────────────────────────────────────────────────
  let _tiltEl             = null;
  let _currentDeg         = 15;
  let _attachTargetIconEl = null;
  let _tableSurfaceEl     = null;
  let _isDragging         = false; // true while any card drag is in progress
  const _shufflingRegions = new Set(); // regionIds currently playing a shuffle riffle
  // Last known pointer position (screen px), kept current by the tilt pointermove
  // listener. reconcileHover() re-reads it after each state update so the hover
  // glow tracks whatever card is *actually* under a stationary cursor once cards
  // move (e.g. a hotkey-discard slides the card out from under the pointer with
  // no pointerout firing).
  let _lastPointerX       = -1;
  let _lastPointerY       = -1;
  let _hoverSettleRaf     = null; // rAF id for the post-reconcile hover settle loop
  // True while a full-screen overlay (e.g. the hotkey panel shown on Tab) covers
  // the table. The overlay sits above the cards, so pointer events stop reaching
  // them with no pointerout firing — which would strand the hover glow. While
  // suppressed we drop the glow and stop re-adding it; on release we re-derive
  // hover from wherever the cursor actually is (see setHoverSuppressed).
  let _hoverSuppressed    = false;

  // Topmost `.dnc3d-card` element under a screen point, treating tokens and the
  // see-through liftEl/tokenHost wrappers as transparent. Shared by the per-card
  // pointerout guard and the post-reconcile hover sweep.
  function topCardElAtPoint(x, y) {
    for (const el of document.elementsFromPoint(x, y)) {
      const ce = el.closest('.dnc3d-card');
      if (ce) return ce;
    }
    return null;
  }

  // Targeting-icon + card-arrow overlay (flat screen-space layer above the tilt).
  const _overlay = createOverlay();
  let   _insertIndicatorEl = null; // table-level line; overlay mirrors it on top

  const scrollOuterEls   = {};
  const regionOutlineEls = {};
  const regionFillEls    = {}; // per-region background fill; sits BELOW the cards
  const regionIconEls    = {};
  const regionLabelEls   = {};
  const regionCountEls   = {}; // pile regions only: card-count badge shown on hover
  const sentinelEls      = {};
  const arrowEls         = {}; // { start, end } per scrollable region
  const stackZoneEls     = new Map();

  // Resolve which region a screen point is over, honoring 3D layer stacking.
  // findRegionAtPoint projects the point onto the Z=0 table plane — correct for
  // the base layer, but it reaches *through* an elevated region (the browse
  // panel, or any region with layerIndex >= 1) to whatever sits behind it,
  // because an elevated panel's on-screen footprint doesn't match its Z=0 rect.
  // So start from the Z=0 result, then prefer any higher-layer region whose live
  // on-screen outline actually covers the point, and re-project the point onto
  // that region's elevated plane so callers get coordinates in its own space.
  // Returns { region, cx, cy } where cx/cy are tilt-space px on region's plane.
  function hoverRegionAt(clientX, clientY) {
    if (!_tiltEl) return { region: null, cx: 0, cy: 0 };
    const tw = parseFloat(_tiltEl.style.width);
    const th = parseFloat(_tiltEl.style.height);
    const tp0 = screenToTableAtZ(clientX, clientY, 0, _tiltEl, _currentDeg);
    let region = findRegionAtPoint(tp0.x / tw * 100, tp0.y / th * 100);
    let layer  = region ? (REGIONS[region].layerIndex || 0) : 0;
    let cx = tp0.x, cy = tp0.y;
    for (const [rid, r] of Object.entries(REGIONS)) {
      const li = r.layerIndex || 0;
      if (li <= layer) continue;
      const el = regionOutlineEls[rid];
      if (!el) continue;
      const pr = el.getBoundingClientRect();
      if (clientX >= pr.left && clientX <= pr.right && clientY >= pr.top && clientY <= pr.bottom) {
        region = rid;
        layer  = li;
        const tp = screenToTableAtZ(clientX, clientY, layerZPx(cardHeightPx()) * li, _tiltEl, _currentDeg);
        cx = tp.x; cy = tp.y;
      }
    }
    return { region, cx, cy };
  }

  // ── Browse state ───────────────────────────────────────────────────────────
  let _browseGroupId         = null;
  let _browseAllEngineStacks = []; // [{ engineStackId, dcStackIndex }]

  function _makeBrowseRegion() {
    const tiltH    = parseFloat(_tiltEl?.style.height) || window.innerHeight;
    const tiltW    = parseFloat(_tiltEl?.style.width)  || window.innerWidth;
    const cardH    = cardHeightPx();
    const heightPct = Math.min(88, (cardH / tiltH) * 100 * 1.15 + 3);
    const topPct    = 100 - heightPct - 25;

    // The scroll outer sits at translateZ(layerZPx(cardHeightPx()) * layerIndex) above the
    // tilt plane, plus the tilt plane itself is at z = y * sinA at the center Y of
    // the region. The perspective scale at this combined Z makes the region appear
    // wider on screen than its CSS width. Compute the max CSS width that keeps the
    // apparent screen width within 96% of the viewport.
    const layerIndex = 2;
    const layerZ   = layerZPx(cardHeightPx()) * layerIndex;
    const P        = stagePx();
    const rad      = _currentDeg * Math.PI / 180;
    const sinA     = Math.sin(rad);
    const centerY  = ((topPct + heightPct / 2) / 100) * tiltH;
    const totalZ   = centerY * sinA + layerZ;
    const scale    = P / Math.max(1, P - totalZ);
    const stageRect = _tiltEl?.parentElement?.getBoundingClientRect();
    const stageW   = stageRect ? stageRect.width : window.innerWidth;

    const maxApparent = stageW * 0.96;
    const maxCSSW     = maxApparent / scale;
    const width       = Math.min(96, (maxCSSW / tiltW) * 100);
    const left        = (100 - width) / 2;

    return { left, top: topPct, width, height: heightPct, type: 'fan', direction: 'horizontal', layerIndex };
  }

  // ── Per-card dimension helpers ─────────────────────────────────────────────
  // Sets --card-w / --card-h on a card's cardEl so each card renders at its
  // own face aspect ratio rather than the global default. No-op in demo mode
  // (_cardSize == null) since demo cards have no face data.
  function applyCardDims(card) {
    if (_cardSize == null) return;
    const fw  = card.faceW || _cardDefaultW;
    const fh  = card.faceH || _cardDefaultH;
    const dvh = window.innerHeight / 100;
    const w = fw * _cardSize * _zoomFactor * dvh;
    const h = fh * _cardSize * _zoomFactor * dvh;
    card.cardEl.style.setProperty('--card-w', w + 'px');
    card.cardEl.style.setProperty('--card-h', h + 'px');
    card.renderedW = w;
    card.renderedH = h;
  }

  // ── Tilt geometry ──────────────────────────────────────────────────────────
  function applyTilt(tiltEl, deg) {
    const rad     = deg * Math.PI / 180;
    const stageEl = tiltEl.parentElement;
    const rect    = stageEl ? stageEl.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
    const vh      = rect.height;
    const vw      = rect.width;
    const cosA    = Math.cos(rad), sinA = Math.sin(rad);
    const P       = stagePx();

    setStageDims(vw, vh, rect.left + vw / 2, rect.top + vh / 2);

    // Card pixel size: use the same formula as the 2D renderer when cardSize is
    // provided (face.height * cardSize * zoomFactor * 1.7dvh).  Fall back to the
    // legacy tilt-fraction formula for sandbox/demo mode.
    if (_cardSize != null) {
      // 2D renderer sizes cards as face.height * cardSize * zoomFactor dvh.
      // dvh = 1% of viewport height (same as CSS dvh unit).
      const dvh = window.innerHeight / 100;
      setCardDims(
        _cardDefaultW * _cardSize * _zoomFactor * dvh,
        _cardDefaultH * _cardSize * _zoomFactor * dvh,
      );
    }

    const h             = vh * P / (P * cosA + vh / 2 * sinA);
    const bottomZ       = h * sinA;
    const scaleAtBottom = P / (P - bottomZ);
    const w             = vw / scaleAtBottom;

    setTiltDims(w, h);
    if (_cardSize == null) {
      setCardDims(w * 0.05, h * 0.07 * vw / vh);
    }

    tiltEl.style.height    = h + 'px';
    tiltEl.style.width     = w + 'px';
    tiltEl.style.left      = (vw - w) / 2 + 'px';
    tiltEl.style.transform = `rotateX(${deg}deg)`;
    if (_tableSurfaceEl) {
      _tableSurfaceEl.style.height    = h + 'px';
      _tableSurfaceEl.style.width     = w + 'px';
      _tableSurfaceEl.style.left      = (vw - w) / 2 + 'px';
      _tableSurfaceEl.style.top       = '0px';
      _tableSurfaceEl.style.transform = `rotateX(${deg}deg)`;
    }
    tiltEl.style.setProperty('--card-w', cardWidthPx() + 'px');
    tiltEl.style.setProperty('--card-h', cardHeightPx() + 'px');
    cards.forEach(card => applyCardDims(card));

    if (cards.length) {
      // Reposition free-region cards proportionally
      cards.forEach(card => {
        if (card && card.regionId && REGIONS[card.regionId] && REGIONS[card.regionId].type === 'free') {
          card.liftEl.style.left = card.fracX * w + 'px';
          card.liftEl.style.top  = card.fracY * h + 'px';
        }
      });
      // Instant re-layout for structured regions (preserve current z-index)
      Object.entries(REGIONS).forEach(([id, r]) => {
        if (r.type === 'free') return;
        const positions = r.type === 'row' ? layoutRow(id) : r.type === 'fan' ? layoutFan(id) : layoutPile(id);
        positions.forEach(pos => {
          const c    = cards[pos.cardId];
          if (!c) return;
          const zIdx = parseInt(c.liftEl.style.zIndex) || pos.zIndex;
          placeCardAt(c, pos.left, pos.top, pos.rot, zIdx, pos.stackZ || 0);
        });
      });
    }
  }

  function applyTableOpacity(tiltEl, opacity) {
    tiltEl.style.setProperty('--table-opacity', opacity.toString());
  }

  function setCurrentDeg(deg) { _currentDeg = deg; }

  // ── Scroll helpers ─────────────────────────────────────────────────────────
  function scrollTotalExtent(regionId) {
    const r    = REGIONS[regionId];
    const n    = regionState[regionId].stackIds.length;
    const cw   = cardWidthPx(), ch = cardHeightPx();
    const rp   = regionPx(regionId);
    const vert = r.direction === 'vertical';
    if (r.type === 'row') {
      if (vert) return n > 0 ? (n - 1) * ch * 1.1 + ch : rp.h;
      return rowTotalWidth(regionId);
    }
    if (r.type === 'fan') {
      const dim        = vert ? ch : cw;
      const size       = vert ? rp.h : rp.w;
      const minSpacing = dim * 0.20;
      if (n > 1 && (size - dim) / (n - 1) < minSpacing) return (n - 1) * minSpacing + dim;
      return size;
    }
    return vert ? rp.h : rp.w;
  }

  function updateSentinel(regionId) {
    const s = sentinelEls[regionId];
    if (!s) return;
    const vert   = REGIONS[regionId]?.direction === 'vertical';
    const extent = scrollTotalExtent(regionId);
    if (vert) {
      s.spacer.style.height = extent + 'px';
      if (Math.abs(s.el.scrollTop - (regionState[regionId].scrollOffset || 0)) > 0.5) {
        regionState[regionId].scrollOffset = s.el.scrollTop;
      }
    } else {
      s.spacer.style.width = extent + 'px';
      if (Math.abs(s.el.scrollLeft - (regionState[regionId].scrollOffset || 0)) > 0.5) {
        regionState[regionId].scrollOffset = s.el.scrollLeft;
      }
    }
  }

  function updateScrollArrows(regionId) {
    const arrows = arrowEls[regionId];
    if (!arrows) return;
    const r    = REGIONS[regionId];
    const rp   = regionPx(regionId);
    const vert = r?.direction === 'vertical';
    const total    = scrollTotalExtent(regionId);
    const maxScroll = Math.max(0, total - (vert ? rp.h : rp.w));
    const off      = regionState[regionId].scrollOffset || 0;
    const hasPrev  = off > 0.5;
    const hasNext  = off < maxScroll - 0.5;
    arrows.start.classList.toggle('dnc3d-scroll-visible', hasPrev);
    arrows.end.classList.toggle('dnc3d-scroll-visible', hasNext);
  }

  // Scrolls a scrollable (row/fan) region so the given stack's slot is centered
  // in the viewport — or scrolled as far as possible toward center when the slot
  // is near an end. Updates regionState.scrollOffset and syncs the sentinel's
  // scroll position so a subsequent layout places the stack inside the visible
  // area (instead of out in the clipped overflow). No-op for non-scrollable
  // regions or when the slot is already on-screen. Returns true if it scrolled.
  function scrollStackToCenter(regionId, stackId) {
    const r = REGIONS[regionId];
    if (!r || (r.type !== 'row' && r.type !== 'fan')) return false;
    const rp        = regionPx(regionId);
    const vert      = r.direction === 'vertical';
    const viewport  = vert ? rp.h : rp.w;
    const total     = scrollTotalExtent(regionId);
    const maxScroll = Math.max(0, total - viewport);
    if (maxScroll <= 0) return false;

    const parentCardId = stacks[stackId]?.cardIds?.[0];
    if (parentCardId === undefined) return false;

    // Compute the slot's content-space position by laying out at scrollOffset 0.
    const rs       = regionState[regionId];
    const savedOff = rs.scrollOffset || 0;
    rs.scrollOffset = 0;
    const layoutFn = r.type === 'row' ? layoutRow : layoutFan;
    const positions = layoutFn(regionId);
    rs.scrollOffset = savedOff;

    const pos = positions.find(p => p.cardId === parentCardId);
    if (!pos) return false;

    const cardDim    = vert ? cardHeightPx() : cardWidthPx();
    const slotCenter = (vert ? pos.top - rp.y : pos.left - rp.x) + cardDim / 2;
    const off        = Math.min(Math.max(slotCenter - viewport / 2, 0), maxScroll);
    if (Math.abs(savedOff - off) < 0.5) return false;

    rs.scrollOffset = off;
    const s = sentinelEls[regionId];
    if (s) {
      s._syncing = true;
      if (vert) { s.spacer.style.height = total + 'px'; s.el.scrollTop  = off; }
      else      { s.spacer.style.width  = total + 'px'; s.el.scrollLeft = off; }
    }
    return true;
  }

  function updateScrollOuters() {
    Object.entries(scrollOuterEls).forEach(([id, el]) => {
      const rp = regionPx(id);
      el.style.left   = rp.x + 'px';
      el.style.top    = rp.y + 'px';
      el.style.width  = rp.w + 'px';
      el.style.height = rp.h + 'px';
    });
  }

  function onTiltUpdated() {
    updateScrollOuters();
    Object.keys(sentinelEls).forEach(id => { updateSentinel(id); updateScrollArrows(id); });
  }

  // ── Browse region DOM setup / teardown ─────────────────────────────────────
  function _setupBrowseRegionDom() {
    if (!_tiltEl) return;
    const r = REGIONS['_browse'];

    const scrollOuter = document.createElement('div');
    scrollOuter.className = 'dnc3d-region-scroll-outer';
    scrollOuter.style.transform = `translateZ(${layerZPx(cardHeightPx()) * r.layerIndex}px)`;
    _tiltEl.appendChild(scrollOuter);
    scrollOuterEls['_browse'] = scrollOuter;
    setScrollOuter('_browse', scrollOuter);
    updateScrollOuters();

    const outline = document.createElement('div');
    outline.className = 'dnc3d-region-outline dnc3d-region-elevated';
    outline.style.transform  = `translateZ(${layerZPx(cardHeightPx()) * r.layerIndex - 1}px)`;
    outline.style.left       = r.left   + '%';
    outline.style.top        = r.top    + '%';
    outline.style.width      = r.width  + '%';
    outline.style.height     = r.height + '%';
    outline.style.background = '#1f2937';
    _tiltEl.appendChild(outline);
    regionOutlineEls['_browse'] = outline;

    const sentinel = document.createElement('div');
    sentinel.className = 'dnc3d-region-scroll-sentinel';
    const spacer = document.createElement('div');
    spacer.className = 'dnc3d-region-scroll-spacer';
    sentinel.appendChild(spacer);
    outline.appendChild(sentinel);
    const s = { el: sentinel, spacer, _syncing: false };
    sentinelEls['_browse'] = s;
    sentinel.addEventListener('scroll', () => {
      if (s._syncing) { s._syncing = false; return; }
      regionState['_browse'].scrollOffset = sentinel.scrollLeft;
      layoutRegion('_browse');
    });
  }

  function _teardownBrowseRegionDom() {
    if (scrollOuterEls['_browse']) {
      if (_tiltEl) _tiltEl.removeChild(scrollOuterEls['_browse']);
      delete scrollOuterEls['_browse'];
    }
    if (regionOutlineEls['_browse']) {
      if (_tiltEl) _tiltEl.removeChild(regionOutlineEls['_browse']);
      delete regionOutlineEls['_browse'];
    }
    delete sentinelEls['_browse'];
    clearScrollOuters();
    Object.entries(scrollOuterEls).forEach(([id, el]) => setScrollOuter(id, el));
  }

  // ── Browse API ─────────────────────────────────────────────────────────────
  // Snaps a card to the side the observing player should see (the front when
  // peeking at a face-down card, otherwise its currentSide) with no animation.
  // Used when opening browse so the reveal is already in place by the time
  // reconcile runs — otherwise reconcile fires a flip animation that collides
  // with the browse region rising in Z, producing a stutter/jump.
  function _snapCardToExpectedSide(card, dcCard) {
    if (!card || !card.cardEl || !dcCard || card.cardEl._animating) return;
    const peeking      = !!(_playerN && dcCard.peeking && dcCard.peeking[_playerN]);
    const expectedSide = peeking ? 'A' : (dcCard.currentSide || 'A');
    const visualSide   = ((((card.cardEl._angle % 360) + 360) % 360) === 180) ? 'B' : 'A';
    if (visualSide === expectedSide) return;
    card.cardEl._angle += 180;
    card.cardEl.style.transition = '';
    card.cardEl.style.transform =
      cardTransform(card.cardEl._angle, (card.cardEl._layoutRotation || 0) + (card.cardEl._gameRotation || 0));
  }

  // Opens the browse fan for a group, moving its cards to the browse region.
  // game/idMap come from the current Dnc3DTable reconcile refs.
  function openBrowse(browseGroupId, game, idMap) {
    if (_browseGroupId) closeBrowse(game, idMap);
    _browseGroupId = browseGroupId;

    const group = game?.groupById?.[browseGroupId];
    if (!group) { _browseGroupId = null; return; }

    REGIONS['_browse'] = _makeBrowseRegion();
    regionState['_browse'] = { stackIds: [], scrollOffset: 0 };
    _setupBrowseRegionDom();

    // Hide the home region's table DOM so it doesn't appear as a drop target.
    for (const el of [scrollOuterEls[browseGroupId], regionOutlineEls[browseGroupId],
                      regionFillEls[browseGroupId],
                      regionIconEls[browseGroupId], regionLabelEls[browseGroupId]]) {
      if (el) el.style.display = 'none';
    }

    _browseAllEngineStacks = [];
    (group.stackIds || []).forEach((dcStackId, dcStackIndex) => {
      const dcStack = game.stackById?.[dcStackId];
      if (!dcStack?.cardIds?.length) return;
      const firstEngineIdx = idMap.get(dcStack.cardIds[0]);
      if (firstEngineIdx === undefined) return;
      const card = cards[firstEngineIdx];
      if (!card) return;
      _browseAllEngineStacks.push({ engineStackId: card.stackId, dcStackIndex });
      moveStackToRegion(card.stackId, '_browse');
      // Snap every card in the stack to its revealed side before reconcile runs,
      // so opening browse doesn't animate a flip while the region rises into place.
      dcStack.cardIds.forEach(cid => {
        const idx = idMap.get(cid);
        if (idx !== undefined) _snapCardToExpectedSide(cards[idx], game.cardById?.[cid]);
      });
    });

    // instant: opening browse is a "peek" ability, not a physical move — the
    // cards should appear in the fan rather than sliding in from their home pile.
    updateBrowseFilter(_browseAllEngineStacks.map(e => e.dcStackIndex), true);
  }

  // Closes browse, restoring all cards to their home region. game/idMap (from the
  // reconcile refs) let us snap orientation back instantly; without them the cards
  // still return to their slots, just without the side fix-up.
  function closeBrowse(game, idMap) {
    if (!_browseGroupId) return;
    const homeGroupId = _browseGroupId;

    _browseAllEngineStacks.forEach(({ engineStackId }) => {
      const stack = stacks[engineStackId];
      if (!stack) return;
      // Skip stacks that were dropped into another region while browse was open.
      if (cards[stack.cardIds[0]]?.regionId !== '_browse') return;
      stack.cardIds.forEach(cid => { if (cards[cid]?.liftEl) cards[cid].liftEl.style.display = ''; });
      if (regionState[homeGroupId]) moveStackToRegion(engineStackId, homeGroupId);
    });

    // instant: closing browse is the inverse "peek" — cards should reappear in
    // their table positions and orientations rather than sliding/flipping back.
    if (regionState[homeGroupId]) layoutRegion(homeGroupId, null, true);
    if (game && idMap) {
      const homeGroup = game.groupById?.[homeGroupId];
      (homeGroup?.stackIds || []).forEach(dcStackId => {
        (game.stackById?.[dcStackId]?.cardIds || []).forEach(cid => {
          const idx = idMap.get(cid);
          if (idx !== undefined) _snapCardToExpectedSide(cards[idx], game.cardById?.[cid]);
        });
      });
    }

    // Restore the home region's table DOM.
    for (const el of [scrollOuterEls[homeGroupId], regionOutlineEls[homeGroupId],
                      regionFillEls[homeGroupId],
                      regionIconEls[homeGroupId], regionLabelEls[homeGroupId]]) {
      if (el) el.style.display = '';
    }

    _teardownBrowseRegionDom();
    delete REGIONS['_browse'];
    delete regionState['_browse'];
    _browseGroupId = null;
    _browseAllEngineStacks = [];
  }

  // Updates which stacks are visible in the browse fan.
  // filteredDcStackIndices: array of indices into the original group.stackIds.
  // instant: place cards with no slide animation (used when first opening browse).
  function updateBrowseFilter(filteredDcStackIndices, instant = false) {
    if (!_browseGroupId || !regionState['_browse']) return;
    const filteredSet = new Set(filteredDcStackIndices);
    regionState['_browse'].stackIds = [];
    _browseAllEngineStacks.forEach(({ engineStackId, dcStackIndex }) => {
      const stack = stacks[engineStackId];
      if (!stack) return;
      // Skip stacks that were dropped into another region while browse was open;
      // touching their display here would hide a card that's now on the table.
      if (cards[stack.cardIds[0]]?.regionId !== '_browse') return;
      const visible = filteredSet.has(dcStackIndex);
      stack.cardIds.forEach(cid => { if (cards[cid]?.liftEl) cards[cid].liftEl.style.display = visible ? '' : 'none'; });
      if (visible) regionState['_browse'].stackIds.push(engineStackId);
    });
    // A card mid-flight from a drag-drop (liftPx > 1) lives in the tilt plane and
    // is owned by the drop/flip logic. Laying it out here would re-home it into
    // the scroll-outer via ensureCardParent — which doesn't convert coordinates,
    // teleporting the card down by the region origin. Exclude it from the layout.
    let inFlightStackId = null;
    for (const sid of regionState['_browse'].stackIds) {
      const c = cards[stacks[sid]?.cardIds?.[0]];
      if (c && c.liftPx > 1) { inFlightStackId = sid; break; }
    }
    layoutRegion('_browse', inFlightStackId, instant);
  }

  // Re-derives the browse snapshot from the current game state. _browseAllEngineStacks
  // is otherwise a one-time snapshot from openBrowse, so cards dropped into (or moved
  // within / removed from) the browsed group would desync: the dropped card gets
  // evicted by updateBrowseFilter and stale dcStackIndex values hide the wrong cards.
  // Called from reconcile so the browse view tracks the live group membership/order.
  function refreshBrowseFromGame(game, idMap) {
    if (!_browseGroupId || !regionState['_browse']) return;
    const group = game?.groupById?.[_browseGroupId];
    if (!group) return;

    const next = [];
    (group.stackIds || []).forEach((dcStackId, dcStackIndex) => {
      const dcStack = game.stackById?.[dcStackId];
      if (!dcStack?.cardIds?.length) return;
      const firstEngineIdx = idMap.get(dcStack.cardIds[0]);
      if (firstEngineIdx === undefined) return;
      const card = cards[firstEngineIdx];
      if (!card) return;
      next.push({ engineStackId: card.stackId, dcStackIndex });
    });

    // No-op when the membership and order are unchanged — avoids re-laying-out
    // the fan on every reconcile tick.
    const unchanged = next.length === _browseAllEngineStacks.length &&
      next.every((e, i) =>
        e.engineStackId === _browseAllEngineStacks[i].engineStackId &&
        e.dcStackIndex  === _browseAllEngineStacks[i].dcStackIndex);
    if (unchanged) return;

    // Pull any stacks now in the group but not yet in the browse region (e.g. a
    // card another player added). Cards dropped in locally are already in '_browse'.
    next.forEach(({ engineStackId }) => {
      const stack = stacks[engineStackId];
      if (stack && cards[stack.cardIds[0]]?.regionId !== '_browse') {
        moveStackToRegion(engineStackId, '_browse');
      }
    });

    _browseAllEngineStacks = next;
    updateBrowseFilter(next.map(e => e.dcStackIndex));
  }

  // Apply (or clear) a card's borderColor halo — the dnc3d equivalent of the 2D
  // engine's borderColor box-shadow. Set on a dedicated child element so it never
  // collides with the face hover glow or the inline lift/drag drop-shadow.
  function applyBorderGlow(card, color) {
    card.borderColor = color || null;
    const el = card.borderGlowEl;
    if (!el) return;
    el.style.boxShadow = color
      ? `0 0 0 0.12vw ${color}, 0 0 0.7vw 0.25vw ${color}`
      : 'none';
  }

  // Returns true if a card is interactable in its pile (i.e. it IS the top card,
  // or it is not in a pile region at all). Non-top pile cards should not receive
  // hover, active-card callbacks, or be draggable.
  function isTopPileCard(card) {
    const regionId = card.regionId;
    if (!regionId || REGIONS[regionId]?.type !== 'pile') return true;
    const stackIds = regionState[regionId].stackIds;
    return stackIds.length === 0 || card.stackId === stackIds[stackIds.length - 1];
  }

  // Show the lightning-bolt affordance only while the card is hovered and its
  // current face has a triggerable ability — mirrors the 2D AbilityButton, which
  // renders only when `isActive && hasAbility`.
  function syncAbilityBtn(card) {
    if (!card.abilityBtnEl) return;
    const show = card.hasAbility && card.cardEl.classList.contains('dnc3d-card-hovered');
    card.abilityBtnEl.style.display = show ? 'flex' : 'none';
  }

  // ── Card creation ──────────────────────────────────────────────────────────
  // cardInfo: { id, frontImageUrl?, backImageUrl?, angle?, faceW?, faceH?, borderColor?, hasAbility? }
  function createCard(tiltEl, cardInfo) {
    const { id: i, frontImageUrl, backImageUrl, angle = 0, faceW = null, faceH = null, borderColor = null, hasAbility = false } = cardInfo;
    const color = COLORS[i % COLORS.length];

    const liftEl = document.createElement('div');
    liftEl.className = 'dnc3d-card-lift';

    const cardEl = document.createElement('div');
    cardEl.className = 'dnc3d-card';
    cardEl._angle          = angle;
    cardEl._animating      = false;
    cardEl._layoutRotation = 0;
    cardEl._gameRotation   = 0;
    cardEl._rotTransId     = null;
    cardEl._peeking        = false;

    const front = document.createElement('div');
    front.className = 'dnc3d-card-face dnc3d-card-front';
    if (frontImageUrl) {
      front.style.backgroundImage    = `url(${frontImageUrl})`;
      front.style.backgroundSize     = 'cover';
      front.style.backgroundPosition = 'center';
    } else {
      front.style.backgroundColor = color;
    }

    const back = document.createElement('div');
    back.className = 'dnc3d-card-face dnc3d-card-back';
    if (backImageUrl) {
      back.style.backgroundImage    = `url(${backImageUrl})`;
      back.style.backgroundSize     = 'cover';
      back.style.backgroundPosition = 'center';
    }

    // borderColor halo host. Painted FIRST (behind the faces) so its outer glow
    // shows around the card edges while the opaque face covers the interior.
    const borderGlow = document.createElement('div');
    borderGlow.className = 'dnc3d-card-border-glow';

    cardEl.appendChild(borderGlow);
    cardEl.appendChild(front);
    cardEl.appendChild(back);
    liftEl.appendChild(cardEl);

    // Token host. Tokens belong to the CARD, not a face, so they must stay
    // visible whichever side is up. The faces live inside cardEl, which flips
    // (rotateY) and exhaust-rotates (rotateZ) — and `backface-visibility:hidden`
    // hides whichever face is turned away, taking its children with it. So we
    // hang the token host off liftEl instead, which only ever carries position/
    // lift translateZ (never rotateY/rotateZ): it always faces the viewer and
    // never gets back-face-culled. A small forward translateZ lifts it just
    // above the card faces (z≈0) so tokens paint on top in the preserve-3d
    // context. pointer-events:none lets card hover/click pass through the
    // full-card host; the individual token boxes re-enable pointer-events.
    // (Exhaust rotation is re-applied to the tokens in React, reading Redux
    // `rotation`, so the existing label/extrude counter-rotation stays correct.)
    const tokenHost = document.createElement('div');
    tokenHost.className     = 'dnc3d-card-tokens';
    tokenHost.style.position      = 'absolute';
    tokenHost.style.inset         = '0';
    tokenHost.style.pointerEvents = 'none';
    tokenHost.style.transform     = 'translateZ(1px)';
    liftEl.appendChild(tokenHost);

    // Lightning-bolt ability affordance (dnc3d port of the 2D AbilityButton).
    // The bolt lives inside a host that fills the card box and is spun to match
    // the card's full rotateZ (layout + exhaust) by applyTokenHostRotation — so
    // it follows the card's rotation like the 2D button. The host hangs off liftEl
    // (never carries rotateY), so the bolt always faces the viewer and isn't
    // back-face-culled on flip. Hidden until the card is hovered AND its current
    // face has a triggerable ability (see syncAbilityBtn).
    const abilityHost = document.createElement('div');
    abilityHost.className     = 'dnc3d-card-ability-host';
    abilityHost.style.position      = 'absolute';
    abilityHost.style.inset         = '0';
    abilityHost.style.pointerEvents = 'none';
    abilityHost.style.transform     = 'translateZ(2px)';
    const abilityBtn = document.createElement('div');
    abilityBtn.className   = 'dnc3d-card-ability';
    abilityBtn.style.display = 'none';
    abilityBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 1.5 4 13.2h6.2L9 22.5 20 10.2h-6.6z"/></svg>';
    // Don't let a press on the bolt start a card drag (liftEl pointerdown) or, on
    // release, register as a card click that opens the card menu.
    abilityBtn.addEventListener('pointerdown', e => e.stopPropagation());
    abilityBtn.addEventListener('pointerup',   e => e.stopPropagation());
    abilityBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (onTriggerAbility) onTriggerAbility(i);
    });
    abilityHost.appendChild(abilityBtn);
    liftEl.appendChild(abilityHost);

    liftEl.style.left      = '0px';
    liftEl.style.top       = '0px';
    liftEl.style.zIndex    = i + 1;
    liftEl.style.transform = `translateZ(${BASE_LIFT}px)`;
    cardEl.style.transform = cardTransform(angle, 0);

    tiltEl.appendChild(liftEl);

    const card = {
      id:           i,
      liftEl,
      cardEl,
      frontEl:      front,
      tokenHostEl:  tokenHost,
      regionId:     null,
      stackId:      null,
      attachmentDirection: null,
      layoutAnimId: null,
      fracX:        0,
      fracY:        0,
      prevPos:      { left: 0, top: 0, rot: 0 },
      pileZ:        0,
      liftPx:       0,
      dragOffFromPrimary: { dx: 0, dy: 0 },
      faceW,
      faceH,
      renderedW:    null,
      renderedH:    null,
      borderGlowEl: borderGlow,
      borderColor:  null,
      abilityBtnEl:  abilityBtn,
      abilityHostEl: abilityHost,
      hasAbility:   !!_playerN && !!hasAbility,
    };
    cards.push(card);
    applyCardDims(card);
    applyBorderGlow(card, borderColor);

    createStack([i]);

    liftEl.addEventListener('click', e => e.stopPropagation());
    // Hover ("active") detection lives on cardEl, not liftEl, so the hit region
    // tracks the card's actual rotated shape: cardEl carries the rotateZ
    // (exhaust/layout) + rotateY (flip), while liftEl stays an un-rotated
    // portrait box. Binding to liftEl made the strip above/below a sideways card
    // register as a hover (and the rotated card's true corners go dead).
    // The hovered state is mirrored to a class so the CSS glow follows the same
    // rotated region (see .dnc3d-card.dnc3d-card-hovered).
    //
    // The hit surface is cardEl (+ its tokens), NOT liftEl. liftEl is
    // pointer-events:none (see CSS): it's an un-rotated portrait box, so if it
    // captured events its dead margin above/below a sideways card would (a) light
    // the card from outside its art and (b) sit on top of — and block — a stacked
    // neighbour beneath, so that neighbour could never take the hover. With liftEl
    // transparent, the rotated cardEl is the only card-shaped target, and a
    // neighbour showing through the margin receives the pointer normally.
    //
    // Deciding when a leave really ends the hover can't be done from
    // relatedTarget alone: token boxes are pointer-events:auto and paint above
    // the cards, and in a stack one card's tokens overlap a neighbour — so
    // moving onto a token (own or a neighbour's) fires a pointerout even though
    // the cursor is still over this card. Instead, ask the browser what's
    // actually under the cursor and find the topmost CARD, treating tokens (and
    // the see-through liftEl/tokenHost wrappers — none carry .dnc3d-card) as
    // transparent. The hover ends only when that card isn't this one.
    //
    // pointerout (not pointerleave) is used for the end so it BUBBLES: liftEl is
    // pointer-events:none and never a hit target itself, but pointerout from its
    // auto descendants (cardEl, token boxes) still bubbles to a listener on it —
    // which catches leaving the card straight off a token, the one case cardEl's
    // own pointerleave would miss.
    // Suppress hover while dragging: re-parenting the dragged card's liftEl
    // (moveStackToTilt) fires a spurious pointerenter that would re-show the
    // GiantCard mid-drag right after onDragStart cleared it.
    const topCardElAt = topCardElAtPoint;
    const showCardHover = (e) => {
      if (_isDragging) return;
      if (_hoverSuppressed) return;
      if (!isTopPileCard(card)) return;
      if (cardEl.classList.contains('dnc3d-card-hovered')) return;
      cardEl.classList.add('dnc3d-card-hovered');
      syncAbilityBtn(card);
      if (onCardHover) onCardHover(i, e.clientX);
    };
    const endCardHover = (e) => {
      if (e && topCardElAt(e.clientX, e.clientY) === cardEl) return;
      if (!cardEl.classList.contains('dnc3d-card-hovered')) return;
      cardEl.classList.remove('dnc3d-card-hovered');
      syncAbilityBtn(card);
      if (onCardHoverEnd) onCardHoverEnd(i);
    };
    cardEl.addEventListener('pointerenter', showCardHover);
    liftEl.addEventListener('pointerout', endCardHover);
    if (onCardHoverTopBottom) {
      liftEl.addEventListener('pointermove', (e) => {
        if (_isDragging) return;
        if (!isTopPileCard(card)) return;
        const rect = cardEl.getBoundingClientRect();
        onCardHoverTopBottom(e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom');
      });
    }

    // ── Lift animation state ──
    let liftAnimId = null;

    function dragLiftMax() {
      let maxLayerZ = 0;
      for (const r of Object.values(REGIONS)) {
        if (r.layerIndex) maxLayerZ = Math.max(maxLayerZ, layerZPx(cardHeightPx()) * r.layerIndex);
      }
      return maxLayerZ + (MAX_PILE_VISUAL_DEPTH - 1) * pileStackZPx(cardHeightPx()) + window.innerHeight * 0.04;
    }

    function setLiftVisuals(z_px, x_px = 0) {
      card.liftPx = z_px;
      const frac = z_px / dragLiftMax();
      liftEl.style.transform = `translateZ(${BASE_LIFT + card.pileZ + z_px}px) translateX(${x_px}px)`;
      cardEl.style.transform = cardTransform(cardEl._angle, (cardEl._layoutRotation || 0) + (cardEl._gameRotation || 0), 1 + 0.1 * frac);
      cardEl.style.boxShadow = frac > 0.01
        ? `0 ${frac * 1.1}vh ${frac * 2.5}vh rgba(0,0,0,0.6)`
        : 'none';
    }

    function animateLift(target, duration, easing, onComplete, options = {}) {
      const { wiggleXPx = 0, settleProgressAt = 1, onSettle = null, startTime = null } = options;
      if (liftAnimId) { cancelAnimationFrame(liftAnimId); liftAnimId = null; }
      const from  = card.liftPx;
      const start = startTime ?? performance.now();
      const durationMs = scaleDuration(duration);
      let settled = false;
      function frame(now) {
        const t = Math.min((now - start) / durationMs, 1);
        const settleT = settleProgressAt > 0
          ? Math.min(t / settleProgressAt, 1)
          : 1;
        if (!settled && settleT >= 1) { settled = true; if (onSettle) onSettle(); }
        const x = wiggleXPx ? Math.sin(t * Math.PI) * wiggleXPx : 0;
        setLiftVisuals(from + (target - from) * easing(settleT), x);
        if (t < 1) {
          liftAnimId = requestAnimationFrame(frame);
        } else {
          liftAnimId = null;
          setLiftVisuals(target, 0);
          if (onComplete) onComplete();
        }
      }
      liftAnimId = requestAnimationFrame(frame);
    }

    card._setLiftVisuals = setLiftVisuals;
    card._animateLift    = animateLift;
    card._cancelLift     = () => { if (liftAnimId) { cancelAnimationFrame(liftAnimId); liftAnimId = null; } };
    card._dragLiftMax    = dragLiftMax;

    // ── Per-drag state ──
    let grabOffScreenX = 0, grabOffScreenY = 0;
    let startX = 0, startY = 0;
    let isDragging = false;
    let dragZ = i + 1;
    let currentInsertRegion = null;
    let currentInsertIdx    = -1;
    let dropGlowRegionId    = null;
    let dragStack           = null;

    // Light up a whole region as the active drop target. Works for any region
    // type because every region has a `.dnc3d-region-outline` (rows/fans only
    // get the insertion line on top). Pass null to clear.
    const setDropGlow = (regionId) => {
      if (dropGlowRegionId === regionId) return;
      regionOutlineEls[dropGlowRegionId]?.classList.remove('dnc3d-region-drop-target');
      regionOutlineEls[regionId]?.classList.add('dnc3d-region-drop-target');
      dropGlowRegionId = regionId;
    };
    let dragStackCards      = [];
    let hoverAttachStackId  = null;
    let hoverAttachCardId   = null;
    let hoverAttachSide     = null;
    let autoScrollRafId     = null;
    let autoScrollDir       = 0;
    let autoScrollRegion    = null;

    liftEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;
      dragStack  = null;
      dragStackCards = [];

      const prevStack = stacks[card.stackId];
      prevStack.cardIds.forEach(cid => {
        const c   = cards[cid];
        const pos = tiltSpacePosOf(c);
        c.prevPos = { left: pos.left, top: pos.top, rot: c.cardEl._layoutRotation || 0 };
        if (c.layoutAnimId) { cancelAnimationFrame(c.layoutAnimId); c.layoutAnimId = null; }
      });

      const primaryPos = tiltSpacePosOf(card);
      const Z_pickup   = BASE_LIFT + card.pileZ;
      const cardScreen = tableToScreen(primaryPos.left, primaryPos.top, Z_pickup, _tiltEl, _currentDeg);
      grabOffScreenX   = e.clientX - cardScreen.x;
      grabOffScreenY   = e.clientY - cardScreen.y;
      liftEl.setPointerCapture(e.pointerId);
    });

    liftEl.addEventListener('pointermove', (e) => {
      if (!liftEl.hasPointerCapture(e.pointerId)) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const threshold = Math.min(window.innerWidth, window.innerHeight) * 0.005;

      if (!isDragging && Math.hypot(dx, dy) >= threshold) {
        if (!isTopPileCard(card)) return; // non-top pile cards are not draggable
        isDragging = true;
        _isDragging = true;
        // Drop the hover state (and its bolt affordance) on the card being
        // lifted so it doesn't ride along with the drag.
        cardEl.classList.remove('dnc3d-card-hovered');
        syncAbilityBtn(card);
        // Kill any running hover-settle loop: its ticks would otherwise resume
        // firing once _isDragging clears at drop, hit-testing against the
        // pre-move game state and activating the card with its stale group.
        if (_hoverSettleRaf) { cancelAnimationFrame(_hoverSettleRaf); _hoverSettleRaf = null; }
        playPickupSound(); // card lifted off (drag threshold crossed)
        if (cardEl._rotTransId) { clearTimeout(cardEl._rotTransId); cardEl._rotTransId = null; cardEl.style.transition = ''; }
        if (onDragStart) onDragStart();

        dragStack      = stacks[card.stackId];
        dragStackCards = dragStack.cardIds.map(id => cards[id]);

        const primaryPos = card.prevPos;
        dragStackCards.forEach(c => {
          c.dragOffFromPrimary = {
            dx: c.prevPos.left - primaryPos.left,
            dy: c.prevPos.top  - primaryPos.top,
          };
          c.liftPx = c.pileZ;
          c.pileZ  = 0;
          c._cancelLift();
        });

        moveStackToTilt(dragStack);
        liftEl.setPointerCapture(e.pointerId);

        dragZ = nextTopZ();

        dragStackCards.forEach(c => {
          c.cardEl._layoutRotation = 0;
          // Drop the hover class outright (not just rely on the :not(.dnc3d-dragging)
          // CSS to hide it): otherwise it silently survives the whole drag, and on
          // drop the glow reappears without onCardHover ever re-firing — so the
          // GiantCard preview never comes back. Clearing it makes the post-drop
          // hover sweep treat a card dropped under the cursor as a fresh hover.
          c.cardEl.classList.remove('dnc3d-card-hovered');
          c.cardEl.classList.add('dnc3d-dragging');
          c._setLiftVisuals(c.liftPx + c._dragLiftMax() * 0.06);
          c._animateLift(c._dragLiftMax(), 180, easeOut);
        });
        updateStackZoneOverlays({ visible: true, excludeStackId: dragStack.id });
      }

      if (!isDragging) return;

      const Z_current   = BASE_LIFT + card.liftPx;
      const tp          = screenToTableAtZ(e.clientX - grabOffScreenX, e.clientY - grabOffScreenY, Z_current, _tiltEl, _currentDeg);
      const primaryLeft = tp.x;
      const primaryTop  = tp.y;

      dragStackCards.forEach(c => {
        c.liftEl.style.left = (primaryLeft + c.dragOffFromPrimary.dx) + 'px';
        c.liftEl.style.top  = (primaryTop  + c.dragOffFromPrimary.dy) + 'px';
      });

      const tw = parseFloat(_tiltEl.style.width);
      const th = parseFloat(_tiltEl.style.height);
      // Hit-test the drop location from the cursor itself, projected onto the
      // table surface (Z=0) where the regions actually live — not the dragged
      // card's center and not the lifted card plane (projecting at the lift
      // height would offset the point under perspective tilt). Matches the
      // attach hit-test below, which already keys off the raw e.clientX/Y.
      const cursorTp = screenToTableAtZ(e.clientX, e.clientY, 0, _tiltEl, _currentDeg);
      const cx = cursorTp.x;
      const cy = cursorTp.y;

      // ── Attach-gesture hit-test ──────────────────────────────────────────────
      let newHoverAttachStackId = null;
      let newHoverAttachSide    = null;
      const attachTargetRegions = Object.entries(REGIONS)
        .filter(([, r]) => r.type === 'free' || r.type === 'row')
        .map(([id]) => id);

      let newHoverAttachCardId = null;
      // Highest region layer whose elevated panel is drawn over the cursor, in
      // screen space. Elevated regions (an elevated row, or the browse panel on
      // its own layer) lift toward the viewer, so their on-screen footprint can't
      // be derived from the Z=0 table projection — read it from each panel's live
      // projected rect instead. A card may only be an attach target if nothing on
      // a higher layer covers it; otherwise the gesture reaches through the panel
      // to a card hidden beneath it.
      let cursorCoverLayer = 0;
      for (const [rid, r] of Object.entries(REGIONS)) {
        const li = r.layerIndex || 0;
        if (li <= cursorCoverLayer) continue;
        // Use the region outline, which exists for every region type (including
        // free/pile) and carries the elevation transform — scrollOuterEls only
        // exists for row/fan, so an elevated free/pile region wouldn't register.
        const panel = regionOutlineEls[rid];
        if (!panel) continue;
        const pr = panel.getBoundingClientRect();
        if (e.clientX >= pr.left && e.clientX <= pr.right &&
            e.clientY >= pr.top  && e.clientY <= pr.bottom) {
          cursorCoverLayer = li;
        }
      }
      for (const rid of attachTargetRegions) {
        if ((REGIONS[rid].layerIndex || 0) < cursorCoverLayer) continue;
        for (const sid of regionState[rid].stackIds) {
          if (sid === dragStack.id) continue;
          const targetStack = stacks[sid];
          const { leftCardId, rightCardId } = stackBaseCardIds(targetStack);
          const leftBaseCard = cards[leftCardId];
          const rightBaseCard = cards[rightCardId];
          const leftRect = leftBaseCard?.liftEl.getBoundingClientRect();
          const rightRect = rightBaseCard?.liftEl.getBoundingClientRect();

          if (!leftRect?.width || !rightRect?.width) continue;

          if (REGIONS[rid].type === 'row') {
            const rp   = regionPx(rid);
            const vert = REGIONS[rid].direction === 'vertical';
            if (vert) {
              const ch = cardHeightPx();
              const ly = parseFloat(leftBaseCard.liftEl.style.top)  || 0;
              const ry = parseFloat(rightBaseCard.liftEl.style.top) || 0;
              const stackTop    = Math.min(ly, ry);
              const stackBottom = Math.max(ly, ry) + ch;
              if (stackBottom <= 0 || stackTop >= rp.h) continue;
            } else {
              const cw = cardWidthPx();
              const lx = parseFloat(leftBaseCard.liftEl.style.left)  || 0;
              const rx = parseFloat(rightBaseCard.liftEl.style.left) || 0;
              const stackLeft  = Math.min(lx, rx);
              const stackRight = Math.max(lx, rx) + cw;
              if (stackRight <= 0 || stackLeft >= rp.w) continue;
            }
          }

          const leftInY = e.clientY >= leftRect.top && e.clientY <= leftRect.bottom;
          const leftRelX = e.clientX - leftRect.left;
          const leftInX = leftRelX >= 0 && leftRelX <= leftRect.width;
          const inLeftZone = leftInY && leftInX && leftRelX < leftRect.width / 2;

          const rightInY = e.clientY >= rightRect.top && e.clientY <= rightRect.bottom;
          const rightRelX = e.clientX - rightRect.left;
          const rightInX = rightRelX >= 0 && rightRelX <= rightRect.width;
          const inRightZone = rightInY && rightInX && rightRelX >= rightRect.width / 2;

          if (inLeftZone) {
            newHoverAttachStackId = sid;
            newHoverAttachCardId = leftCardId;
            newHoverAttachSide = 'left';
            break;
          }

          if (inRightZone) {
            newHoverAttachStackId = sid;
            newHoverAttachCardId = rightCardId;
            newHoverAttachSide = 'right';
            break;
          }
        }
        if (newHoverAttachStackId !== null) break;
      }

      if (
        hoverAttachStackId !== newHoverAttachStackId ||
        hoverAttachCardId !== newHoverAttachCardId ||
        hoverAttachSide !== newHoverAttachSide
      ) {
        if (hoverAttachCardId !== null && cards[hoverAttachCardId]) {
          cards[hoverAttachCardId].cardEl
            .classList.remove('dnc3d-attach-hover-left', 'dnc3d-attach-hover-right');
        }
        hoverAttachStackId = newHoverAttachStackId;
        hoverAttachCardId = newHoverAttachCardId;
        hoverAttachSide    = newHoverAttachSide;
        if (hoverAttachCardId !== null) {
          cards[hoverAttachCardId].cardEl
            .classList.add(`dnc3d-attach-hover-${hoverAttachSide}`);
        }
      }

      // ── Attachment icon on target stack ─────────────────────────────────────
      if (_attachTargetIconEl) {
        if (newHoverAttachStackId !== null && newHoverAttachCardId !== null) {
          const targetCard = cards[newHoverAttachCardId];
          if (targetCard?.liftEl) {
            const cw = cardWidthPx();
            const ch = cardHeightPx();
            const iconSize = cw * 0.64;
            const cardPos  = tiltSpacePosOf(targetCard);
            const cardLeft = cardPos.left;
            const cardTop  = cardPos.top;
            const edgeX = newHoverAttachSide === 'left' ? cardLeft : cardLeft + cw;
            const iconZ = (dragStackCards[0]?.liftPx ?? 0) + window.innerHeight * 0.02;

            const rad  = _currentDeg * Math.PI / 180;
            const cosA = Math.cos(rad), sinA = Math.sin(rad);
            const P    = stagePx();
            const vh   = window.innerHeight;
            const targetMidY = cardTop + ch / 2;
            const sy = vh / 2 + (targetMidY * cosA - vh / 2) * P / (P - targetMidY * sinA);
            const dy = sy - vh / 2;
            const ty_icon = (P * sy - iconZ * (dy * cosA - P * sinA)) / (P * cosA + dy * sinA);

            _attachTargetIconEl.style.width     = iconSize + 'px';
            _attachTargetIconEl.style.height    = iconSize + 'px';
            _attachTargetIconEl.style.left      = (edgeX   - iconSize / 2) + 'px';
            _attachTargetIconEl.style.top       = (ty_icon - iconSize / 2) + 'px';
            _attachTargetIconEl.style.transform = `translateZ(${iconZ}px)`;
            // Font scales with the icon so the label reads consistently at any zoom.
            _attachTargetIconEl.style.fontSize  = (iconSize * 0.22) + 'px';

            // Populate the grow-out label: "Attach to" / <card name> / (left|right).
            // The name is the stack's parent (base) card, not the edge card the
            // icon sits next to.
            const labelEl = _attachTargetIconEl.querySelector('.dnc3d-attach-label');
            if (labelEl) {
              const parentCardId = stacks[newHoverAttachStackId]?.cardIds?.[0];
              const name = (getCardName && parentCardId != null) ? (getCardName(parentCardId) || '') : '';
              labelEl.querySelector('.dnc3d-attach-label-name').textContent = name;
              labelEl.querySelector('.dnc3d-attach-label-side').textContent = `(${newHoverAttachSide})`;
              // Grow away from the card edge: the icon sits on the card's `side`
              // edge, so a left-attach grows further left, a right-attach further right.
              labelEl.classList.toggle('dnc3d-attach-label-out-left',  newHoverAttachSide === 'left');
              labelEl.classList.toggle('dnc3d-attach-label-out-right', newHoverAttachSide === 'right');
            }
            _attachTargetIconEl.classList.add('dnc3d-is-visible');
          }
        } else {
          _attachTargetIconEl.classList.remove('dnc3d-is-visible');
        }
      }

      // ── Edge auto-scroll for row regions ────────────────────────────────────
      {
        let newAutoScrollDir    = 0;
        let newAutoScrollRegion = null;
        const hoverRegionForScroll = findRegionAtPoint(cx / tw * 100, cy / th * 100);
        if (hoverRegionForScroll && REGIONS[hoverRegionForScroll].type === 'row') {
          const rp         = regionPx(hoverRegionForScroll);
          const vert       = REGIONS[hoverRegionForScroll].direction === 'vertical';
          const total      = scrollTotalExtent(hoverRegionForScroll);
          const maxScroll  = Math.max(0, total - (vert ? rp.h : rp.w));
          if (maxScroll > 0) {
            if (vert) {
              const relY = cy - rp.y;
              if (relY < rp.h * 0.25)      { newAutoScrollDir = -1; newAutoScrollRegion = hoverRegionForScroll; }
              else if (relY > rp.h * 0.75) { newAutoScrollDir =  1; newAutoScrollRegion = hoverRegionForScroll; }
            } else {
              const relX = cx - rp.x;
              if (relX < rp.w * 0.25)      { newAutoScrollDir = -1; newAutoScrollRegion = hoverRegionForScroll; }
              else if (relX > rp.w * 0.75) { newAutoScrollDir =  1; newAutoScrollRegion = hoverRegionForScroll; }
            }
          }
        }
        if (newAutoScrollDir !== autoScrollDir || newAutoScrollRegion !== autoScrollRegion) {
          if (autoScrollRafId !== null) { cancelAnimationFrame(autoScrollRafId); autoScrollRafId = null; }
          autoScrollDir    = newAutoScrollDir;
          autoScrollRegion = newAutoScrollRegion;
          if (autoScrollDir !== 0) {
            const tick = () => {
              if (autoScrollDir === 0 || autoScrollRegion === null) return;
              const rp2        = regionPx(autoScrollRegion);
              const vert2      = REGIONS[autoScrollRegion].direction === 'vertical';
              const total2     = scrollTotalExtent(autoScrollRegion);
              const maxScroll2 = Math.max(0, total2 - (vert2 ? rp2.h : rp2.w));
              const speed      = (vert2 ? cardHeightPx() : cardWidthPx()) * DRAG_EDGE_SCROLL_SPEED;
              const cur        = regionState[autoScrollRegion].scrollOffset || 0;
              const next       = Math.min(Math.max(cur + autoScrollDir * speed, 0), maxScroll2);
              if (next !== cur) {
                regionState[autoScrollRegion].scrollOffset = next;
                const s = sentinelEls[autoScrollRegion];
                if (s) {
                  s._syncing = true;
                  if (vert2) s.el.scrollTop = next; else s.el.scrollLeft = next;
                }
                layoutRegion(autoScrollRegion, dragStack.id);
              }
              autoScrollRafId = requestAnimationFrame(tick);
            };
            autoScrollRafId = requestAnimationFrame(tick);
          }
        }
      }

      // ── Insertion indicator + drop-target glow ────────────────────────────────
      if (hoverAttachStackId !== null) {
        // Attaching to a card, not dropping into a region — no region highlight.
        hideInsertionIndicator();
        _overlay.setInsertProbe(null);
        currentInsertIdx    = -1;
        currentInsertRegion = null;
        setDropGlow(null);
      } else {
        // Screen-space region lookup so the drop target/line follow what's drawn
        // on top — an elevated region (browse panel, layerIndex>=1 row) rather
        // than whatever the cursor's Z=0 projection passes through behind it.
        // hr.cx/hr.cy are projected onto that region's plane for the insert index.
        const hr          = hoverRegionAt(e.clientX, e.clientY);
        const hoverRegion = hr.region;
        const hoverType   = hoverRegion ? REGIONS[hoverRegion].type : null;
        const droppable   = hoverRegion && hoverRegion !== _browseGroupId &&
          (hoverType === 'row' || hoverType === 'fan' || hoverType === 'pile');
        // The insertion line only applies to ordered regions (rows/fans); piles
        // stack in place, so they glow but get no line.
        if (droppable && (hoverType === 'row' || hoverType === 'fan')) {
          currentInsertIdx    = showInsertionIndicator(hoverRegion, hr.cx, hr.cy, dragStack.id);
          currentInsertRegion = hoverRegion;
          // Mirror the line into the screen-space overlay so it stays visible on
          // top of the dragged card instead of being hidden beneath it.
          _overlay.setInsertProbe(_insertIndicatorEl);
        } else {
          hideInsertionIndicator();
          _overlay.setInsertProbe(null);
          currentInsertIdx    = -1;
          currentInsertRegion = null;
        }
        setDropGlow(droppable ? hoverRegion : null);
      }
    });

    liftEl.addEventListener('pointerup', (e) => {
      liftEl.releasePointerCapture(e.pointerId);
      dragStackCards.forEach(c => c.cardEl.classList.remove('dnc3d-dragging'));
      updateStackZoneOverlays({ visible: false });
      _attachTargetIconEl?.classList.remove('dnc3d-is-visible');

      if (autoScrollRafId !== null) { cancelAnimationFrame(autoScrollRafId); autoScrollRafId = null; }
      autoScrollDir    = 0;
      autoScrollRegion = null;

      if (hoverAttachCardId !== null && cards[hoverAttachCardId]) {
        cards[hoverAttachCardId].cardEl
          .classList.remove('dnc3d-attach-hover-left', 'dnc3d-attach-hover-right');
      }

      if (isDragging && !cardEl._animating) {
        const tw = parseFloat(_tiltEl.style.width);
        const th = parseFloat(_tiltEl.style.height);

        // Play the card-drop sound once when the card contacts the surface,
        // regardless of which landing path runs (liftDown or the fan/row insert
        // path). Symmetric with the pickup sound fired at drag start.
        let dropSoundPlayed = false;
        const signalDrop = () => { if (!dropSoundPlayed) { dropSoundPlayed = true; playDropSound(); } };

        const droppedStackCards  = [...dragStackCards];
        const droppedStack       = dragStack;
        const droppedAttachSid   = hoverAttachStackId;
        const droppedAttachSide  = hoverAttachSide;
        const droppedInsertIdx   = currentInsertIdx;
        const droppedInsertRgn   = currentInsertRegion;

        hideInsertionIndicator();
        _overlay.setInsertProbe(null);
        setDropGlow(null);
        currentInsertIdx    = -1;
        currentInsertRegion = null;
        hoverAttachStackId  = null;
        hoverAttachCardId   = null;
        hoverAttachSide     = null;

        // Determine the drop region in screen space, honoring 3D layer stacking,
        // so the drop matches the live hover feedback and lands in the region
        // drawn on top rather than one an elevated panel merely covers.
        const _rawTargetRegion = hoverRegionAt(e.clientX, e.clientY).region;
        // Treat the browse home region as empty while it's being browsed.
        const targetRegionId = (_rawTargetRegion === _browseGroupId) ? null : _rawTargetRegion;

        function liftDown(dur, cb, targets = null, options = {}) {
          const { wiggleXPx = 0, settleProgressAt = 1, deferZIndex = false } = options;
          const targetByCardId = targets
            ? new Map(targets.map(pos => [pos.card.id, pos]))
            : null;
          let done = 0;
          const startTime = performance.now();
          signalDrop(); // play the drop sound as the descent begins
          droppedStackCards.forEach(c => {
            const target     = targetByCardId?.get(c.id);
            const stackZ     = target ? (target.stackZ ?? 0) : c.pileZ;
            const liftTarget = c.liftPx >= stackZ ? stackZ : 0;
            if (target && !deferZIndex) {
              c.liftEl.style.zIndex = target.zIndex;
            }
            c._animateLift(liftTarget, dur, easeIn, () => {
              c.pileZ  = stackZ;
              c.liftPx = 0;
              c._setLiftVisuals(0);
              if (!target) c.liftEl.style.zIndex = nextTopZ();
              done++;
              if (done === droppedStackCards.length && cb) cb();
            }, {
              wiggleXPx,
              settleProgressAt,
              onSettle: (deferZIndex && target) ? () => { c.liftEl.style.zIndex = target.zIndex; } : null,
              startTime,
            });
          });
        }

        function stackTargets(stack, resolveTarget) {
          const n = stack.cardIds.length;
          const topZ = nextTopZ() + n;
          return stack.cardIds.map((cid, cardIdx) => {
            const c = cards[cid];
            const target = resolveTarget(c, cardIdx);
            const layerOffset = layerZPx(cardHeightPx()) * (REGIONS[c.regionId]?.layerIndex || 0);
            return {
              card: c,
              left: target.left,
              top: target.top,
              rot: target.rot ?? 0,
              zIndex: topZ - cardIdx,
              stackZ: layerOffset,
            };
          });
        }

        // ── Priority 1: Attach gesture ────────────────────────────────────────
        if (droppedAttachSid !== null && stacks[droppedAttachSid]) {
          const targetStack  = stacks[droppedAttachSid];
          const targetParent = cards[targetStack.cardIds[0]];
          const targetRegion = targetParent.regionId;
          const targetAnchor = tiltSpacePosOf(targetParent);
          const sourceRegion = cards[droppedStack.cardIds[0]].regionId;
          attachStack(droppedStack.id, droppedAttachSid, droppedAttachSide);
          const attachWiggleXPx = window.innerHeight * (ATTACH_WIGGLE_DVH / 100) * (droppedAttachSide === 'left' ? -1 : 1);

          // Pass base card IDs (not dnc3d stack IDs) so the callback can look them up via reverseIdMap.
          // After attachStack, stacks[droppedAttachSid].cardIds[0] is still the original target base card.
          if (onAttach) onAttach(droppedStack.cardIds[0], stacks[droppedAttachSid]?.cardIds[0], droppedAttachSide);

          if (REGIONS[targetRegion]?.type === 'free' && stacks[droppedAttachSid]) {
            const merged = stacks[droppedAttachSid];
            const mergedOffsets = new Map(
              stackCardOffsets(merged).map(pos => [pos.cardId, pos])
            );
            const mergedPositions = stackTargets(merged, c => {
              const offset = mergedOffsets.get(c.id) || { dx: 0, dy: 0 };
              return {
                left: targetAnchor.left + offset.dx,
                top: targetAnchor.top + offset.dy,
                rot: 0,
              };
            });
            const droppedCardIdSet = new Set(droppedStack.cardIds);
            const mergedTargetByCardId = new Map(
              mergedPositions.map(pos => [pos.card.id, pos])
            );

            targetStack.cardIds.forEach(cid => {
              if (droppedCardIdSet.has(cid)) return;
              const targetPos = mergedTargetByCardId.get(cid);
              if (!targetPos) return;
              const targetCard = cards[cid];
              targetCard.pileZ = targetPos.stackZ;
              targetCard.liftEl.style.zIndex = targetPos.zIndex;
              targetCard._setLiftVisuals(targetCard.liftPx);
            });

            mergedPositions.forEach(pos => {
              animateCardTo(pos.card, pos.left, pos.top, pos.rot, pos.zIndex, 280, pos.stackZ);
            });
            if (sourceRegion && sourceRegion !== targetRegion && REGIONS[sourceRegion]?.type !== 'free') {
              layoutRegion(sourceRegion);
            }
            liftDown(280, null, mergedPositions, {
              wiggleXPx: attachWiggleXPx,
              settleProgressAt: 0.5,
            });
          } else {
            // The target region's scroll-outer flattens its children
            // (overflow:hidden, no preserve-3d), so a card animating in the tilt
            // plane can't tuck *among* the target stack's cards — it renders
            // entirely in front of that flattened plane, and is also clipped at
            // the region edge. To get both correct layering and no clipping, move
            // the whole merged stack into the tilt plane (where per-card z-index
            // is honored, as in the free-region branch) for the animation, then
            // reparent every merged card back into the scroll-outer once settled.
            const merged = targetStack; // stacks[droppedAttachSid] — now dropped + target cards
            merged.cardIds.forEach(cid => moveCardToTilt(cards[cid]));

            const layoutFn = REGIONS[targetRegion].type === 'row' ? layoutRow
                           : REGIONS[targetRegion].type === 'fan' ? layoutFan
                           : layoutPile;
            const regionPositions = layoutFn(targetRegion) || [];
            if (sourceRegion && sourceRegion !== targetRegion && REGIONS[sourceRegion]?.type !== 'free') {
              layoutRegion(sourceRegion);
            }
            // layoutRegion's after-layout hook (skipped since we laid out
            // directly): refresh the region's scroll bounds for its new width.
            updateSentinel(targetRegion);
            updateScrollArrows(targetRegion);

            const mergedIdSet    = new Set(merged.cardIds);
            const droppedIdSet   = new Set(droppedStackCards.map(c => c.id));
            const targetByCardId = new Map(regionPositions.map(p => [p.cardId, p]));

            // Other stacks in the region slide (within their scroll-outer) to make room.
            regionPositions.forEach(p => {
              if (mergedIdSet.has(p.cardId)) return;
              const c = cards[p.cardId];
              if (!c) return;
              c.liftEl.style.zIndex = p.zIndex;
              animateCardTo(c, p.left, p.top, p.rot, p.zIndex, 280, p.stackZ || 0);
            });

            // The merged stack's existing (non-dropped) cards are static — snap
            // them into place in the tilt plane (no reparent) so they share the
            // dropped cards' z-index context for correct layering.
            merged.cardIds.forEach(cid => {
              if (droppedIdSet.has(cid)) return;
              const p = targetByCardId.get(cid);
              const c = cards[cid];
              if (!p || !c) return;
              c.pileZ = p.stackZ || 0;
              c.liftEl.style.left      = p.left + 'px';
              c.liftEl.style.top       = p.top + 'px';
              c.liftEl.style.zIndex    = p.zIndex;
              c.liftEl.style.transform = `translateZ(${BASE_LIFT + (p.stackZ || 0)}px)`;
              c.cardEl._layoutRotation = p.rot;
              c.cardEl.style.transform = cardTransform(c.cardEl._angle, p.rot + (c.cardEl._gameRotation || 0));
              applyTokenHostRotation(c);
            });

            const liftTargets = regionPositions
              .filter(p => droppedIdSet.has(p.cardId))
              .map(p => ({ card: cards[p.cardId], stackZ: p.stackZ || 0, zIndex: p.zIndex }));

            [...droppedStackCards].reverse().forEach(c => { c.liftEl.style.zIndex = nextTopZ(); });

            // Tilt-space X/Y slide of the dropped cards to their attached slots,
            // concurrent with the lift/wiggle (which only touches Z and translateX).
            const slideStart = performance.now();
            const slideDurMs = scaleDuration(280);
            const slideFrom  = new Map(droppedStackCards.map(c => [c.id, tiltSpacePosOf(c)]));
            (function slideDropped(now) {
              const t = Math.min((now - slideStart) / slideDurMs, 1);
              const e = easeOut(t);
              droppedStackCards.forEach(c => {
                const tgt = targetByCardId.get(c.id);
                const from = slideFrom.get(c.id);
                if (!tgt || !from || c.liftEl.parentElement !== _tiltEl) return;
                c.liftEl.style.left = (from.left + (tgt.left - from.left) * e) + 'px';
                c.liftEl.style.top  = (from.top  + (tgt.top  - from.top)  * e) + 'px';
              });
              if (t < 1) requestAnimationFrame(slideDropped);
            })(performance.now());

            liftDown(280, () => {
              // Settled — reparent every merged card back into the region's
              // scroll-outer at its final slot, restoring normal z-index layering.
              merged.cardIds.forEach(cid => {
                const p = targetByCardId.get(cid);
                const c = cards[cid];
                if (!p || !c) return;
                placeCardAt(c, p.left, p.top, p.rot ?? 0, p.zIndex, p.stackZ || 0);
              });
            }, liftTargets.length ? liftTargets : null, {
              wiggleXPx: attachWiggleXPx,
              settleProgressAt: 0.5,
              deferZIndex: true,
            });
          }
        }

        // ── Priority 2: Insertion drop into fan or row ────────────────────────
        else if (
          targetRegionId !== null &&
          droppedInsertRgn === targetRegionId &&
          droppedInsertIdx >= 0 &&
          (REGIONS[targetRegionId].type === 'row' || REGIONS[targetRegionId].type === 'fan')
        ) {
          const regionType    = REGIONS[targetRegionId].type;
          const isMultiCard   = droppedStackCards.length > 1;
          const isStackSplit  = regionType === 'fan' && isMultiCard;

          // A row/fan drop has no pile to clear, so the card needn't descend the
          // full pile-clearing dragLiftMax it was held at while dragging. Glide it
          // down to this modest approach height during the horizontal slide so the
          // final drop onto the slot is a short settle, not a tall plunge.
          const approachZ = cardHeightPx() * 0.25;

          if (isStackSplit) {
            const oldRegionId    = droppedStackCards[0].regionId;
            const droppedCardIds = new Set(droppedStackCards.map(c => c.id));
            const splitIds = splitStack(droppedStack.id);
            splitIds.forEach((sid, i) => {
              const arr      = regionState[targetRegionId].stackIds;
              const insertAt = Math.min(droppedInsertIdx + i, arr.length);
              arr.splice(insertAt, 0, sid);
              cards[stacks[sid].cardIds[0]].regionId = targetRegionId;
            });

            const allPositions = layoutFan(targetRegionId);
            allPositions
              .filter(p => !droppedCardIds.has(p.cardId))
              .forEach(p => animateCardTo(cards[p.cardId], p.left, p.top, p.rot, p.zIndex, 200, p.stackZ || 0));
            if (oldRegionId && oldRegionId !== targetRegionId) layoutRegion(oldRegionId);

            const posById  = new Map(allPositions.map(p => [p.cardId, p]));
            const fromPos  = droppedStackCards.map(c => ({
              left: parseFloat(c.liftEl.style.left),
              top:  parseFloat(c.liftEl.style.top),
            }));
            const slideDur   = scaleDuration(200);
            const slideStart = performance.now();
            const startLift  = droppedStackCards.map(c => c.liftPx);

            (function slideFrame(now) {
              const t  = Math.min((now - slideStart) / slideDur, 1);
              const ef = easeOut(t);
              droppedStackCards.forEach((c, idx) => {
                const myPos = posById.get(c.id);
                if (!myPos) return;
                const from = fromPos[idx];
                c.liftEl.style.left = (from.left + (myPos.left - from.left) * ef) + 'px';
                c.liftEl.style.top  = (from.top  + (myPos.top  - from.top)  * ef) + 'px';
                const glideZ = (myPos.stackZ ?? 0) + approachZ;
                c._setLiftVisuals(startLift[idx] + (glideZ - startLift[idx]) * ef);
              });
              if (t < 1) {
                card.layoutAnimId = requestAnimationFrame(slideFrame);
              } else {
                card.layoutAnimId = null;
                signalDrop(); // play the drop sound as the descent begins
                droppedStackCards.forEach(c => {
                  const myPos      = posById.get(c.id);
                  const stackZ     = myPos?.stackZ ?? 0;
                  const liftTarget = c.liftPx >= stackZ ? stackZ : 0;
                  c._animateLift(liftTarget, 200, easeIn, () => {
                    c.pileZ  = stackZ;
                    c.liftPx = 0;
                    c._setLiftVisuals(0);
                    c.liftEl.style.zIndex = nextTopZ();
                    if (myPos) placeCardAt(c, myPos.left, myPos.top, 0, myPos.zIndex, stackZ);
                  });
                });
              }
            })(performance.now());
          } else {
            let positions = insertStackAtIndex(droppedStack.id, targetRegionId, droppedInsertIdx);
            // For the browse fan, scroll to center the dropped card so it's clearly visible
            // even in a dense deck where the individual slot-shift would be imperceptible.
            if (targetRegionId === '_browse') {
              const scrolled = scrollStackToCenter(targetRegionId, droppedStack.id);
              if (scrolled) {
                updateSentinel(targetRegionId);
                updateScrollArrows(targetRegionId);
                positions = layoutRegion(targetRegionId, droppedStack.id) || positions;
              }
            }
            const myCardIdSet  = new Set(droppedStack.cardIds);
            const myPositions  = (positions || []).filter(p => myCardIdSet.has(p.cardId));

            if (myPositions.length > 0) {
              const slideDur   = scaleDuration(200);
              const slideStart = performance.now();
              const fromPos    = droppedStackCards.map(c => ({
                left: parseFloat(c.liftEl.style.left),
                top:  parseFloat(c.liftEl.style.top),
              }));
              const startLift  = droppedStackCards.map(c => c.liftPx);

              (function slideFrame(now) {
                const t  = Math.min((now - slideStart) / slideDur, 1);
                const ef = easeOut(t);
                myPositions.forEach((myPos, idx) => {
                  const c    = cards[myPos.cardId];
                  const from = fromPos[idx];
                  c.liftEl.style.left = (from.left + (myPos.left - from.left) * ef) + 'px';
                  c.liftEl.style.top  = (from.top  + (myPos.top  - from.top)  * ef) + 'px';
                  const glideZ = (myPos.stackZ ?? 0) + approachZ;
                  c._setLiftVisuals(startLift[idx] + (glideZ - startLift[idx]) * ef);
                });
                if (t < 1) {
                  card.layoutAnimId = requestAnimationFrame(slideFrame);
                } else {
                  card.layoutAnimId = null;
                  let done = 0;
                  signalDrop(); // play the drop sound as the descent begins
                  droppedStackCards.forEach((c, idx) => {
                    const myPos      = myPositions[idx];
                    const stackZ     = myPos?.stackZ ?? 0;
                    const liftTarget = c.liftPx >= stackZ ? stackZ : 0;
                    c._animateLift(liftTarget, 200, easeIn, () => {
                      c.pileZ  = stackZ;
                      c.liftPx = 0;
                      c._setLiftVisuals(0);
                      c.liftEl.style.zIndex = nextTopZ();
                      if (myPos) placeCardAt(c, myPos.left, myPos.top, 0, myPos.zIndex, stackZ);
                      done++;
                    });
                  });
                }
              })(performance.now());
            } else {
              const layerZ = layerZPx(cardHeightPx()) * (REGIONS[targetRegionId]?.layerIndex || 0);
              droppedStackCards.forEach(c => { c.pileZ = layerZ; });
              liftDown(280, null);
            }
          }

          if (onCardMove) {
            const c0 = droppedStackCards[0];
            // '_browse' is an engine-internal region ID; translate it to the real
            // game group so the backend callback can find it in game.groupById.
            let cbRegion = targetRegionId;
            let cbInsertIdx = droppedInsertIdx;
            if (targetRegionId === '_browse' && _browseGroupId) {
              cbRegion = _browseGroupId;
              // Map the visible browse slot to a backend stack index. insertStackAtIndex
              // has already placed the dragged stack at droppedInsertIdx, so read the
              // index from the *neighbour* it was inserted before — never the dragged
              // stack itself, whose dcStackIndex is its origin (the old bug that sent
              // the origin index back as the destination). MOVE_STACK deletes the stack
              // from its origin before inserting, so when the origin sits before the
              // neighbour the neighbour's index shifts down one — mirror that here.
              const draggedSid = droppedStack.id;
              const vis = (regionState['_browse']?.stackIds || []).filter(sid => sid !== draggedSid);
              const dcIndexOf = sid => _browseAllEngineStacks.find(x => x.engineStackId === sid)?.dcStackIndex;
              const origDc = dcIndexOf(draggedSid);
              if (droppedInsertIdx < vis.length) {
                const neighborDc = dcIndexOf(vis[droppedInsertIdx]);
                if (neighborDc != null) {
                  cbInsertIdx = (origDc != null && origDc < neighborDc) ? neighborDc - 1 : neighborDc;
                }
              } else if (vis.length) {
                const lastDc = dcIndexOf(vis[vis.length - 1]);
                if (lastDc != null) cbInsertIdx = (origDc != null && origDc < lastDc) ? lastDc : lastDc + 1;
              } else {
                cbInsertIdx = 0;
              }
            }
            onCardMove(c0.id, c0.prevPos._regionId, cbRegion, null, null, cbInsertIdx);
          }
        }

        // ── Priority 3: General region drop ──────────────────────────────────
        else {
          if (targetRegionId !== null) {
            const regionType   = REGIONS[targetRegionId].type;
            const oldRegionId  = cards[droppedStack.cardIds[0]].regionId;

            if (regionType === 'free') {
              if (oldRegionId !== targetRegionId) {
                if (oldRegionId) {
                  const arr = regionState[oldRegionId].stackIds;
                  const idx = arr.indexOf(droppedStack.id);
                  if (idx !== -1) arr.splice(idx, 1);
                  layoutRegion(oldRegionId);
                }
                droppedStackCards.forEach(c => { c.regionId = targetRegionId; });
                regionState[targetRegionId].stackIds.push(droppedStack.id);
              }
              const settleTargets = stackTargets(droppedStack, c => ({
                ...tiltSpacePosOf(c),
                rot: 0,
              }));
              liftDown(280, () => {
                settleTargets.forEach(pos => {
                  animateCardTo(pos.card, pos.left, pos.top, pos.rot, pos.zIndex, 180, pos.stackZ);
                });
              }, settleTargets);

            } else if (regionType === 'row') {
              moveStackToRegion(droppedStack.id, targetRegionId);
              const preRowPositions = layoutRow(targetRegionId);
              const droppedRowIdSet = new Set(droppedStackCards.map(c => c.id));
              const rowDropTargets = preRowPositions
                .filter(p => droppedRowIdSet.has(p.cardId))
                .map(p => ({ card: cards[p.cardId], stackZ: p.stackZ || 0, zIndex: p.zIndex }));
              liftDown(280, () => {
                layoutRegion(targetRegionId);
                if (oldRegionId && oldRegionId !== targetRegionId) layoutRegion(oldRegionId);
              }, rowDropTargets.length ? rowDropTargets : null);

            } else {
              const droppedCardIds = new Set(droppedStack.cardIds);
              const splitIds = splitStack(droppedStack.id);
              splitIds.forEach(sid => moveStackToRegion(sid, targetRegionId));

              // For the browse fan (appended to end), scroll to show the new card.
              if (targetRegionId === '_browse' && regionType === 'fan') {
                splitIds.forEach(sid => {
                  if (scrollStackToCenter(targetRegionId, sid)) {
                    updateSentinel(targetRegionId);
                    updateScrollArrows(targetRegionId);
                  }
                });
              }

              const prePositions = regionType === 'pile'
                ? layoutPile(targetRegionId)
                : layoutFan(targetRegionId);
              const dropTargets = prePositions
                .filter(p => droppedCardIds.has(p.cardId))
                .map(p => ({ card: cards[p.cardId], left: p.left, top: p.top, rot: 0, zIndex: p.zIndex, stackZ: p.stackZ || 0 }));

              if (regionType === 'pile') {
                const fromPos   = droppedStackCards.map(c => ({ id: c.id, left: parseFloat(c.liftEl.style.left) || 0, top: parseFloat(c.liftEl.style.top) || 0 }));
                const targetMap = new Map(dropTargets.map(t => [t.card.id, t]));
                dropTargets.forEach(t => { t.card.liftEl.style.zIndex = t.zIndex; });
                const slideStart  = performance.now();
                const slideDurMs  = scaleDuration(220);
                function slideFrame(now) {
                  const t = Math.min((now - slideStart) / slideDurMs, 1);
                  const ef = easeOut(t);
                  fromPos.forEach(f => {
                    const tgt = targetMap.get(f.id);
                    if (!tgt) return;
                    tgt.card.liftEl.style.left = (f.left + (tgt.left - f.left) * ef) + 'px';
                    tgt.card.liftEl.style.top  = (f.top  + (tgt.top  - f.top)  * ef) + 'px';
                  });
                  if (t < 1) {
                    requestAnimationFrame(slideFrame);
                  } else {
                    liftDown(250, () => {
                      layoutRegion(targetRegionId);
                      if (oldRegionId && oldRegionId !== targetRegionId) layoutRegion(oldRegionId);
                    }, dropTargets);
                  }
                }
                requestAnimationFrame(slideFrame);
              } else {
                liftDown(280, () => {
                  layoutRegion(targetRegionId);
                  if (oldRegionId && oldRegionId !== targetRegionId) layoutRegion(oldRegionId);
                }, dropTargets);
              }
            }

            if (onCardMove) {
              const c0 = droppedStackCards[0];
              // Update fracX/fracY to the actual drop position (as fractions of tilt
              // dimensions) so the server stores the correct position. Without this, the
              // stale pile-space value would cause a reconcile-triggered animateCardTo
              // to snap the card to the wrong location after the flip animation clears.
              if (_tiltEl) {
                const tiltW = parseFloat(_tiltEl.style.width)  || 1;
                const tiltH = parseFloat(_tiltEl.style.height) || 1;
                c0.fracX = (parseFloat(c0.liftEl.style.left) || 0) / tiltW;
                c0.fracY = (parseFloat(c0.liftEl.style.top)  || 0) / tiltH;
              }
              const cbRegion = (targetRegionId === '_browse' && _browseGroupId) ? _browseGroupId : targetRegionId;
              onCardMove(c0.id, oldRegionId, cbRegion, c0.fracX, c0.fracY);
            }
          } else {
            // Miss — slide back to origin while staying raised, then lift down.
            const snapTargets  = stackTargets(droppedStack, c => ({
              left: c.prevPos.left,
              top:  c.prevPos.top,
              rot:  c.prevPos.rot,
            }));
            const snapByCardId = new Map(snapTargets.map(t => [t.card.id, t]));
            const slideDur     = scaleDuration(220);
            const slideStart   = performance.now();
            const fromPos      = droppedStackCards.map(c => ({
              left: parseFloat(c.liftEl.style.left),
              top:  parseFloat(c.liftEl.style.top),
            }));
            (function slideFrame(now) {
              const t  = Math.min((now - slideStart) / slideDur, 1);
              const ef = easeOut(t);
              droppedStackCards.forEach((c, idx) => {
                const from   = fromPos[idx];
                const target = snapByCardId.get(c.id);
                if (!target) return;
                c.liftEl.style.left = (from.left + (target.left - from.left) * ef) + 'px';
                c.liftEl.style.top  = (from.top  + (target.top  - from.top)  * ef) + 'px';
              });
              if (t < 1) {
                requestAnimationFrame(slideFrame);
              } else {
                const homeRegionId = cards[droppedStack.cardIds[0]]?.regionId;
                liftDown(250, () => { if (homeRegionId) layoutRegion(homeRegionId); }, snapTargets);
              }
            })(performance.now());
          }
        }
      }

      isDragging      = false;
      _isDragging     = false;
      dragStack       = null;
      dragStackCards  = [];
      hoverAttachStackId = null;
      hoverAttachSide    = null;

      setDropGlow(null);
      _overlay.setInsertProbe(null);
      if (currentInsertRegion) {
        hideInsertionIndicator();
        currentInsertIdx    = -1;
        currentInsertRegion = null;
      }

      // Click (minimal movement) → open card menu
      const clickDx = e.clientX - startX;
      const clickDy = e.clientY - startY;
      const threshold = Math.min(window.innerWidth, window.innerHeight) * 0.005;
      if (Math.hypot(clickDx, clickDy) < threshold && onCardClick) {
        onCardClick(card.id, e.clientX, e.clientY);
      }

    });
  }

  // ── Per-stack attach drop-zone overlays ─────────────────────────────────────
  function updateStackZoneOverlays({ visible, excludeStackId = null }) {
    const attachTargetRegions = Object.entries(REGIONS)
      .filter(([, r]) => r.type === 'free' || r.type === 'row')
      .map(([id]) => id);

    const cw = cardWidthPx();
    const ch = cardHeightPx();

    const liveStackIds = new Set();
    attachTargetRegions.forEach(rid => {
      (regionState[rid]?.stackIds || []).forEach(sid => liveStackIds.add(sid));
    });

    for (const [sid, els] of stackZoneEls) {
      if (!liveStackIds.has(sid)) {
        els.left.remove();
        els.right.remove();
        stackZoneEls.delete(sid);
      }
    }

    liveStackIds.forEach(sid => {
      const stack = stacks[sid];
      if (!stack) return;

      if (!stackZoneEls.has(sid)) {
        const leftEl  = document.createElement('div');
        leftEl.className  = 'dnc3d-stack-zone dnc3d-stack-zone-left';
        const rightEl = document.createElement('div');
        rightEl.className = 'dnc3d-stack-zone dnc3d-stack-zone-right';
        _tiltEl.appendChild(leftEl);
        _tiltEl.appendChild(rightEl);
        stackZoneEls.set(sid, { left: leftEl, right: rightEl });
      }

      const { left: leftEl, right: rightEl } = stackZoneEls.get(sid);
      const shouldShow = visible && sid !== excludeStackId;

      if (shouldShow) {
        const { leftCardId, rightCardId } = stackBaseCardIds(stack);
        const leftBaseCard  = cards[leftCardId];
        const rightBaseCard = cards[rightCardId];
        if (!leftBaseCard || !rightBaseCard) {
          leftEl.classList.remove('dnc3d-is-visible');
          rightEl.classList.remove('dnc3d-is-visible');
          return;
        }

        const leftPos  = tiltSpacePosOf(leftBaseCard);
        const rightPos = tiltSpacePosOf(rightBaseCard);

        leftEl.style.left   = leftPos.left + 'px';
        leftEl.style.top    = leftPos.top  + 'px';
        leftEl.style.width  = (cw / 2) + 'px';
        leftEl.style.height = ch + 'px';

        rightEl.style.left   = (rightPos.left + cw / 2) + 'px';
        rightEl.style.top    = rightPos.top  + 'px';
        rightEl.style.width  = (cw / 2) + 'px';
        rightEl.style.height = ch + 'px';

        leftEl.classList.add('dnc3d-is-visible');
        rightEl.classList.add('dnc3d-is-visible');
      } else {
        leftEl.classList.remove('dnc3d-is-visible');
        rightEl.classList.remove('dnc3d-is-visible');
      }
    });
  }

  // ── Engine init — returns a cleanup function ───────────────────────────────
  // initData: { cards: cardDescriptors[], assignments: { [groupId]: stackDescriptors[] } }
  // When omitted, falls back to 20-card demo mode.
  function init(tiltEl, initialDeg, initData = {}) {
    _tiltEl     = tiltEl;
    _currentDeg = initialDeg;
    initLayout(tiltEl);

    const tableSurface = document.createElement('div');
    tableSurface.className = 'dnc3d-table-surface';
    tableSurface.style.zIndex = '0';
    // Mirror current tilt geometry so it renders on the same tilted plane
    tableSurface.style.height    = tiltEl.style.height;
    tableSurface.style.width     = tiltEl.style.width;
    tableSurface.style.left      = tiltEl.style.left;
    tableSurface.style.top       = '0px';
    tableSurface.style.transform = tiltEl.style.transform;
    if (_tableBackgroundUrl) {
      tableSurface.style.background = `url(${_tableBackgroundUrl}) center / cover no-repeat`;
    }
    // Insert before tiltEl so it's behind cards in DOM order
    tiltEl.parentElement.insertBefore(tableSurface, tiltEl);
    _tableSurfaceEl = tableSurface;

    // Screen-space overlay for targeting icons and card arrows. Mounted into the
    // stage (not the tilt) so it isn't subject to the 3D rotation; it positions
    // its elements from each card's live on-screen rect every frame.
    _overlay.mount(tiltEl.parentElement);


    Object.entries(REGIONS).forEach(([id, r]) => {
      if (r.type !== 'row' && r.type !== 'fan') return;
      const el = document.createElement('div');
      el.className = 'dnc3d-region-scroll-outer';
      if (r.layerIndex > 0) el.style.transform = `translateZ(${layerZPx(cardHeightPx()) * r.layerIndex}px)`;
      tiltEl.appendChild(el);
      scrollOuterEls[id] = el;
      setScrollOuter(id, el);
    });
    updateScrollOuters();

    const insertIndicatorEl = document.createElement('div');
    insertIndicatorEl.className = 'dnc3d-insert-indicator';
    tiltEl.appendChild(insertIndicatorEl);
    setIndicatorEl(insertIndicatorEl);
    _insertIndicatorEl = insertIndicatorEl;

    // The icon is a transparent positioning container holding two layered
    // children: the label box (behind) and the circle (in front, so it covers
    // the label's inner edge and the two read as one continuous shape).
    _attachTargetIconEl = document.createElement('div');
    _attachTargetIconEl.className = 'dnc3d-attach-icon';
    const attachLabelEl = document.createElement('div');
    attachLabelEl.className = 'dnc3d-attach-label';
    attachLabelEl.innerHTML =
      `<div class="dnc3d-attach-label-head">Attach to</div>` +
      `<div class="dnc3d-attach-label-name"></div>` +
      `<div class="dnc3d-attach-label-side"></div>`;
    const attachCircleEl = document.createElement('div');
    attachCircleEl.className = 'dnc3d-attach-icon-circle';
    attachCircleEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    _attachTargetIconEl.appendChild(attachLabelEl);
    _attachTargetIconEl.appendChild(attachCircleEl);
    tiltEl.appendChild(_attachTargetIconEl);

    if (initData.cards) {
      initData.cards.forEach(descriptor => createCard(tiltEl, descriptor));
    } else {
      for (let i = 0; i < 20; i++) createCard(tiltEl, { id: i });
    }

    Object.entries(REGIONS).forEach(([id, r]) => {
      // Region background fill. A separate element carrying the region's
      // background color and game-def `style`, positioned just BELOW the cards
      // of this region's layer so it paints behind them (never over them).
      // The outline below stays on top for the border, label, menu icons and
      // drop glow. For elevated regions the fill sits coplanar with the outline
      // (appended first, so the outline's border paints over the fill panel).
      const fill = document.createElement('div');
      fill.className = 'dnc3d-region-fill';
      const fillZ = r.layerIndex > 0 ? layerZPx(cardHeightPx()) * r.layerIndex - 1 : 0;
      fill.style.transform = `translateZ(${fillZ}px)`;
      if (r.layerIndex > 0) fill.classList.add('dnc3d-region-elevated');
      if (r.backgroundColor) fill.style.backgroundColor = r.backgroundColor;
      applyRegionStyle(fill, r.style);
      fill.style.left   = r.left   + '%';
      fill.style.top    = r.top    + '%';
      fill.style.width  = r.width  + '%';
      fill.style.height = r.height + '%';
      tiltEl.appendChild(fill);
      regionFillEls[id] = fill;

      const outline = document.createElement('div');
      outline.className = 'dnc3d-region-outline';
      if (r.layerIndex > 0) {
        outline.classList.add('dnc3d-region-elevated');
        outline.style.transform = `translateZ(${layerZPx(cardHeightPx()) * r.layerIndex - 1}px)`;
      }
      outline.style.left   = r.left   + '%';
      outline.style.top    = r.top    + '%';
      outline.style.width  = r.width  + '%';
      outline.style.height = r.height + '%';
      const showIcons = !!(onGroupBrowse || onGroupMenu) && r.showMenu !== false;
      if (showIcons) {
        const icons = document.createElement('div');
        icons.className = 'dnc3d-region-icons';
        if (onGroupBrowse) {
          const eyeBtn = document.createElement('button');
          eyeBtn.className = 'dnc3d-region-icon-btn';
          eyeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
          eyeBtn.addEventListener('click', e => { e.stopPropagation(); onGroupBrowse(id); });
          icons.appendChild(eyeBtn);
        }
        if (onGroupMenu) {
          const menuBtn = document.createElement('button');
          menuBtn.className = 'dnc3d-region-icon-btn';
          menuBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
          menuBtn.addEventListener('click', e => { e.stopPropagation(); onGroupMenu(id, e.clientX, e.clientY); });
          icons.appendChild(menuBtn);
        }
        outline.appendChild(icons);
        regionIconEls[id] = icons;
      }
      const label = document.createElement('span');
      label.className = 'dnc3d-region-label';
      label.textContent = r.label || id;
      outline.appendChild(label);
      regionLabelEls[id] = label;
      if (r.type === 'pile') {
        // Appended to tiltEl (not the outline) so it shares the cards' 3D space
        // and isn't clipped by the outline; positioned + raised in Z on hover.
        const count = document.createElement('span');
        count.className = 'dnc3d-region-count';
        count.textContent = '0';
        tiltEl.appendChild(count);
        regionCountEls[id] = count;
      }
      tiltEl.appendChild(outline);
      regionOutlineEls[id] = outline;

      if (r.type !== 'row' && r.type !== 'fan') return;
      const el = document.createElement('div');
      el.className = 'dnc3d-region-scroll-sentinel';
      if (r.direction === 'vertical') el.classList.add('dnc3d-region-scroll-sentinel--vertical');
      const spacer = document.createElement('div');
      spacer.className = 'dnc3d-region-scroll-spacer';
      el.appendChild(spacer);
      outline.appendChild(el);
      const s = { el, spacer, _syncing: false };
      sentinelEls[id] = s;
      el.addEventListener('scroll', () => {
        if (s._syncing) { s._syncing = false; return; }
        regionState[id].scrollOffset = r.direction === 'vertical' ? el.scrollTop : el.scrollLeft;
        layoutRegion(id);
      });

      // ── Scroll arrow overlays ────────────────────────────────────────────
      const vert = r.direction === 'vertical';
      function makeChevronSvg(dir) {
        const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '32');
        svg.setAttribute('height', '32');
        svg.style.cssText = 'fill:none;stroke:rgba(255,255,255,0.95);stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const ds = { left:'M15 18l-6-6 6-6', right:'M9 18l6-6-6-6', up:'M18 15l-6-6-6 6', down:'M6 9l6 6 6-6' };
        path.setAttribute('d', ds[dir]);
        svg.appendChild(path);
        return svg;
      }
      const startArrow = document.createElement('div');
      startArrow.className = 'dnc3d-region-scroll-arrow dnc3d-region-scroll-arrow--start' + (vert ? ' dnc3d-scroll-vertical' : '');
      startArrow.appendChild(makeChevronSvg(vert ? 'up' : 'left'));
      outline.appendChild(startArrow);

      const endArrow = document.createElement('div');
      endArrow.className = 'dnc3d-region-scroll-arrow dnc3d-region-scroll-arrow--end' + (vert ? ' dnc3d-scroll-vertical' : '');
      endArrow.appendChild(makeChevronSvg(vert ? 'down' : 'right'));
      outline.appendChild(endArrow);

      arrowEls[id] = { start: startArrow, end: endArrow };
    });

    setAfterLayoutHook(id => {
      updateSentinel(id);
      updateScrollArrows(id);
      // Keep a hovered pile's count badge live when its contents change without
      // pointer movement (e.g. discarding the top card via a hotkey).
      if (id === hoveredCountRegion) updateCountBadge(id);
    });

    // ── Arrow hover-scroll and touch-scroll ─────────────────────────────────
    let arrowScrollRaf  = null;
    let arrowScrollId   = null;
    let arrowScrollDir  = null; // 'start' | 'end'

    function doArrowScrollStep() {
      if (!arrowScrollId || !arrowScrollDir) return;
      const r    = REGIONS[arrowScrollId];
      const rp   = regionPx(arrowScrollId);
      const isV  = r.direction === 'vertical';
      const total    = scrollTotalExtent(arrowScrollId);
      const maxScroll = Math.max(0, total - (isV ? rp.h : rp.w));
      const speed    = (isV ? rp.h : rp.w) * 0.5 / 60; // 50% region width per second at 60fps
      const delta    = (arrowScrollDir === 'end' ? 1 : -1) * speed;
      const newOff   = Math.min(Math.max((regionState[arrowScrollId].scrollOffset || 0) + delta, 0), maxScroll);
      if (newOff !== regionState[arrowScrollId].scrollOffset) {
        regionState[arrowScrollId].scrollOffset = newOff;
        const sv = sentinelEls[arrowScrollId];
        if (sv) { sv._syncing = true; if (isV) sv.el.scrollTop = newOff; else sv.el.scrollLeft = newOff; }
        layoutRegion(arrowScrollId);
      }
      arrowScrollRaf = requestAnimationFrame(doArrowScrollStep);
    }

    function startArrowScrollLoop(regionId, dir) {
      arrowScrollId  = regionId;
      arrowScrollDir = dir;
      if (!arrowScrollRaf) arrowScrollRaf = requestAnimationFrame(doArrowScrollStep);
    }

    function stopArrowScrollLoop() {
      if (arrowScrollRaf) { cancelAnimationFrame(arrowScrollRaf); arrowScrollRaf = null; }
      arrowScrollId  = null;
      arrowScrollDir = null;
    }

    function tapArrowScroll(regionId, dir) {
      const r    = REGIONS[regionId];
      const rp   = regionPx(regionId);
      const isV  = r.direction === 'vertical';
      const total    = scrollTotalExtent(regionId);
      const maxScroll = Math.max(0, total - (isV ? rp.h : rp.w));
      const amount   = (isV ? rp.h : rp.w) * 0.5;
      const delta    = (dir === 'end' ? 1 : -1) * amount;
      const newOff   = Math.min(Math.max((regionState[regionId].scrollOffset || 0) + delta, 0), maxScroll);
      regionState[regionId].scrollOffset = newOff;
      const sv = sentinelEls[regionId];
      if (sv) { sv._syncing = true; if (isV) sv.el.scrollTop = newOff; else sv.el.scrollLeft = newOff; }
      layoutRegion(regionId);
    }

    Object.entries(arrowEls).forEach(([regionId, arrows]) => {
      [['start', arrows.start], ['end', arrows.end]].forEach(([dir, arrowEl]) => {
        arrowEl.addEventListener('pointerenter', () => startArrowScrollLoop(regionId, dir));
        arrowEl.addEventListener('pointerleave', () => stopArrowScrollLoop());
        arrowEl.addEventListener('touchstart', (e) => { e.preventDefault(); tapArrowScroll(regionId, dir); }, { passive: false });
        arrowEl.addEventListener('click', () => tapArrowScroll(regionId, dir));
      });
    });

    // ── Region icon hover ────────────────────────────────────────────────────
    let hoveredIconRegion = null;
    function setRegionHoverState(id, hovered) {
      if (regionIconEls[id])  regionIconEls[id].style.opacity  = hovered ? '1' : '0';
      if (regionLabelEls[id]) regionLabelEls[id].style.opacity = hovered ? '0' : '';
    }
    function updateIconHover(clientX, clientY) {
      let newHovered = null;
      for (const id of Object.keys(regionIconEls)) {
        // Only reveal icons when the pointer is near the region title (the
        // vertical label hugging the region's left edge), not anywhere inside
        // the region. Use the label's own rect, padded so it's easy to hit.
        const rect = regionLabelEls[id]?.getBoundingClientRect();
        if (!rect) continue;
        const padX = rect.width  * 1.5 + 12;
        const padY = rect.height * 0.25 + 12;
        if (clientX >= rect.left - padX && clientX <= rect.right + padX &&
            clientY >= rect.top  - padY && clientY <= rect.bottom + padY) {
          newHovered = id;
          break;
        }
      }
      if (newHovered !== hoveredIconRegion) {
        if (hoveredIconRegion) setRegionHoverState(hoveredIconRegion, false);
        hoveredIconRegion = newHovered;
        if (hoveredIconRegion) setRegionHoverState(hoveredIconRegion, true);
      }
    }
    // ── Pile card-count badge hover ───────────────────────────────────────────
    // Total cards across every stack in a pile region.
    function pileCardCount(id) {
      const sids = regionState[id]?.stackIds || [];
      let n = 0;
      for (const sid of sids) n += (stacks[sid]?.cardIds.length || 0);
      return n;
    }
    let hoveredCountRegion = null;
    // Refresh the count text + badge placement for a pile region. Safe to call any
    // time the pile's contents change (e.g. a card discarded via hotkey, with no
    // pointer movement) — invoked both on hover and from the after-layout hook.
    function updateCountBadge(id) {
      const el = regionCountEls[id];
      if (!el) return;
      const cnt = pileCardCount(id);
      el.textContent = String(cnt);
      // Anchor: midpoint of the bottom edge of the pile's BOTTOM card, mirroring
      // layoutPile's box (LEFT_BUFFER inset, vertically centered).
      const rp = regionPx(id);
      const cw = cardWidthPx(), ch = cardHeightPx();
      const leftBuffer = cw * 0.15;
      const ax = rp.x + leftBuffer + (rp.w - leftBuffer) / 2;
      const ay = rp.y + (rp.h + ch) / 2;
      const lz = layerZPx(ch) * (REGIONS[id].layerIndex || 0);
      const zBottom = BASE_LIFT + lz; // bottom card's Z
      // Raise the badge above the pile's top card so cards don't occlude it,
      // but re-project so it still lands on the bottom card's bottom-edge point:
      // project the anchor to screen at the bottom card's Z, then find the
      // tilt-space coords at the raised Z that map to that same screen point.
      const capped = Math.min(Math.max(cnt - 1, 0), MAX_PILE_VISUAL_DEPTH - 1);
      const zTop = zBottom + capped * pileStackZPx(ch) + Math.max(2, pileStackZPx(ch));
      const scr  = tableToScreen(ax, ay, zBottom, _tiltEl, _currentDeg);
      const proj = screenToTableAtZ(scr.x, scr.y, zTop, _tiltEl, _currentDeg);
      el.style.left = proj.x + 'px';
      el.style.top  = proj.y + 'px';
      el.style.transform = `translate(-50%, -100%) translateZ(${zTop}px)`;
    }
    function updateCountHover(clientX, clientY) {
      // hoverRegionAt honors 3D layer stacking, so we get the region the pointer
      // is actually over (not one occluded by an elevated panel).
      const { region } = hoverRegionAt(clientX, clientY);
      const newHovered = (region && REGIONS[region]?.type === 'pile') ? region : null;
      if (newHovered !== hoveredCountRegion) {
        if (hoveredCountRegion && regionCountEls[hoveredCountRegion]) regionCountEls[hoveredCountRegion].style.opacity = '0';
        hoveredCountRegion = newHovered;
      }
      if (hoveredCountRegion && regionCountEls[hoveredCountRegion]) {
        updateCountBadge(hoveredCountRegion);
        regionCountEls[hoveredCountRegion].style.opacity = '1';
      }
    }
    function clearCountHover() {
      if (hoveredCountRegion && regionCountEls[hoveredCountRegion]) regionCountEls[hoveredCountRegion].style.opacity = '0';
      hoveredCountRegion = null;
    }
    function onTiltPointerMove(e) {
      _lastPointerX = e.clientX;
      _lastPointerY = e.clientY;
      updateIconHover(e.clientX, e.clientY);
      updateCountHover(e.clientX, e.clientY);
    }
    function onTiltPointerLeave() {
      if (hoveredIconRegion) { setRegionHoverState(hoveredIconRegion, false); hoveredIconRegion = null; }
      clearCountHover();
    }
    tiltEl.addEventListener('pointermove',  onTiltPointerMove);
    tiltEl.addEventListener('pointerleave', onTiltPointerLeave);

    // ── Wheel scroll ────────────────────────────────────────────────────────
    function onWheel(e) {
      for (const [id] of Object.entries(sentinelEls)) {
        const rect = regionOutlineEls[id].getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right ||
            e.clientY < rect.top  || e.clientY > rect.bottom) continue;
        const rp         = regionPx(id);
        const vert       = REGIONS[id].direction === 'vertical';
        const total      = scrollTotalExtent(id);
        const maxScroll  = Math.max(0, total - (vert ? rp.h : rp.w));
        if (maxScroll === 0) continue;
        const delta  = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaMode === 2 ? e.deltaY * 300 : e.deltaY;
        const newOff = Math.min(Math.max((regionState[id].scrollOffset || 0) + delta, 0), maxScroll);
        regionState[id].scrollOffset = newOff;
        const s = sentinelEls[id];
        s._syncing = true;
        if (vert) s.el.scrollTop = newOff; else s.el.scrollLeft = newOff;
        layoutRegion(id);
        e.preventDefault();
        break;
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false });

    // While an overlay suppresses hover, the table's own pointermove no longer
    // fires (the overlay is the event target), so _lastPointerX/Y would go stale
    // and reconcileHover on release would light the wrong card. A window-level
    // listener still receives the bubbled pointermove, keeping coords current so
    // release re-derives hover at the cursor's real position. No-op otherwise.
    function onWindowPointerMove(e) {
      if (!_hoverSuppressed) return;
      _lastPointerX = e.clientX;
      _lastPointerY = e.clientY;
    }
    window.addEventListener('pointermove', onWindowPointerMove);

    // ── Initial card placement ────────────────────────────────────────────────
    if (initData.assignments) {
      // Real mode: place cards from adapter assignments
      Object.entries(initData.assignments).forEach(([groupId, stackDescriptors]) => {
        if (!regionState[groupId]) return;
        stackDescriptors.forEach(({ cardIds: dcIds, attachmentDirections = [], fracX, fracY }) => {
          if (!dcIds || !dcIds.length) return;
          const baseCard = cards[dcIds[0]];
          if (!baseCard) return;
          dcIds.slice(1).forEach((attachId, idx) => {
            const attachCard = cards[attachId];
            if (!attachCard) return;
            attachStack(attachCard.stackId, baseCard.stackId, attachmentDirections[idx] || 'right');
          });
          moveStackToRegion(baseCard.stackId, groupId);
          if (fracX != null) baseCard.fracX = fracX;
          if (fracY != null) baseCard.fracY = fracY;
        });
      });
      Object.keys(REGIONS).forEach(regionId => {
        const type = REGIONS[regionId].type;
        if (type === 'free') {
          const tiltW = parseFloat(tiltEl.style.width);
          const tiltH = parseFloat(tiltEl.style.height);
          const layerOffset = layerZPx(cardHeightPx()) * (REGIONS[regionId].layerIndex || 0);
          regionState[regionId].stackIds.forEach(sid => {
            const stack = stacks[sid];
            const baseCard = cards[stack.cardIds[0]];
            if (!baseCard) return;
            // Place the whole stack (base + attachments) so attachments inherit the
            // region's layer Z; otherwise they'd render at Z=0, behind an elevated
            // region's opaque panel.
            const anchorLeft = (baseCard.fracX || 0) * tiltW;
            const anchorTop  = (baseCard.fracY || 0) * tiltH;
            stackPositionsAtAnchor(stack, anchorLeft, anchorTop, baseCard.id + 1, layerOffset)
              .forEach(pos => {
                const c = cards[pos.cardId];
                if (!c) return;
                // Store each card's own frac position (base + attachment offset) so a
                // later resize repositions attachments correctly, not just the base.
                c.fracX = pos.left / tiltW;
                c.fracY = pos.top  / tiltH;
                placeCardAt(c, pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ);
              });
          });
        } else if (type === 'fan') {
          layoutFan(regionId).forEach(pos => placeCardAt(cards[pos.cardId], pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ || 0));
        } else if (type === 'row') {
          layoutRow(regionId).forEach(pos => placeCardAt(cards[pos.cardId], pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ || 0));
        } else if (type === 'pile') {
          layoutPile(regionId).forEach(pos => placeCardAt(cards[pos.cardId], pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ || 0));
        }
      });
    } else {
      // Demo mode: hard-coded sandbox layout
      const demoAssignments = { hand: [0,1,2,3,4,5,6], draw: [7,8,9,10], table: [11,12,13], score: [14,15,16,17,18,19] };
      Object.entries(demoAssignments).forEach(([regionId, ids]) => {
        ids.forEach(id => {
          regionState[regionId].stackIds.push(cards[id].stackId);
          cards[id].regionId = regionId;
        });
      });
      layoutFan('hand').forEach(pos  => placeCardAt(cards[pos.cardId], pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ || 0));
      layoutPile('draw').forEach(pos => placeCardAt(cards[pos.cardId], pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ || 0));
      layoutRow('score').forEach(pos  => placeCardAt(cards[pos.cardId], pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ || 0));
      const rp = regionPx('table');
      const cw = cardWidthPx(), ch = cardHeightPx();
      const tableStackIds = regionState['table'].stackIds;
      tableStackIds.forEach((sid, idx) => {
        const id = stacks[sid].cardIds[0];
        const x  = rp.x + cw * 0.8 + idx * (rp.w - cw * 2.6) / Math.max(1, tableStackIds.length - 1);
        const y  = rp.y + (rp.h - ch) / 2;
        placeCardAt(cards[id], x, y, 0, id + 1);
        cards[id].fracX = x / parseFloat(tiltEl.style.width);
        cards[id].fracY = y / parseFloat(tiltEl.style.height);
      });
    }

    cards.forEach(c => {
      if (c) c.liftEl.style.transform = `translateZ(${BASE_LIFT + c.pileZ}px)`;
    });

    // Cards that didn't land in any rendered region (they live in a group this
    // player doesn't show, e.g. another player's hand) are parked at the origin
    // and hidden. reconcile reveals them if/when they move into a rendered region.
    cards.forEach(c => { if (c && !c.regionId) c.liftEl.style.display = 'none'; });

    Object.keys(sentinelEls).forEach(updateSentinel);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return function cleanup() {
      tiltEl.removeEventListener('pointermove',  onTiltPointerMove);
      tiltEl.removeEventListener('pointerleave', onTiltPointerLeave);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onWindowPointerMove);
      if (_tableSurfaceEl) { _tableSurfaceEl.parentElement?.removeChild(_tableSurfaceEl); _tableSurfaceEl = null; }
      _overlay.unmount();
      while (tiltEl.firstChild) tiltEl.removeChild(tiltEl.firstChild);
      cards.length = 0;
      Object.keys(stacks).forEach(k => delete stacks[k]);
      Object.keys(regionState).forEach(k => {
        regionState[k].stackIds = [];
        regionState[k].scrollOffset = 0;
      });
      Object.keys(scrollOuterEls).forEach(k => delete scrollOuterEls[k]);
      Object.keys(sentinelEls).forEach(k => delete sentinelEls[k]);
      _attachTargetIconEl = null;
      Object.keys(regionOutlineEls).forEach(k => delete regionOutlineEls[k]);
      Object.keys(regionIconEls).forEach(k => delete regionIconEls[k]);
      Object.keys(regionLabelEls).forEach(k => delete regionLabelEls[k]);
      Object.keys(regionCountEls).forEach(k => delete regionCountEls[k]);
      stackZoneEls.clear();
      clearScrollOuters();
      setAfterLayoutHook(null);
      setIndicatorEl(null);
      _tiltEl = null;
    };
  }

  // Re-sync a home region's stack ORDER to the backend group order. The per-card
  // loop in reconcile handles membership (a card moving to a different group) but
  // not a pure reorder within a group — e.g. a shuffle, which permutes
  // group.stackIds without moving any card to another group. Without this the
  // engine keeps its stale order, so a pile renders the wrong card on top and
  // draws appear to originate from the middle of the deck until a full re-init
  // (page refresh).
  function syncRegionOrders(game, idMap) {
    Object.keys(regionState).forEach(regionId => {
      if (regionId === '_browse' || regionId === _browseGroupId) return;
      const region = REGIONS[regionId];
      const desired = desiredRegionOrder(regionId, game, idMap);
      if (!desired) return;

      const current = regionState[regionId].stackIds;
      // Membership still settling (a stack here isn't in the backend order, or
      // vice-versa) — skip; a later reconcile syncs once membership matches.
      if (desired.length !== current.length) return;
      if (desired.every((sid, i) => sid === current[i])) return; // already in order

      // A shuffle riffle owns this region's cards — keep the data in sync but
      // don't lay out (the riffle snaps everything into place when it finishes).
      // This also prevents an instant snap from yanking the riffle's animated
      // cards mid-flight when the reordered state delta arrives.
      if (_shufflingRegions.has(regionId)) {
        regionState[regionId].stackIds = desired;
        return;
      }

      // Don't disturb an in-progress drag/flip/lift in this region.
      const busy = current.some(sid => {
        const c = cards[stacks[sid]?.cardIds?.[0]];
        return c && (c.cardEl._animating || c.liftPx > 1);
      });
      if (busy) return;

      regionState[regionId].stackIds = desired;
      // Pile reorders snap instantly — the old animated path slid cards through
      // each other in Z (ugly). A shuffle's visual is the dedicated riffle; any
      // other pile reorder (or a riffle that finished before its order arrived)
      // applies invisibly. Rows/fans keep their animated reorder slide.
      layoutRegion(regionId, null, region.type === 'pile');
    });
  }

  // Play a fixed, cosmetic riffle for a pile group that was just shuffled, then
  // snap the cards into their real (already-synced) order instantly. The
  // animation is identical every time and carries NO information about the true
  // permutation — a keen-eyed player can't track a card through it, because the
  // real reorder happens only as an instant snap once the riffle ends.
  // Returns true if a riffle actually ran (so the caller can play a sound).
  // onStart: optional callback fired the moment the riffle begins (use it to play
  // the shuffle sound, which needs to come from the React layer).
  function animatePileShuffle(groupId, onStart = null) {
    const regionId = groupId;
    const region   = REGIONS[regionId];
    if (!_tiltEl || !region || region.type !== 'pile') return false;
    if (_shufflingRegions.has(regionId)) return false; // already riffling

    const stackIds = regionState[regionId].stackIds;
    if (!stackIds || stackIds.length < 2) return false;

    // If cards are still spawn-animating (e.g. shuffleOnLoad), defer until they
    // land. Thread onStart through so the sound still plays when the retry fires.
    const spawning = stackIds.some(sid => cards[stacks[sid]?.cardIds?.[0]]?._spawning);
    if (spawning) {
      const retryMs = scaleDuration(600);
      setTimeout(() => { if (!_shufflingRegions.has(regionId)) animatePileShuffle(groupId, onStart); }, retryMs);
      return 'deferred';
    }

    // Don't fight an in-progress drag/flip/lift in this region.
    const busy = stackIds.some(sid => {
      const c = cards[stacks[sid]?.cardIds?.[0]];
      return c && (c.cardEl._animating || c.liftPx > 1);
    });
    if (busy) return false;

    // Animate the WHOLE pile so every card visibly participates — otherwise the
    // cards beneath the animated set just sit there as a static pile. (Cap only
    // pathologically large piles; deep cards overlap, so the cap isn't visible.)
    // Order is irrelevant here — the animation is cosmetic.
    const MAX_SHUFFLE_CARDS = 60;
    const animIds = stackIds.length > MAX_SHUFFLE_CARDS
      ? stackIds.slice(stackIds.length - MAX_SHUFFLE_CARDS)
      : stackIds.slice();
    const animCards = animIds
      .map(sid => cards[stacks[sid]?.cardIds?.[0]])
      .filter(Boolean);
    if (animCards.length < 2) return false;
    const K = animCards.length;

    _shufflingRegions.add(regionId);
    if (onStart) onStart(); // e.g. play the shuffle sound from React

    // Cancel any in-flight per-card layout tween (e.g. a reorder snap that beat
    // us here) and reparent into tilt space so the spread escapes the region's
    // scroll-outer clipping.
    animCards.forEach(c => {
      if (c.layoutAnimId) { cancelAnimationFrame(c.layoutAnimId); c.layoutAnimId = null; }
      moveCardToTilt(c);
    });

    // Pile centre anchor (tilt-space), matching layoutPile.
    const rp = regionPx(regionId);
    const cw = cardWidthPx(), ch = cardHeightPx();
    const LEFT_BUFFER = cw * 0.15;
    const cx = rp.x + LEFT_BUFFER + (rp.w - LEFT_BUFFER - cw) / 2;
    const cy = rp.y + (rp.h - ch) / 2;

    const stepZ = pileStackZPx(ch);                        // depth per card (= pile thickness/card)
    const lz    = layerZPx(ch) * (region.layerIndex || 0); // region's resting depth offset
    const sepX  = cw * 0.75;                               // horizontal separation of the two halves

    // Contiguous split: the BOTTOM half of the pile and the TOP half. animCards
    // runs bottom → top, so [0, mid) is the bottom half and [mid, K) the top half.
    const mid        = Math.floor(K / 2);
    const bottomHalf = animCards.slice(0, mid);
    const topHalf    = animCards.slice(mid);

    // Cosmetic reassembled order (bottom → top): interleave the two halves so the
    // deck visibly riffles together. Slot j → resting depth lz + j*stepZ, so the
    // rebuilt deck reaches exactly the original deck height. Order is purely
    // cosmetic; the real (shuffled) order is snapped in instantly at the end.
    const finalSeq = [];
    for (let b = 0, t = 0; b < bottomHalf.length || t < topHalf.length; b++, t++) {
      if (b < bottomHalf.length) finalSeq.push(bottomHalf[b]);
      if (t < topHalf.length)    finalSeq.push(topHalf[t]);
    }
    const finalSlot = new Map(finalSeq.map((c, j) => [c, j]));

    // Raise the animated cards above the resting pile for the duration.
    const baseZ = nextTopZ();
    animCards.forEach((c, i) => { c.liftEl.style.zIndex = baseZ + i; });

    // Per-card start (resting), separated, and reassembled targets. Each half
    // keeps its own thickness (depth runs from liftBase by stepZ per card), so a
    // separated half is never taller than the slice of pile it came from.
    const startPos = animCards.map(c => tiltSpacePosOf(c));
    const startZ   = animCards.map(c => c.pileZ || 0);
    // Separation: slide the two halves apart horizontally (bottom → right, top →
    // left) at the same table-Y. Each half is rendered as its OWN clean stack
    // (depth = localIdx*stepZ) so both show equal thickness — otherwise the depth
    // cap hides the top half's thickness and the split looks lopsided. The bottom
    // half's resting depth already equals localIdx*stepZ, so it doesn't move
    // vertically; the top half fans its depth out to match.
    const sepInfo  = animCards.map((c, i) => {
      const localIdx = i < mid ? i : i - mid;
      const capped   = Math.min(localIdx, MAX_PILE_VISUAL_DEPTH - 1);
      return {
        left: i < mid ? cx + sepX : cx - sepX,
        top:  startPos[i].top,
        z:    lz + capped * stepZ,
      };
    });
    const finalInfo = animCards.map((c) => {
      const j = finalSlot.get(c);
      // Match layoutPile's depth cap so the rebuilt deck ends at exactly the
      // resting height — otherwise the final instant snap jumps the height in one
      // frame. j (uncapped) still drives the bottom-up stagger.
      const cappedZ = lz + Math.min(j, MAX_PILE_VISUAL_DEPTH - 1) * stepZ;
      return { left: cx, top: cy, z: cappedZ, j };
    });

    const place = (c, left, top, z) => {
      c.liftEl.style.left = left + 'px';
      c.liftEl.style.top  = top + 'px';
      c.liftEl.style.transform = `translateZ(${BASE_LIFT + z}px)`;
    };

    const finish = () => {
      _shufflingRegions.delete(regionId);
      // Apply the real order instantly (no tween). layoutRegion's instant path
      // reparents the cards back into the scroll-outer and places them exactly.
      layoutRegion(regionId, null, true);
    };

    // Phase 2 — riffle together. The two halves slide back toward centre and
    // interleave; the deck rebuilds from the bottom up (low slots settle first,
    // so the bottom cards slide horizontally home and the rest riffle up to the
    // original height). Re-layer by final slot so the rebuilt deck stacks right.
    const startMerge = () => {
      animCards.forEach(c => { c.liftEl.style.zIndex = baseZ + finalSlot.get(c); });
      const m0      = performance.now();
      const mergeMs = scaleDuration(340);
      const STAGGER = 0.5;
      const from    = animCards.map(c => tiltSpacePosOf(c));
      const fromZ   = sepInfo.map(s => s.z);
      (function mergeFrame(now) {
        const t = Math.min((now - m0) / mergeMs, 1);
        animCards.forEach((c, i) => {
          if (c.liftEl.parentElement !== _tiltEl) return;
          const fin   = finalInfo[i];
          const delay = (K > 1 ? (fin.j / (K - 1)) : 0) * STAGGER; // bottom first
          const local = Math.min(Math.max((t - delay) / (1 - STAGGER), 0), 1);
          const e = easeOut(local);
          const f = from[i], fz = fromZ[i];
          place(c, f.left + (fin.left - f.left) * e, f.top + (fin.top - f.top) * e, fz + (fin.z - fz) * e);
        });
        if (t < 1) requestAnimationFrame(mergeFrame);
        else finish();
      })(m0);
    };

    // Phase 1 — separate. The top half lifts off and moves left + down beside the
    // bottom half, which slides right; each half keeps its own height (depth).
    const s0      = performance.now();
    const splitMs = scaleDuration(280);
    (function splitFrame(now) {
      const t = Math.min((now - s0) / splitMs, 1);
      const e = easeOut(t);
      animCards.forEach((c, i) => {
        if (c.liftEl.parentElement !== _tiltEl) return;
        const f = startPos[i], fz = startZ[i], s = sepInfo[i];
        place(c, f.left + (s.left - f.left) * e, f.top + (s.top - f.top) * e, fz + (s.z - fz) * e);
      });
      if (t < 1) requestAnimationFrame(splitFrame);
      else startMerge();
    })(s0);

    return true;
  }

  // Animate a whole free-region stack (base + attachments) to a backend anchor
  // (fractional tilt-space position). The backend stores only one origin per
  // stack, so attachment positions are derived from stackCardOffsets rather than
  // placed individually — otherwise they collapse onto the base. The stack's
  // resting Z is the region's layer offset, so an elevated region's opaque panel
  // doesn't hide its cards.
  function animateFreeStackToFrac(stack, fracX, fracY, instant = false) {
    if (!_tiltEl || !stack) return;
    const baseCard = cards[stack.cardIds[0]];
    if (!baseCard) return;
    const tiltW = parseFloat(_tiltEl.style.width);
    const tiltH = parseFloat(_tiltEl.style.height);
    const layerOffset = layerZPx(cardHeightPx()) * (REGIONS[baseCard.regionId]?.layerIndex || 0);
    const positions = stackPositionsAtAnchor(stack, fracX * tiltW, fracY * tiltH, baseCard.id + 1, layerOffset);
    const liftPx = stackHopHeight(positions);
    positions.forEach(pos => {
        const c = cards[pos.cardId];
        if (!c || c.cardEl._animating) return;
        c.fracX = pos.left / tiltW;
        c.fracY = pos.top  / tiltH;
        // instant: a freshly-revealed card has no on-screen origin to slide from,
        // so place it at its target position then spawn-drop it in from above.
        if (instant) { placeCardAt(c, pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ); moveCardToTilt(c); spawnDropCard(c, () => moveCardFromTilt(c)); }
        else animateCardArc(c, pos.left, pos.top, pos.rot, pos.zIndex, 360, pos.stackZ, liftPx);
      });
  }

  // Peak hop height for a stack flight: keyed to the farthest-travelling member
  // (e.g. an attachment flying in from across the table while the base card stays
  // put) so the whole stack rises and falls together. Longer moves get a higher
  // arc, capped so a big slide across the table never looks cartoonish; tiny
  // nudges keep a small but visible hop.
  function stackHopHeight(positions) {
    const travel = positions.reduce((max, pos) => {
      const c = cards[pos.cardId];
      if (!c || c.cardEl._animating) return max;
      const from = tiltSpacePosOf(c);
      return Math.max(max, Math.hypot(pos.left - from.left, pos.top - from.top));
    }, 0);
    return Math.min(cardHeightPx() * 0.5, Math.max(cardHeightPx() * 0.18, travel * 0.28));
  }

  // Flies a stack from its current on-screen position into its layout slot in a
  // row/fan/pile region with a lift-travel-drop arc. The caller must have already
  // reparented the stack into the tilt plane (moveStackToTilt) — the flight runs
  // there so the destination scroll-outer's overflow clipping can't cut it off —
  // and have laid out the region's other cards (layoutRegion with this stack
  // excluded). Each card lands back into the scroll-outer when its arc completes.
  function flyStackToRegionSlot(stack, regionId) {
    const type     = REGIONS[regionId]?.type;
    const layoutFn = type === 'row' ? layoutRow : type === 'fan' ? layoutFan : type === 'pile' ? layoutPile : null;
    if (!layoutFn || !stack) return;
    const idSet     = new Set(stack.cardIds);
    const positions = layoutFn(regionId).filter(p => idSet.has(p.cardId));
    if (!positions.length) return;
    const liftPx = stackHopHeight(positions);
    positions.forEach(pos => {
      const c = cards[pos.cardId];
      // A mid-flip card is owned by its flip animation, whose onComplete lands it.
      if (!c || c.cardEl._animating) return;
      animateCardArc(c, pos.left, pos.top, pos.rot, pos.zIndex, 360, pos.stackZ || 0, liftPx,
        { inTiltPlane: true, onComplete: () => moveCardFromTilt(c) });
    });
  }

  // Engine-stack order a region should have, derived from the backend group
  // order. Only stacks actually resident in the region count (membership is
  // reconciled separately). Piles are reversed to match the adapter: the game's
  // top card (stackIds[0]) maps to the engine's top (last) slot. Returns null
  // for free/unknown regions or when the group isn't in the game state.
  function desiredRegionOrder(regionId, game, idMap) {
    const region = REGIONS[regionId];
    const group  = game.groupById?.[regionId];
    if (!region || region.type === 'free' || !group) return null;
    const desired = [];
    (group.stackIds || []).forEach(dcStackId => {
      const firstDcCard = game.stackById?.[dcStackId]?.cardIds?.[0];
      if (firstDcCard === undefined) return;
      const idx = idMap.get(firstDcCard);
      if (idx === undefined) return;
      const c = cards[idx];
      if (!c || c.regionId !== regionId) return;
      desired.push(c.stackId);
    });
    if (region.type === 'pile') desired.reverse();
    return desired;
  }

  // Aligns regionState[regionId].stackIds with the backend group order, data
  // only (no layout). Used when a stack arrives in a region: moveStackToRegion
  // appends, but the backend may have inserted it elsewhere — syncing before
  // computing the arrival layout makes the stack fly to its real slot and leaves
  // nothing for the follow-up syncRegionOrders pass to reorder (which would
  // otherwise yank the mid-flight cards with a flat re-layout).
  function syncRegionOrderData(regionId, game, idMap) {
    const desired = desiredRegionOrder(regionId, game, idMap);
    if (desired && desired.length === regionState[regionId].stackIds.length) {
      regionState[regionId].stackIds = desired;
    }
  }

  // Animates a recomposed stack into its resting slot/offsets — attachments fan
  // out to their offset positions, the base settles in place. Cards must already
  // be in the tilt plane for row/fan/pile regions (moveStackToTilt no-ops when
  // they are); free-region cards always live there.
  function settleStack(stack, dcStack, game, idMap) {
    const base     = cards[stack.cardIds[0]];
    const regionId = base.regionId;
    if (!regionId) return;
    if (REGIONS[regionId]?.type === 'free') {
      const rawL = dcStack?.left, rawT = dcStack?.top;
      animateFreeStackToFrac(stack,
        rawL != null ? dcPosFrac(rawL, regionId, false) : (base.fracX ?? 0),
        rawT != null ? dcPosFrac(rawT, regionId, true)  : (base.fracY ?? 0));
    } else {
      moveStackToTilt(stack);
      syncRegionOrderData(regionId, game, idMap);
      layoutRegion(regionId, stack.id);
      flyStackToRegionSlot(stack, regionId);
    }
  }

  // ── Stack composition sync ─────────────────────────────────────────────────
  // Mirrors backend stack membership into engine stacks. The per-card loop in
  // reconcile handles group membership but not which stack a card belongs to:
  // another player attaching a card merges two backend stacks — without this the
  // attachment renders as a separate stack next to its target — and a detach
  // splits one, without which the whole old stack would move when only the
  // detached card did.
  function syncStackCompositions(game, idMap) {
    Object.values(game.stackById || {}).forEach(dcStack => {
      // [dcCardId, engineCardIdx] pairs for this backend stack, in stack order.
      const members = (dcStack.cardIds || [])
        .map(dcId => [dcId, idMap.get(dcId)])
        .filter(([, i]) => i !== undefined && cards[i]);
      if (!members.length) return;
      const desired = members.map(([, i]) => i);
      const dirOf   = dcId => (game.cardById?.[dcId]?.attachmentDirection === 'left' ? 'left' : 'right');

      // Cards in the browse fan are managed by the browse system.
      if (desired.some(i => cards[i].regionId === '_browse')) return;

      const base      = cards[desired[0]];
      const current   = stacks[base.stackId]?.cardIds || [];
      const sameCards = current.length === desired.length && current.every((cid, k) => cid === desired[k]);
      const sameDirs  = members.slice(1).every(([dcId, i]) => cards[i].attachmentDirection === dirOf(dcId));
      if (sameCards && sameDirs) return;

      // Don't restructure stacks involved in a drag or mid-flight arc — the next
      // reconcile applies the change once they settle.
      const involvedSids = new Set(desired.map(i => cards[i].stackId));
      let busy = false;
      involvedSids.forEach(sid => (stacks[sid]?.cardIds || []).forEach(cid => {
        if (cards[cid]?.liftPx > 1) busy = true;
      }));
      if (busy) return;

      // Settle into the base's region only when that matches the backend group;
      // otherwise leave the recomposed stack where it is and let the group-move
      // pass below fly (or hide) it as one unit.
      const expectedGroup = game.cardById?.[dcStack.cardIds[0]]?.groupId;

      if (sameCards) {
        // Only attachment directions changed — update and re-settle in place.
        members.slice(1).forEach(([dcId, i]) => { cards[i].attachmentDirection = dirOf(dcId); });
        if (base.regionId === expectedGroup) settleStack(stacks[base.stackId], dcStack, game, idMap);
        return;
      }

      // Convert members to tilt space while their regionId still names the
      // region their coords are relative to (it changes below). Hidden cards
      // have stale coords; they're re-anchored to the base after the rebuild.
      desired.forEach(i => moveCardToTilt(cards[i]));

      // Split every involved engine stack into singletons. Cards expelled from
      // the desired stack stay behind as their own stacks, re-inserted into
      // their region so their own backend stack's iteration (or the group-move
      // pass) picks them up from there.
      const affectedRegions = new Set();
      involvedSids.forEach(sid => {
        const st = stacks[sid];
        if (!st) return;
        const rid = cards[st.cardIds[0]].regionId;
        if (rid) affectedRegions.add(rid);
        splitStack(sid).forEach(nsid => {
          const cid = stacks[nsid].cardIds[0];
          if (desired.includes(cid)) {
            // Re-stacked into the rebuilt stack below — drop the interim singleton.
            destroyStack(nsid);
          } else if (cards[cid].regionId) {
            regionState[cards[cid].regionId].stackIds.push(nsid);
          }
        });
      });

      // Rebuild the merged stack in the base card's region.
      const newStack = createStack(desired);
      members.slice(1).forEach(([dcId, i]) => { cards[i].attachmentDirection = dirOf(dcId); });
      const baseRegion  = base.regionId;
      const priorHidden = desired.map(i => !cards[i].regionId);
      desired.forEach(i => { cards[i].regionId = baseRegion; });
      if (baseRegion) {
        regionState[baseRegion].stackIds.push(newStack.id);
        // Newly revealed members have no on-screen origin — start them at the
        // base card so they emerge from the stack they joined.
        const basePos = tiltSpacePosOf(base);
        desired.forEach((i, k) => {
          if (!priorHidden[k]) return;
          cards[i].liftEl.style.left = basePos.left + 'px';
          cards[i].liftEl.style.top  = basePos.top + 'px';
        });
        setStackHidden(newStack, false);
        if (baseRegion === expectedGroup) settleStack(newStack, dcStack, game, idMap);
      } else {
        setStackHidden(newStack, true);
      }

      // Close the gap in every region that lost a stack.
      affectedRegions.forEach(rid => {
        if (rid === baseRegion || REGIONS[rid]?.type === 'free') return;
        syncRegionOrderData(rid, game, idMap);
        layoutRegion(rid);
      });
    });
  }

  // Show/hide every card in a stack at once (attachments included). Used by
  // reconcile when a stack crosses between a region this client renders and one
  // it doesn't (e.g. another player's hand <-> the shared table).
  function setStackHidden(stack, hidden) {
    if (!stack) return;
    stack.cardIds.forEach(cid => {
      const c = cards[cid];
      if (c?.liftEl) c.liftEl.style.display = hidden ? 'none' : '';
    });
  }

  // Returns a Promise that resolves once the card's visible-face image has
  // finished loading (or immediately if there is no image / it is already cached).
  // A 3-second safety timeout prevents the spawn animation from being blocked
  // forever if the image fetch fails silently.
  function waitForCardImage(card) {
    const showingBack = ((((card.cardEl._angle % 360) + 360) % 360) === 180);
    const faceEl = showingBack
      ? card.cardEl.querySelector('.dnc3d-card-back')
      : card.frontEl;
    const bgImg = faceEl?.style.backgroundImage;
    const match = bgImg?.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    if (!match) return Promise.resolve();
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      const img = new Image();
      img.onload = finish;
      img.onerror = finish;
      img.src = match[1];
      if (img.complete) finish();
      setTimeout(finish, 3000);
    });
  }

  // Animates a freshly-revealed card dropping in from above the table. The card
  // must already be placed at its final X/Y AND reparented into the tilt plane
  // (not a scroll-outer) before this is called — the elevated Z would otherwise
  // be clipped by the scroll-outer's overflow, the same reason drag uses
  // moveCardToTilt. onLand is called after the drop sound (use it to reparent
  // the card back into the scroll-outer via moveCardFromTilt).
  // Fade-in and drop run concurrently: opacity reaches 1 at the midpoint of the
  // drop so the card is fully visible for the second half of the fall.
  function spawnDropCard(card, onLand) {
    if (card.layoutAnimId) { cancelAnimationFrame(card.layoutAnimId); card.layoutAnimId = null; }
    card._cancelLift();
    const SPAWN_HEIGHT = card._dragLiftMax() * 2.5;
    const DROP_DUR_MS  = scaleDuration(500);

    card._spawnCanceled = false;
    card._spawning      = true;
    card.liftPx = SPAWN_HEIGHT;
    card.liftEl.style.opacity = '0';
    card._setLiftVisuals(SPAWN_HEIGHT);

    waitForCardImage(card).then(() => {
      if (card._spawnCanceled) { card._spawning = false; return; }
      if (!card.liftEl.parentElement) return;
      const startTime = performance.now();
      function frame(now) {
        const t = Math.min((now - startTime) / DROP_DUR_MS, 1);
        // Opacity: easeOut over the first half of the drop (t 0→0.5 → opacity 0→1).
        const tFade = Math.min(t * 2, 1);
        card.liftEl.style.opacity = tFade < 1 ? (tFade * (2 - tFade)).toFixed(3) : '';
        // Z: easeIn drop over the full duration (gravity feel).
        card._setLiftVisuals(SPAWN_HEIGHT * (1 - t * t));
        // Suppress the drop shadow during spawn — multiple cards falling into the same
        // pile position would stack their shadows into a black blob. The opacity fade
        // already conveys the "arriving from above" feel.
        card.cardEl.style.boxShadow = 'none';
        if (t < 1) {
          card.layoutAnimId = requestAnimationFrame(frame);
        } else {
          card.layoutAnimId = null;
          card.liftEl.style.opacity = '';
          card._setLiftVisuals(0);
          card._spawning = false;
          playDropSound();
          if (onLand) onLand();
        }
      }
      card.layoutAnimId = requestAnimationFrame(frame);
    });
  }

  // Places each card in a stack at its layout slot in a structured region, then
  // applies a spawn-drop entrance animation. Used for cards that were previously
  // in an unrendered group and are now becoming visible for the first time.
  function spawnDropStack(stack, regionId) {
    if (!stack) return;
    const type     = REGIONS[regionId]?.type;
    const layoutFn = type === 'row' ? layoutRow : type === 'fan' ? layoutFan
                   : type === 'pile' ? layoutPile : null;
    if (!layoutFn) return;
    const idSet     = new Set(stack.cardIds);
    const positions = layoutFn(regionId).filter(p => idSet.has(p.cardId));
    positions.forEach(pos => {
      const c = cards[pos.cardId];
      if (!c || c.cardEl._animating) return;
      placeCardAt(c, pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ || 0);
      // Reparent into the tilt plane so the elevated card escapes the
      // scroll-outer's clipping — same technique as drag (moveStackToTilt).
      moveCardToTilt(c);
      spawnDropCard(c, () => moveCardFromTilt(c));
    });
  }

  // ── Reconcile engine visual state with current Redux game state ───────────
  // Called on every game state change. Applies targeted updates (rotation, flip,
  // group/position) without tearing down and rebuilding the whole engine.
  // idMap: Map<dcCardId, dnc3dIndex>
  function reconcile(game, idMap) {
    if (!game || !idMap || !cards.length) return;
    const cardById  = game.cardById  || {};
    const stackById = game.stackById || {};

    // Keep the browse fan in sync with the live group before the per-card loop so
    // cards dropped into / added to the browsed group are already in '_browse'
    // (and excluded from the group-move path below).
    refreshBrowseFromGame(game, idMap);

    // Mirror backend stack membership (attach/detach by another player) before
    // the per-card loop, so group moves and layouts operate on correctly
    // composed stacks.
    syncStackCompositions(game, idMap);

    Object.entries(cardById).forEach(([dcCardId, dcCard]) => {
      const i = idMap.get(dcCardId);
      if (i === undefined) return;
      const card = cards[i];
      if (!card || !card.cardEl) return;

      // 1. Game rotation (exhaustion, rotation token, etc.)
      // Per-player rotation takes precedence over the global rotation value,
      // mirroring the useCardRotation hook used by the 2D engine.
      const rotByPlayer = dcCard.rotationByPlayer;
      const newGameRot = (rotByPlayer && _playerN !== null && rotByPlayer[_playerN] !== undefined)
        ? rotByPlayer[_playerN]
        : (dcCard.rotation || 0);
      if (card.cardEl._gameRotation !== newGameRot) {
        card.cardEl._gameRotation = newGameRot;
        if (!card.cardEl._animating) {
          const totalRot = (card.cardEl._layoutRotation || 0) + newGameRot;
          if (card.cardEl._rotTransId) clearTimeout(card.cardEl._rotTransId);
          const rotDurMs = scaleDuration(300);
          card.cardEl.style.transition = `transform ${rotDurMs}ms ease`;
          card.cardEl.style.transform =
            cardTransform(card.cardEl._angle, totalRot);
          applyTokenHostRotation(card);
          card.cardEl._rotTransId = setTimeout(() => {
            card.cardEl.style.transition = '';
            card.cardEl._rotTransId = null;
          }, rotDurMs + 10);
        }
      }

      // 2. Flip — currentSide drives the expected rotateY angle, except the
      // observing player peeking at a face-down card sees its front (side A).
      const peeking           = !!(_playerN && dcCard.peeking && dcCard.peeking[_playerN]);
      const expectedSide      = peeking ? 'A' : (dcCard.currentSide || 'A');
      // Normalize into [0,360) so a card flipped the negative direction
      // (_angle e.g. -180) is still correctly detected as showing side B.
      const currentVisualSide = ((((card.cardEl._angle % 360) + 360) % 360) === 180) ? 'B' : 'A';
      // A change in the peeking bit is a "peek" reveal/hide, not a physical flip,
      // so snap the card to its side instantly rather than animating. This also
      // covers closing browse, where the top card's peeking is cleared by a
      // separate dispatch that lands after closeBrowse has already run.
      const peekingChanged = peeking !== (card.cardEl._peeking || false);
      card.cardEl._peeking = peeking;
      // A parked card lives in a region this client doesn't render (regionId
      // null, hidden). Keep its orientation in sync silently — snap, never
      // animate — so it shows the right side the instant it's revealed.
      const parked = !card.regionId;
      if (currentVisualSide !== expectedSide && (peekingChanged || parked) && !card.cardEl._animating) {
        _snapCardToExpectedSide(card, dcCard);
      } else if (currentVisualSide !== expectedSide && !card.cardEl._animating) {
        card.cardEl._animating = true;
        playFlipSound(); // debounced — one sound even when many cards flip at once
        const startAngle = card.cardEl._angle;
        card.cardEl._angle += 180;
        if (card.regionId === '_browse') {
          // Card flipping inside the browse fan (e.g. dropped face-down into a
          // face-up browse). refreshBrowseFromGame may have just started a layout
          // animation on this card — cancel it so it doesn't fight the flip (the
          // symptom being the card vanishing mid-flip then sliding in from the
          // region edge). Normalize to tilt space, then slide to the fan slot
          // while flipping: drop-flip style if still elevated from the drag,
          // otherwise a rise-fall flip from the browse layer height.
          if (card.layoutAnimId) { cancelAnimationFrame(card.layoutAnimId); card.layoutAnimId = null; }
          const wasElevated = card.liftPx > 1;
          const startLiftPx = wasElevated ? card.liftPx : 0;
          card._cancelLift();
          moveCardToTilt(card);

          const fromLeft = parseFloat(card.liftEl.style.left) || 0;
          const fromTop  = parseFloat(card.liftEl.style.top)  || 0;
          // The browse scroll-outer is itself translated in Z (its layerIndex).
          // While the card flips it lives in the tilt plane — not inside the
          // scroll-outer — so its resting translateZ must include BOTH the
          // scroll-outer's layer Z and the card's own pile Z, or it would jump in
          // depth when reparented back into the scroll-outer on completion.
          const layerZ = layerZPx(cardHeightPx()) * (REGIONS['_browse']?.layerIndex || 0);
          let restStackZ      = layerZ;
          let slideTargetLeft = fromLeft, slideTargetTop = fromTop;
          const myPos = layoutFan('_browse').find(p => p.cardId === card.id);
          if (myPos) { slideTargetLeft = myPos.left; slideTargetTop = myPos.top; restStackZ = myPos.stackZ ?? layerZ; }
          const flipRestZ = layerZ + restStackZ; // tilt-relative resting depth
          // Regular (non-elevated) flips rise from and settle at that depth so the
          // card doesn't dip toward the table plane and bounce back.
          const startRestPx = wasElevated ? 0 : flipRestZ;

          if (Math.abs(slideTargetLeft - fromLeft) > 1 || Math.abs(slideTargetTop - fromTop) > 1) {
            const slideDurMs = scaleDuration(wasElevated ? 220 : (GROW + FLIP - 2 * OVERLAP));
            const slideStart = performance.now();
            (function slideXY(now) {
              const t = Math.min((now - slideStart) / slideDurMs, 1);
              const e = easeOut(t);
              card.liftEl.style.left = (fromLeft + (slideTargetLeft - fromLeft) * e) + 'px';
              card.liftEl.style.top  = (fromTop  + (slideTargetTop  - fromTop)  * e) + 'px';
              if (t < 1) requestAnimationFrame(slideXY);
            })(performance.now());
          }

          animateFlip(card.cardEl, card.liftEl, startAngle, () => {
            card.liftPx = 0;
            // pileZ holds only the card's own stack Z; the scroll-outer contributes
            // its layer Z once the card is reparented back into it below.
            card.pileZ  = restStackZ;
            card._setLiftVisuals(0);
            moveCardFromTilt(card);
            const positions = layoutRegion('_browse');
            const mp = positions?.find(p => p.cardId === card.id);
            if (mp) card.liftEl.style.zIndex = mp.zIndex;
          }, startLiftPx, flipRestZ, startRestPx);
        } else if (card.liftPx > 1) {
          // Card is still elevated from a drag-drop. Cancel the descent and do a
          // drop-flip: rotate while hovering, then descend as part of the flip.
          if (card.layoutAnimId) { cancelAnimationFrame(card.layoutAnimId); card.layoutAnimId = null; }
          const liftPx     = card.liftPx;
          const regionType = REGIONS[card.regionId]?.type;
          card._cancelLift();

          // Concurrent X/Y slide to the server-computed target position.
          // animateFlip owns liftEl.style.transform and cardEl.style.transform,
          // so sliding liftEl.style.left/top here is safe (no shared CSS properties).
          const fromLeft = parseFloat(card.liftEl.style.left) || 0;
          const fromTop  = parseFloat(card.liftEl.style.top)  || 0;
          let slideTargetLeft = null, slideTargetTop = null;
          // The translateZ the card should settle at — its top-of-stack height in
          // the destination region. The flip descends straight to this instead of
          // dropping to the table (z=0) and bouncing back up via a follow-up layout.
          let endStackZ = layerZPx(cardHeightPx()) * (REGIONS[card.regionId]?.layerIndex || 0);

          if (regionType === 'free') {
            // Free regions store position as fractions in dcStack.left/top.
            const dcStack = stackById[dcCard.stackId];
            if (dcStack?.left != null && _tiltEl) {
              const tiltW = parseFloat(_tiltEl.style.width)  || 1;
              const tiltH = parseFloat(_tiltEl.style.height) || 1;
              card.fracX = dcPosFrac(dcStack.left, card.regionId, false);
              card.fracY = dcPosFrac(dcStack.top,  card.regionId, true);
              slideTargetLeft = card.fracX * tiltW;
              slideTargetTop  = card.fracY * tiltH;
            }
          } else if (regionType) {
            // Row/fan/pile regions: compute target from the layout engine.
            // The card is already in regionState (moveStackToRegion ran in the drop handler).
            const layoutFn = regionType === 'row' ? layoutRow : regionType === 'fan' ? layoutFan : layoutPile;
            const positions = layoutFn(card.regionId);
            const myPos = positions.find(p => p.cardId === card.id);
            if (myPos) { slideTargetLeft = myPos.left; slideTargetTop = myPos.top; endStackZ = myPos.stackZ ?? endStackZ; }
          }

          if (slideTargetLeft != null && (Math.abs(slideTargetLeft - fromLeft) > 1 || Math.abs(slideTargetTop - fromTop) > 1)) {
            const slideDurMs = scaleDuration(220);
            const slideStart = performance.now();
            (function slideXY(now) {
              const t = Math.min((now - slideStart) / slideDurMs, 1);
              const e = easeOut(t);
              card.liftEl.style.left = (fromLeft + (slideTargetLeft - fromLeft) * e) + 'px';
              card.liftEl.style.top  = (fromTop  + (slideTargetTop  - fromTop)  * e) + 'px';
              if (t < 1) requestAnimationFrame(slideXY);
            })(performance.now());
          }

          animateFlip(card.cardEl, card.liftEl, startAngle, () => {
            card.liftPx = 0;
            card.pileZ  = endStackZ;
            card._setLiftVisuals(0);
            moveCardFromTilt(card);
            if (regionType === 'free' && _tiltEl) {
              card.fracX = (parseFloat(card.liftEl.style.left) || 0) / parseFloat(_tiltEl.style.width);
              card.fracY = (parseFloat(card.liftEl.style.top)  || 0) / parseFloat(_tiltEl.style.height);
            } else if (regionType) {
              // Set the landed card's final z-index immediately (see groupMove
              // note below) so it doesn't briefly paint behind its neighbours.
              const positions = layoutRegion(card.regionId);
              const myPos = positions?.find(p => p.cardId === card.id);
              if (myPos) card.liftEl.style.zIndex = myPos.zIndex;
            }
          }, liftPx, endStackZ);
        } else {
          // Card is not elevated from a drag. Two cases:
          //  (a) flip in place (same group) — rotate where it sits.
          //  (b) flip + group move (e.g. drawing a card) — lift off, fly to the
          //      destination's resting slot while turning over, then drop.
          const destGroupId = dcCard.groupId;
          const groupMove = destGroupId && card.regionId !== destGroupId && regionState[destGroupId];

          if (groupMove) {
            // Resting Z the card sits at now (e.g. top of its source pile) — the
            // rise-fall arc starts here so the card lifts off the top, not the base.
            const startRestPx = card.pileZ || 0;
            // Convert to tilt space using the OLD region origin, then move the
            // card's engine state into the destination so we can find its slot.
            moveCardToTilt(card);
            const fromLeft    = parseFloat(card.liftEl.style.left) || 0;
            const fromTop     = parseFloat(card.liftEl.style.top)  || 0;
            const oldRegionId = card.regionId;
            moveStackToRegion(card.stackId, destGroupId);
            // Match the backend's ordering before computing slots, so the stack
            // flies to its real slot rather than the appended end (e.g. undoing a
            // shuffle-into-deck returns the card to its original row position).
            syncRegionOrderData(destGroupId, game, idMap);
            const destType = REGIONS[destGroupId]?.type;

            // Center the destination slot before computing the flight target so the
            // card lands inside the visible region rather than out in the clipped
            // overflow. layoutRegion (excluding the flyer) slides the existing cards
            // into the scrolled layout while the card flies in.
            if (scrollStackToCenter(destGroupId, card.stackId)) layoutRegion(destGroupId, card.stackId);

            let slideTargetLeft = fromLeft, slideTargetTop = fromTop;
            let endStackZ = layerZPx(cardHeightPx()) * (REGIONS[destGroupId]?.layerIndex || 0);
            if (destType === 'free') {
              const dcStack = stackById[dcCard.stackId];
              if (dcStack?.left != null && _tiltEl) {
                const tiltW = parseFloat(_tiltEl.style.width)  || 1;
                const tiltH = parseFloat(_tiltEl.style.height) || 1;
                card.fracX = dcPosFrac(dcStack.left, destGroupId, false);
                card.fracY = dcPosFrac(dcStack.top,  destGroupId, true);
                slideTargetLeft = card.fracX * tiltW;
                slideTargetTop  = card.fracY * tiltH;
              }
            } else if (destType) {
              const layoutFn = destType === 'row' ? layoutRow : destType === 'fan' ? layoutFan : layoutPile;
              const myPos = layoutFn(destGroupId).find(p => p.cardId === card.id);
              if (myPos) { slideTargetLeft = myPos.left; slideTargetTop = myPos.top; endStackZ = myPos.stackZ ?? endStackZ; }
            }

            // Flip direction follows horizontal travel: a card moving right turns
            // the default way (+180); a card moving left turns the other way (-180)
            // so the flip reads as "toward" the destination. Re-derive _angle from
            // the chosen direction (the shared +=180 above assumed +1).
            const flipDir = slideTargetLeft < fromLeft - 1 ? -1 : 1;
            card.cardEl._angle = startAngle + flipDir * 180;

            // Slide over the rise+turn phases (ending when the flip's descent
            // begins) so the card arrives as it finishes turning, then the flip's
            // SHRINK phase drops it straight down into place. GROW + FLIP - 2*OVERLAP
            // mirrors animateFlip's t3 (the moment the descent starts).
            if (Math.abs(slideTargetLeft - fromLeft) > 1 || Math.abs(slideTargetTop - fromTop) > 1) {
              const slideDurMs = scaleDuration(GROW + FLIP - 2 * OVERLAP);
              const slideStart = performance.now();
              (function slideXY(now) {
                const t = Math.min((now - slideStart) / slideDurMs, 1);
                const e = easeOut(t);
                card.liftEl.style.left = (fromLeft + (slideTargetLeft - fromLeft) * e) + 'px';
                card.liftEl.style.top  = (fromTop  + (slideTargetTop  - fromTop)  * e) + 'px';
                if (t < 1) requestAnimationFrame(slideXY);
              })(performance.now());
            }

            animateFlip(card.cardEl, card.liftEl, startAngle, () => {
              card.liftPx = 0;
              card.pileZ  = endStackZ;
              card._setLiftVisuals(0);
              moveCardFromTilt(card);
              if (destType === 'free' && _tiltEl) {
                card.fracX = (parseFloat(card.liftEl.style.left) || 0) / parseFloat(_tiltEl.style.width);
                card.fracY = (parseFloat(card.liftEl.style.top)  || 0) / parseFloat(_tiltEl.style.height);
              } else if (destType) {
                // Assign the landed card's final z-index now. layoutRegion's
                // animateCardTo would otherwise only set it when its 300ms
                // animation ends, leaving the card painted behind its new
                // neighbours (with a stale pile z-index) until it snaps forward.
                const positions = layoutRegion(destGroupId);
                const myPos = positions?.find(p => p.cardId === card.id);
                if (myPos) card.liftEl.style.zIndex = myPos.zIndex;
              }
            }, 0, endStackZ, startRestPx, flipDir);

            if (oldRegionId && oldRegionId !== destGroupId) layoutRegion(oldRegionId);
          } else {
            // In-place flip: rise from and settle back to the card's own resting
            // height so a card on top of a pile doesn't sink to the pile base.
            const restPx = card.pileZ || 0;
            moveCardToTilt(card);
            animateFlip(card.cardEl, card.liftEl, startAngle, () => moveCardFromTilt(card), 0, restPx, restPx);
          }
        }
      }

      // 3. Per-card face dimensions (update when side changes)
      const currentFace = dcCard.sides?.[dcCard.currentSide] || {};
      const newFaceW    = currentFace.width  || null;
      const newFaceH    = currentFace.height || null;
      if (card.faceW !== newFaceW || card.faceH !== newFaceH) {
        card.faceW = newFaceW;
        card.faceH = newFaceH;
        applyCardDims(card);
      }

      // 3b. borderColor halo (set/cleared by automation, players, etc.)
      const newBorderColor = dcCard.borderColor || null;
      if (card.borderColor !== newBorderColor) {
        applyBorderGlow(card, newBorderColor);
      }

      // 3c. Ability affordance: the current face's ability can change (flip, or
      // automation adding/removing one). Re-sync the bolt's visibility.
      const newHasAbility = !!_playerN && currentFace.ability != null;
      if (card.hasAbility !== newHasAbility) {
        card.hasAbility = newHasAbility;
        syncAbilityBtn(card);
      }

      // 4. Group / visibility change. A card may move by another player between a
      // region this client renders and one it doesn't (e.g. another player moving
      // a card from their hand to the shared table, or back the other way).
      const expectedGroupId = dcCard.groupId;
      // Whether this client renders a region for the card's destination group.
      const destRendered = !!(expectedGroupId && regionState[expectedGroupId]);
      // Any card currently in '_browse' is managed by the browse system. Skip
      // the group-change path even if the backend hasn't confirmed the move yet
      // (e.g. a card dropped in before the server round-trip completes would
      // otherwise be yanked back out and snap the browse cards to old positions).
      const inBrowse = !!_browseGroupId && card.regionId === '_browse';
      if (!inBrowse && card.regionId !== expectedGroupId) {
        if (destRendered) {
          const oldRegionId = card.regionId;
          // A card with no current region was parked/hidden — it lived in a region
          // this client doesn't render. It has no on-screen origin to slide from,
          // so reveal it and snap (not slide) its whole stack into place.
          const wasHidden = !oldRegionId;
          // Convert the stack's coords to tilt space using the OLD region's origin
          // before membership changes. originOf keys off card.regionId, so once
          // the stack is in the new region its scroll-outer-relative left/top
          // would be misread as destination-relative and the flight would start
          // from a garbage point inside the destination (seen as a teleport).
          const willFly = !wasHidden && !card.cardEl._animating;
          if (willFly) moveStackToTilt(stacks[card.stackId]);
          moveStackToRegion(card.stackId, expectedGroupId);
          if (wasHidden) setStackHidden(stacks[card.stackId], false);
          // Only animate into the new region when we're not already animating a flip.
          // moveStackToRegion and layoutRegion(old) always run so engine state stays consistent.
          if (!card.cardEl._animating) {
            if (REGIONS[expectedGroupId]?.type === 'free') {
              const dcStack = stackById[dcCard.stackId];
              if (dcStack?.left != null && _tiltEl) {
                // Lay out the whole stack so attachments follow with their offsets
                // and the region's layer Z (moveStackToRegion above already moved
                // every card in the stack, so this runs once per stack).
                animateFreeStackToFrac(stacks[card.stackId], dcPosFrac(dcStack.left, expectedGroupId, false), dcPosFrac(dcStack.top, expectedGroupId, true), wasHidden);
              }
            } else {
              // Match the backend's ordering before computing slots, so the stack
              // flies to its real slot rather than the appended end.
              syncRegionOrderData(expectedGroupId, game, idMap);
              // Center the destination slot first so an overflowing region scrolls
              // the target on-screen before the card animates in, rather than the
              // card sliding out into the clipped overflow.
              scrollStackToCenter(expectedGroupId, card.stackId);
              if (wasHidden) {
                // Slide existing cards into their new slots (excluding the
                // arriving stack), then spawn-drop the new cards in from above.
                layoutRegion(expectedGroupId, card.stackId);
                spawnDropStack(stacks[card.stackId], expectedGroupId);
              } else {
                // Slide the region's existing cards into their new slots, leaving
                // the arriving stack out, then fly it in along a lift arc.
                layoutRegion(expectedGroupId, card.stackId);
                flyStackToRegionSlot(stacks[card.stackId], expectedGroupId);
              }
            }
          }
          if (oldRegionId && oldRegionId !== expectedGroupId) layoutRegion(oldRegionId);
        } else if (card.regionId && card.regionId !== '_browse') {
          // The card moved into a region this client doesn't render — lift its
          // whole stack off the table and animate it away before hiding.
          const oldRegionId = card.regionId;
          const stackToHide = stacks[card.stackId];
          // Move to tilt-space BEFORE nulling regionId so originOf() still has
          // the old region to compute the correct coordinate offset.
          stackToHide?.cardIds.forEach(cid => { const c = cards[cid]; if (c) moveCardToTilt(c); });
          moveStackToRegion(card.stackId, null);
          despawnRiseStack(stackToHide);
          layoutRegion(oldRegionId);
        }
      }

      // 5. Free-region position update (card moved within same free region).
      // Only the stack's base card drives positioning; attachments follow via
      // animateFreeStackToFrac. The backend stores a single origin per stack, so
      // an attachment's fracX (base + offset) never matches dcStack.left —
      // repositioning it individually here would collapse it onto the base at
      // Z=0, behind an elevated region's opaque panel.
      if (card.regionId && REGIONS[card.regionId]?.type === 'free'
          && stacks[card.stackId]?.cardIds[0] === card.id) {
        const dcStack = stackById[dcCard.stackId];
        if (dcStack?.left != null && _tiltEl) {
          const fracXNew = dcPosFrac(dcStack.left, card.regionId, false);
          const fracYNew = dcPosFrac(dcStack.top,  card.regionId, true);
          const dx = Math.abs(fracXNew - (card.fracX || 0));
          const dy = Math.abs(fracYNew - (card.fracY || 0));
          if (dx > 0.001 || dy > 0.001) {
            if (!card.cardEl._animating) {
              animateFreeStackToFrac(stacks[card.stackId], fracXNew, fracYNew);
            } else {
              const tiltW = parseFloat(_tiltEl.style.width);
              const tiltH = parseFloat(_tiltEl.style.height);
              card.fracX = fracXNew;
              card.fracY = fracYNew;
              // A flip animation is running and owns liftEl.style.transform and
              // cardEl.style.transform. Slide only X/Y so there is no conflict.
              const targetLeft = fracXNew * tiltW;
              const targetTop  = fracYNew * tiltH;
              const fromLeft   = parseFloat(card.liftEl.style.left) || 0;
              const fromTop    = parseFloat(card.liftEl.style.top)  || 0;
              if (Math.abs(targetLeft - fromLeft) > 1 || Math.abs(targetTop - fromTop) > 1) {
                const slideDurMs = scaleDuration(300);
                const slideStart = performance.now();
                (function slideXY(now) {
                  const t = Math.min((now - slideStart) / slideDurMs, 1);
                  const e = easeOut(t);
                  card.liftEl.style.left = (fromLeft + (targetLeft - fromLeft) * e) + 'px';
                  card.liftEl.style.top  = (fromTop  + (targetTop  - fromTop)  * e) + 'px';
                  if (t < 1) requestAnimationFrame(slideXY);
                })(performance.now());
              }
            }
          }
        }
      }
    });

    // Apply any intra-group reordering (e.g. a shuffle) after membership above
    // has settled, so piles/rows/fans reflect the backend stack order.
    syncRegionOrders(game, idMap);

    // Refresh the targeting/arrow overlay from the new game state. The overlay's
    // own rAF loop handles per-frame repositioning while cards are in motion.
    _overlay.rebuild(game, idMap, cards);

    // Cards may have moved out from (or into) under a stationary cursor without
    // any pointer event firing, so the hovered class — and the Redux active card
    // it drives — can be stale. The moves are rAF animations that haven't run
    // yet, so a single sweep here would hit-test stale positions; instead track
    // the cards as they settle and re-derive hover from what's actually under
    // the pointer at the end.
    scheduleHoverReconcile();
  }

  // Run reconcileHover now and on each frame until card move animations have
  // settled, so the hover glow / active card end up matching whatever card is
  // really under the pointer after the dust settles (a hotkey-discard slides the
  // card away over ~300ms; a drop lands one under the cursor). Transitions inside
  // reconcileHover are guarded, so the repeated calls don't spam dispatches.
  function scheduleHoverReconcile() {
    if (_hoverSettleRaf) { cancelAnimationFrame(_hoverSettleRaf); _hoverSettleRaf = null; }
    // Cover the longest move/arc animation (~360ms) plus a small buffer.
    const deadline = performance.now() + scaleDuration(360) + 60;
    reconcileHover();
    const tick = (now) => {
      reconcileHover();
      if (now < deadline) {
        _hoverSettleRaf = requestAnimationFrame(tick);
      } else {
        _hoverSettleRaf = null;
      }
    };
    _hoverSettleRaf = requestAnimationFrame(tick);
  }

  // Sync the hover glow + active-card callbacks to whatever card sits under the
  // last known pointer position. Called after each reconcile so a hotkey move
  // (which slides a card away with no pointerout) doesn't strand the yellow glow
  // on the moved card — and so a card newly revealed under the cursor lights up.
  function reconcileHover() {
    if (_isDragging) return;
    if (_hoverSuppressed) return;
    if (_lastPointerX < 0 && _lastPointerY < 0) return; // no pointer seen yet
    const targetEl = topCardElAtPoint(_lastPointerX, _lastPointerY);
    let targetCard = null;
    for (const c of cards) {
      const shouldHover = c.cardEl === targetEl && isTopPileCard(c);
      const isHovered   = c.cardEl.classList.contains('dnc3d-card-hovered');
      if (shouldHover) targetCard = c;
      if (shouldHover && !isHovered) {
        c.cardEl.classList.add('dnc3d-card-hovered');
      } else if (!shouldHover && isHovered) {
        c.cardEl.classList.remove('dnc3d-card-hovered');
        if (onCardHoverEnd) onCardHoverEnd(c.id);
      }
    }
    // Re-assert the active card on EVERY settle tick (not just on the class
    // transition). Dispatching the same activeCardId is a no-op in Redux, but it
    // matters when the just-moved card is the one under the cursor: onCardMove
    // broadcasts to the backend, so the card's groupId in game state flips a beat
    // later — and GiantCard's group-change effect reacts to that by clearing
    // activeCardId. A one-shot, class-guarded onCardHover here would lose that
    // race permanently; re-asserting each tick re-activates the card once its
    // group has settled, so the GiantCard preview comes back (and stays).
    if (targetCard && onCardHover) onCardHover(targetCard.id, _lastPointerX);
  }

  // Called by the React layer when a full-screen overlay opens/closes over the
  // table (e.g. the hotkey panel on Tab). On open: drop the hover glow + active
  // card so nothing stays lit behind the overlay. On close: re-derive hover from
  // the cursor's current position (kept fresh by the window pointermove listener
  // below, which still fires while the cursor is over the overlay), so a card
  // under the pointer re-lights and one elsewhere stays dark.
  function setHoverSuppressed(suppressed) {
    if (suppressed === _hoverSuppressed) return;
    _hoverSuppressed = suppressed;
    if (suppressed) {
      if (_hoverSettleRaf) { cancelAnimationFrame(_hoverSettleRaf); _hoverSettleRaf = null; }
      for (const c of cards) {
        if (c.cardEl.classList.contains('dnc3d-card-hovered')) {
          c.cardEl.classList.remove('dnc3d-card-hovered');
          if (onCardHoverEnd) onCardHoverEnd(c.id);
        }
      }
    } else {
      scheduleHoverReconcile();
    }
  }

  function getCardElements() {
    return cards.map(c => ({ id: c.id, frontEl: c.frontEl, tokenHostEl: c.tokenHostEl, faceW: c.faceW, faceH: c.faceH }));
  }

  // Rebuild just the targeting/arrow overlay from game state, without running a
  // full reconcile. Used right after a re-init (deck load / region toggle), where
  // the React reconcile effect won't re-fire because `game` is unchanged.
  function syncOverlay(game, idMap) {
    _overlay.rebuild(game, idMap, cards);
  }

  // Spawn-drop a list of cards by engine index. Called after a re-init when the
  // caller knows which cards are brand-new (not present in the previous cardById).
  // Cards that aren't in a rendered region are skipped.
  function spawnCards(engineIndices) {
    for (const i of engineIndices) {
      const card = cards[i];
      if (!card || !card.regionId || card.cardEl._animating) continue;
      moveCardToTilt(card);
      spawnDropCard(card, () => moveCardFromTilt(card));
    }
  }

  // Inverse of spawnDropCard — animates a card rising off the table and fading
  // out. The card must already be in the tilt plane (call moveCardToTilt first).
  // Rise uses easeOut (quick launch, decelerates at the top), the mirror of the
  // easeIn drop. Opacity holds at 1 for the first half then fades to 0 so the
  // card is fully visible as it lifts and gone by the time it stops rising.
  // onDone is called when the animation completes (use it to hide or remove the card).
  function despawnRiseCard(card, onDone) {
    // Cancel any pending spawn animation — spawnDropCard defers its RAF behind
    // waitForCardImage, leaving layoutAnimId null during the image-load gap. This
    // flag closes that window so the spawn callback bails if despawn won first.
    card._spawnCanceled = true;
    card._spawning      = false;
    if (card.layoutAnimId) { cancelAnimationFrame(card.layoutAnimId); card.layoutAnimId = null; }
    card._cancelLift();
    const RISE_HEIGHT = card._dragLiftMax() * 2.5;
    const RISE_DUR_MS = scaleDuration(500);

    // Reset display+opacity synchronously. The card may have been mid-spawn
    // (opacity:'0', display:'none') or in some other transient state.
    card.liftEl.style.display  = '';
    card.liftEl.style.opacity  = '';
    card._setLiftVisuals(0);

    playPickupSound();

    const startTime = performance.now();
    function frame(now) {
      const t = Math.min((now - startTime) / RISE_DUR_MS, 1);
      // Z: easeOut rise (2t - t²) — true time-reverse of the spawn drop's easeIn
      // (1 - t²). The card lifts quickly off the table and decelerates near the top,
      // mirroring how the spawn card falls slowly at first then accelerates to land.
      card._setLiftVisuals(RISE_HEIGHT * (2 * t - t * t));
      // Suppress drop shadow during despawn for the same reason as spawn — piles.
      card.cardEl.style.boxShadow = 'none';
      // Opacity: hold at 1 for first half, easeIn fade-out for second half —
      // mirror of the spawn's easeOut fade-in over the first half.
      const tFade = Math.max(0, (t - 0.5) * 2);
      card.liftEl.style.opacity = tFade > 0 ? (1 - tFade * tFade).toFixed(3) : '';
      if (t < 1) {
        card.layoutAnimId = requestAnimationFrame(frame);
      } else {
        card.layoutAnimId = null;
        card.liftEl.style.opacity = '0';
        card._setLiftVisuals(0);
        if (onDone) onDone();
      }
    }
    card.layoutAnimId = requestAnimationFrame(frame);
  }

  // Despawn-rise every card in a stack. Cards must already be in the tilt plane.
  // Hides each card after its rise completes.
  function despawnRiseStack(stack) {
    if (!stack) return;
    stack.cardIds.forEach(cid => {
      const c = cards[cid];
      if (!c) return;
      despawnRiseCard(c, () => { c.liftEl.style.display = 'none'; });
    });
  }

  // Despawn-animate a list of cards by engine index. Intended for the engine
  // re-init path (cardCount change) where the engine is about to be torn down:
  // reparents each card's liftEl into a ghost-tilt container appended to the
  // stage so the elements survive the engine cleanup (which only clears tiltEl),
  // then removes them when their animations complete.
  function despawnCards(engineIndices) {
    const stage = _tiltEl?.parentElement;
    if (!stage) return;

    const toAnimate = [];
    for (const i of engineIndices) {
      const card = cards[i];
      if (!card || !card.liftEl || !card.liftEl.parentElement || !card.regionId) continue;
      toAnimate.push(card);
    }
    if (toAnimate.length === 0) return;

    // Ghost-tilt: a sibling of tiltEl with the same geometry and CSS class so
    // the reparented cards keep their 3D-correct appearance after engine cleanup.
    const ghostTilt = document.createElement('div');
    ghostTilt.className = 'dnc3d-tilt';
    ghostTilt.style.cssText = _tiltEl.style.cssText;
    ghostTilt.style.pointerEvents = 'none';
    stage.appendChild(ghostTilt);

    let completed = 0;
    toAnimate.forEach(card => {
      moveCardToTilt(card); // convert scroll-outer-relative coords to tilt-space
      ghostTilt.appendChild(card.liftEl);
      despawnRiseCard(card, () => {
        if (card.liftEl.parentElement === ghostTilt) ghostTilt.removeChild(card.liftEl);
        if (++completed === toAnimate.length && ghostTilt.parentElement === stage) {
          stage.removeChild(ghostTilt);
        }
      });
    });
  }

  return { init, applyTilt, applyTableOpacity, setCurrentDeg, onTiltUpdated, reconcile, openBrowse, closeBrowse, updateBrowseFilter, getCardElements, syncOverlay, animatePileShuffle, setHoverSuppressed, spawnCards, despawnCards };
}

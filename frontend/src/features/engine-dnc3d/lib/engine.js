import { COLORS, BASE_LIFT, PILE_STACK_Z, MAX_PILE_VISUAL_DEPTH, LAYER_Z, DEFAULT_REGIONS, scaleDuration, ATTACH_WIGGLE_DVH, DRAG_EDGE_SCROLL_SPEED, GROW, FLIP, OVERLAP } from './config';
import { createState } from './state';
import { createProjection } from './projection';
import { createLayout } from './layout';
import { easeOut, easeIn, animateFlip } from './animation';

// Creates a self-contained dnc3d engine instance.
// options.regions         — region definitions (default: DEFAULT_REGIONS for demo/sandbox mode)
// options.onCardMove      — callback(cardId, fromRegionId, toRegionId, fracX, fracY, insertIdx)
// options.onAttach        — callback(cardId, targetCardId, side)
// options.onFlip          — callback(cardId)
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
  const onCardMove    = options.onCardMove || null;
  const onAttach      = options.onAttach   || null;
  const onFlip        = options.onFlip        || null;
  const onCardClick    = options.onCardClick    || null;
  const onCardHover         = options.onCardHover         || null;
  const onCardHoverEnd      = options.onCardHoverEnd      || null;
  const onCardHoverTopBottom = options.onCardHoverTopBottom || null;
  const onDragStart    = options.onDragStart    || null;
  const onGroupBrowse  = options.onGroupBrowse  || null;
  const onGroupMenu    = options.onGroupMenu    || null;
  // Card sizing — mirrors the 2D renderer's cardSize * zoomFactor * 1.7dvh formula.
  const _cardSize           = options.cardSize           || null;
  const _cardDefaultH       = options.cardDefaultH       || 1.0;
  const _cardDefaultW       = options.cardDefaultW       || 0.72;
  const _zoomFactor         = options.zoomFactor         || 1.0;
  const _tableBackgroundUrl = options.tableBackgroundUrl || null;
  const _playerN            = options.playerN            || null;

  // ── Sub-system instances ───────────────────────────────────────────────────
  const state = createState(REGIONS);
  const { cards, stacks, regionState, createStack, splitStack, attachStack, moveStackToRegion, nextTopZ } = state;

  const projection = createProjection();
  const { cardWidthPx, cardHeightPx, stagePx, screenToTableAtZ, tableToScreen, setTiltDims, setCardDims, setStageDims } = projection;

  const layout = createLayout(state, projection, REGIONS);
  const {
    initLayout, regionPx, layoutFan, layoutRow, layoutPile,
    placeCardAt, layoutRegion, setAfterLayoutHook, setScrollOuter, setIndicatorEl,
    findRegionAtPoint, insertStackAtIndex, moveCardToTilt, moveCardFromTilt, moveStackToTilt,
    animateCardTo, tiltSpacePosOf, stackCardOffsets, stackBaseCardIds,
    showInsertionIndicator, hideInsertionIndicator, clearScrollOuters,
    rowTotalWidth,
  } = layout;

  // ── Engine-level state ─────────────────────────────────────────────────────
  let _tiltEl             = null;
  let _currentDeg         = 15;
  let _attachTargetIconEl = null;
  let _tableSurfaceEl     = null;
  let _isDragging         = false; // true while any card drag is in progress

  const scrollOuterEls   = {};
  const regionOutlineEls = {};
  const regionIconEls    = {};
  const regionLabelEls   = {};
  const sentinelEls      = {};
  const arrowEls         = {}; // { start, end } per scrollable region
  const stackZoneEls     = new Map();

  // ── Browse state ───────────────────────────────────────────────────────────
  let _browseGroupId         = null;
  let _browseAllEngineStacks = []; // [{ engineStackId, dcStackIndex }]

  function _makeBrowseRegion() {
    const tiltH    = parseFloat(_tiltEl?.style.height) || window.innerHeight;
    const tiltW    = parseFloat(_tiltEl?.style.width)  || window.innerWidth;
    const cardH    = cardHeightPx();
    const heightPct = Math.min(88, (cardH / tiltH) * 100 * 1.15 + 3);
    const topPct    = 100 - heightPct - 25;

    // The scroll outer sits at translateZ(LAYER_Z * layerIndex) = 540px above the
    // tilt plane, plus the tilt plane itself is at z = y * sinA at the center Y of
    // the region. The perspective scale at this combined Z makes the region appear
    // wider on screen than its CSS width. Compute the max CSS width that keeps the
    // apparent screen width within 96% of the viewport.
    const layerIndex = 2;
    const layerZ   = LAYER_Z * layerIndex;
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
    card.cardEl.style.setProperty('--card-w', (fw * _cardSize * _zoomFactor * dvh) + 'px');
    card.cardEl.style.setProperty('--card-h', (fh * _cardSize * _zoomFactor * dvh) + 'px');
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
    scrollOuter.style.transform = `translateZ(${LAYER_Z * r.layerIndex}px)`;
    _tiltEl.appendChild(scrollOuter);
    scrollOuterEls['_browse'] = scrollOuter;
    setScrollOuter('_browse', scrollOuter);
    updateScrollOuters();

    const outline = document.createElement('div');
    outline.className = 'dnc3d-region-outline dnc3d-region-elevated';
    outline.style.transform  = `translateZ(${LAYER_Z * r.layerIndex - 1}px)`;
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
  // Opens the browse fan for a group, moving its cards to the browse region.
  // game/idMap come from the current Dnc3DTable reconcile refs.
  function openBrowse(browseGroupId, game, idMap) {
    if (_browseGroupId) closeBrowse();
    _browseGroupId = browseGroupId;

    const group = game?.groupById?.[browseGroupId];
    if (!group) { _browseGroupId = null; return; }

    REGIONS['_browse'] = _makeBrowseRegion();
    regionState['_browse'] = { stackIds: [], scrollOffset: 0 };
    _setupBrowseRegionDom();

    // Hide the home region's table DOM so it doesn't appear as a drop target.
    for (const el of [scrollOuterEls[browseGroupId], regionOutlineEls[browseGroupId],
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
    });

    updateBrowseFilter(_browseAllEngineStacks.map(e => e.dcStackIndex));
  }

  // Closes browse, restoring all cards to their home region.
  function closeBrowse() {
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

    if (regionState[homeGroupId]) layoutRegion(homeGroupId);

    // Restore the home region's table DOM.
    for (const el of [scrollOuterEls[homeGroupId], regionOutlineEls[homeGroupId],
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
  function updateBrowseFilter(filteredDcStackIndices) {
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
    layoutRegion('_browse', inFlightStackId);
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

  // ── Card creation ──────────────────────────────────────────────────────────
  // cardInfo: { id, frontImageUrl?, backImageUrl?, angle?, faceW?, faceH? }
  function createCard(tiltEl, cardInfo) {
    const { id: i, frontImageUrl, backImageUrl, angle = 0, faceW = null, faceH = null } = cardInfo;
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

    cardEl.appendChild(front);
    cardEl.appendChild(back);
    liftEl.appendChild(cardEl);

    liftEl.style.left      = '0px';
    liftEl.style.top       = '0px';
    liftEl.style.zIndex    = i + 1;
    liftEl.style.transform = `translateZ(${BASE_LIFT}px)`;
    cardEl.style.transform = `perspective(300vw) rotateY(${angle}deg) rotateZ(0deg) scale(1)`;

    tiltEl.appendChild(liftEl);

    const card = {
      id:           i,
      liftEl,
      cardEl,
      frontEl:      front,
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
    };
    cards.push(card);
    applyCardDims(card);

    createStack([i]);

    liftEl.addEventListener('click', e => e.stopPropagation());
    // Suppress hover while dragging: re-parenting the dragged card's liftEl
    // (moveStackToTilt) fires a spurious pointerenter that would re-show the
    // GiantCard mid-drag right after onDragStart cleared it.
    if (onCardHover)    liftEl.addEventListener('pointerenter', (e) => { if (!_isDragging) onCardHover(i, e.clientX); });
    if (onCardHoverEnd) liftEl.addEventListener('pointerleave', () => { if (!_isDragging) onCardHoverEnd(i); });
    if (onCardHoverTopBottom) {
      liftEl.addEventListener('pointermove', (e) => {
        if (_isDragging) return;
        const rect = liftEl.getBoundingClientRect();
        onCardHoverTopBottom(e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom');
      });
    }

    // ── Lift animation state ──
    let liftAnimId = null;

    function dragLiftMax() {
      let maxLayerZ = 0;
      for (const r of Object.values(REGIONS)) {
        if (r.layerIndex) maxLayerZ = Math.max(maxLayerZ, LAYER_Z * r.layerIndex);
      }
      return maxLayerZ + (MAX_PILE_VISUAL_DEPTH - 1) * PILE_STACK_Z + window.innerHeight * 0.04;
    }

    function setLiftVisuals(z_px, x_px = 0) {
      card.liftPx = z_px;
      const frac = z_px / dragLiftMax();
      liftEl.style.transform = `translateZ(${BASE_LIFT + card.pileZ + z_px}px) translateX(${x_px}px)`;
      cardEl.style.transform = `perspective(300vw) rotateY(${cardEl._angle}deg) rotateZ(${(cardEl._layoutRotation || 0) + (cardEl._gameRotation || 0)}deg) scale(${1 + 0.1 * frac})`;
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
    let dragStack           = null;
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
        isDragging = true;
        _isDragging = true;
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

      const parentCard = dragStackCards[0];
      const tw = parseFloat(_tiltEl.style.width);
      const th = parseFloat(_tiltEl.style.height);
      const cx = parseFloat(parentCard.liftEl.style.left) + cardWidthPx()  / 2;
      const cy = parseFloat(parentCard.liftEl.style.top)  + cardHeightPx() / 2;

      // ── Attach-gesture hit-test ──────────────────────────────────────────────
      let newHoverAttachStackId = null;
      let newHoverAttachSide    = null;
      const attachTargetRegions = Object.entries(REGIONS)
        .filter(([, r]) => r.type === 'free' || r.type === 'row')
        .map(([id]) => id);

      let newHoverAttachCardId = null;
      for (const rid of attachTargetRegions) {
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

      // ── Insertion indicator ──────────────────────────────────────────────────
      if (hoverAttachStackId !== null) {
        hideInsertionIndicator();
        currentInsertIdx    = -1;
        currentInsertRegion = null;
      } else {
        const hoverRegion = findRegionAtPoint(cx / tw * 100, cy / th * 100);
        if (hoverRegion && hoverRegion !== _browseGroupId && (REGIONS[hoverRegion].type === 'row' || REGIONS[hoverRegion].type === 'fan')) {
          currentInsertIdx    = showInsertionIndicator(hoverRegion, cx, cy, dragStack.id);
          currentInsertRegion = hoverRegion;
        } else {
          hideInsertionIndicator();
          currentInsertIdx    = -1;
          currentInsertRegion = null;
        }
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

        const droppedStackCards  = [...dragStackCards];
        const droppedStack       = dragStack;
        const droppedAttachSid   = hoverAttachStackId;
        const droppedAttachSide  = hoverAttachSide;
        const droppedInsertIdx   = currentInsertIdx;
        const droppedInsertRgn   = currentInsertRegion;

        hideInsertionIndicator();
        currentInsertIdx    = -1;
        currentInsertRegion = null;
        hoverAttachStackId  = null;
        hoverAttachCardId   = null;
        hoverAttachSide     = null;

        const parentCard = droppedStackCards[0];
        const dropCX = (parseFloat(parentCard.liftEl.style.left) + cardWidthPx()  / 2) / tw * 100;
        const dropCY = (parseFloat(parentCard.liftEl.style.top)  + cardHeightPx() / 2) / th * 100;
        const _rawTargetRegion = findRegionAtPoint(dropCX, dropCY);
        // Treat the browse home region as empty while it's being browsed.
        const targetRegionId = (_rawTargetRegion === _browseGroupId) ? null : _rawTargetRegion;

        function liftDown(dur, cb, targets = null, options = {}) {
          const { wiggleXPx = 0, settleProgressAt = 1, deferZIndex = false } = options;
          const targetByCardId = targets
            ? new Map(targets.map(pos => [pos.card.id, pos]))
            : null;
          let done = 0;
          const startTime = performance.now();
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
            const layerOffset = LAYER_Z * (REGIONS[c.regionId]?.layerIndex || 0);
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
            const regionPositions = layoutRegion(targetRegion) || [];
            if (sourceRegion && sourceRegion !== targetRegion && REGIONS[sourceRegion]?.type !== 'free') {
              layoutRegion(sourceRegion);
            }
            const droppedIdSet = new Set(droppedStackCards.map(c => c.id));
            const liftTargets = regionPositions
              .filter(p => droppedIdSet.has(p.cardId))
              .map(p => ({ card: cards[p.cardId], stackZ: p.stackZ || 0, zIndex: p.zIndex }));

            regionPositions.forEach(p => {
              if (droppedIdSet.has(p.cardId)) return;
              const c = cards[p.cardId];
              if (!c) return;
              c.pileZ = p.stackZ || 0;
              c.liftEl.style.zIndex = p.zIndex;
              c._setLiftVisuals(c.liftPx);
            });

            [...droppedStackCards].reverse().forEach(c => { c.liftEl.style.zIndex = nextTopZ(); });

            liftDown(280, null, liftTargets.length ? liftTargets : null, {
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

            (function slideFrame(now) {
              const t  = Math.min((now - slideStart) / slideDur, 1);
              const ef = easeOut(t);
              droppedStackCards.forEach((c, idx) => {
                const myPos = posById.get(c.id);
                if (!myPos) return;
                const from = fromPos[idx];
                c.liftEl.style.left = (from.left + (myPos.left - from.left) * ef) + 'px';
                c.liftEl.style.top  = (from.top  + (myPos.top  - from.top)  * ef) + 'px';
              });
              if (t < 1) {
                card.layoutAnimId = requestAnimationFrame(slideFrame);
              } else {
                card.layoutAnimId = null;
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

              (function slideFrame(now) {
                const t  = Math.min((now - slideStart) / slideDur, 1);
                const ef = easeOut(t);
                myPositions.forEach((myPos, idx) => {
                  const c    = cards[myPos.cardId];
                  const from = fromPos[idx];
                  c.liftEl.style.left = (from.left + (myPos.left - from.left) * ef) + 'px';
                  c.liftEl.style.top  = (from.top  + (myPos.top  - from.top)  * ef) + 'px';
                });
                if (t < 1) {
                  card.layoutAnimId = requestAnimationFrame(slideFrame);
                } else {
                  card.layoutAnimId = null;
                  let done = 0;
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
              const layerZ = LAYER_Z * (REGIONS[targetRegionId]?.layerIndex || 0);
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
              const vis = regionState['_browse']?.stackIds || [];
              if (cbInsertIdx < vis.length) {
                const entry = _browseAllEngineStacks.find(x => x.engineStackId === vis[cbInsertIdx]);
                if (entry) cbInsertIdx = entry.dcStackIndex;
              } else {
                const last = vis[vis.length - 1];
                const entry = last ? _browseAllEngineStacks.find(x => x.engineStackId === last) : null;
                if (entry) cbInsertIdx = entry.dcStackIndex + 1;
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


    Object.entries(REGIONS).forEach(([id, r]) => {
      if (r.type !== 'row' && r.type !== 'fan') return;
      const el = document.createElement('div');
      el.className = 'dnc3d-region-scroll-outer';
      if (r.layerIndex > 0) el.style.transform = `translateZ(${LAYER_Z * r.layerIndex}px)`;
      tiltEl.appendChild(el);
      scrollOuterEls[id] = el;
      setScrollOuter(id, el);
    });
    updateScrollOuters();

    const insertIndicatorEl = document.createElement('div');
    insertIndicatorEl.className = 'dnc3d-insert-indicator';
    tiltEl.appendChild(insertIndicatorEl);
    setIndicatorEl(insertIndicatorEl);

    _attachTargetIconEl = document.createElement('div');
    _attachTargetIconEl.className = 'dnc3d-attach-icon';
    _attachTargetIconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    tiltEl.appendChild(_attachTargetIconEl);

    if (initData.cards) {
      initData.cards.forEach(descriptor => createCard(tiltEl, descriptor));
    } else {
      for (let i = 0; i < 20; i++) createCard(tiltEl, { id: i });
    }

    Object.entries(REGIONS).forEach(([id, r]) => {
      const outline = document.createElement('div');
      outline.className = 'dnc3d-region-outline';
      if (r.layerIndex > 0) {
        outline.classList.add('dnc3d-region-elevated');
        outline.style.transform = `translateZ(${LAYER_Z * r.layerIndex - 1}px)`;
      }
      if (r.backgroundColor) outline.style.backgroundColor = r.backgroundColor;
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

    setAfterLayoutHook(id => { updateSentinel(id); updateScrollArrows(id); });

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
        const rect = regionOutlineEls[id]?.getBoundingClientRect();
        if (rect && clientX >= rect.left && clientX <= rect.right &&
            clientY >= rect.top && clientY <= rect.bottom) {
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
    function onTiltPointerMove(e) { updateIconHover(e.clientX, e.clientY); }
    function onTiltPointerLeave() {
      if (hoveredIconRegion) { setRegionHoverState(hoveredIconRegion, false); hoveredIconRegion = null; }
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
          regionState[regionId].stackIds.forEach(sid => {
            const baseCard = cards[stacks[sid].cardIds[0]];
            if (!baseCard) return;
            placeCardAt(baseCard, (baseCard.fracX || 0) * tiltW, (baseCard.fracY || 0) * tiltH, 0, baseCard.id + 1);
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

    Object.keys(sentinelEls).forEach(updateSentinel);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return function cleanup() {
      tiltEl.removeEventListener('pointermove',  onTiltPointerMove);
      tiltEl.removeEventListener('pointerleave', onTiltPointerLeave);
      window.removeEventListener('wheel', onWheel);
      if (_tableSurfaceEl) { _tableSurfaceEl.parentElement?.removeChild(_tableSurfaceEl); _tableSurfaceEl = null; }
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
      stackZoneEls.clear();
      clearScrollOuters();
      setAfterLayoutHook(null);
      setIndicatorEl(null);
      _tiltEl = null;
    };
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

    Object.entries(cardById).forEach(([dcCardId, dcCard]) => {
      const i = idMap.get(dcCardId);
      if (i === undefined) return;
      const card = cards[i];
      if (!card || !card.cardEl) return;

      // 1. Game rotation (exhaustion, rotation token, etc.)
      const newGameRot = dcCard.rotation || 0;
      if (card.cardEl._gameRotation !== newGameRot) {
        card.cardEl._gameRotation = newGameRot;
        if (!card.cardEl._animating) {
          const totalRot = (card.cardEl._layoutRotation || 0) + newGameRot;
          if (card.cardEl._rotTransId) clearTimeout(card.cardEl._rotTransId);
          const rotDurMs = scaleDuration(300);
          card.cardEl.style.transition = `transform ${rotDurMs}ms ease`;
          card.cardEl.style.transform =
            `perspective(300vw) rotateY(${card.cardEl._angle}deg) rotateZ(${totalRot}deg) scale(1)`;
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
      if (currentVisualSide !== expectedSide && !card.cardEl._animating) {
        card.cardEl._animating = true;
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
          const layerZ = LAYER_Z * (REGIONS['_browse']?.layerIndex || 0);
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
          let endStackZ = LAYER_Z * (REGIONS[card.regionId]?.layerIndex || 0);

          if (regionType === 'free') {
            // Free regions store position as fractions in dcStack.left/top.
            const dcStack = stackById[dcCard.stackId];
            if (dcStack?.left != null && _tiltEl) {
              const tiltW = parseFloat(_tiltEl.style.width)  || 1;
              const tiltH = parseFloat(_tiltEl.style.height) || 1;
              card.fracX = dcStack.left;
              card.fracY = dcStack.top ?? 0;
              slideTargetLeft = dcStack.left * tiltW;
              slideTargetTop  = (dcStack.top ?? 0) * tiltH;
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
            const destType = REGIONS[destGroupId]?.type;

            // Center the destination slot before computing the flight target so the
            // card lands inside the visible region rather than out in the clipped
            // overflow. layoutRegion (excluding the flyer) slides the existing cards
            // into the scrolled layout while the card flies in.
            if (scrollStackToCenter(destGroupId, card.stackId)) layoutRegion(destGroupId, card.stackId);

            let slideTargetLeft = fromLeft, slideTargetTop = fromTop;
            let endStackZ = LAYER_Z * (REGIONS[destGroupId]?.layerIndex || 0);
            if (destType === 'free') {
              const dcStack = stackById[dcCard.stackId];
              if (dcStack?.left != null && _tiltEl) {
                const tiltW = parseFloat(_tiltEl.style.width)  || 1;
                const tiltH = parseFloat(_tiltEl.style.height) || 1;
                card.fracX = dcStack.left;
                card.fracY = dcStack.top ?? 0;
                slideTargetLeft = dcStack.left * tiltW;
                slideTargetTop  = (dcStack.top ?? 0) * tiltH;
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

      // 4. Group change (card moved by another player)
      const expectedGroupId = dcCard.groupId;
      // Any card currently in '_browse' is managed by the browse system. Skip
      // the group-change path even if the backend hasn't confirmed the move yet
      // (e.g. a card dropped in before the server round-trip completes would
      // otherwise be yanked back out and snap the browse cards to old positions).
      const inBrowse = !!_browseGroupId && card.regionId === '_browse';
      if (!inBrowse && expectedGroupId && card.regionId !== expectedGroupId && regionState[expectedGroupId]) {
        const oldRegionId = card.regionId;
        moveStackToRegion(card.stackId, expectedGroupId);
        // Only animate into the new region when we're not already animating a flip.
        // moveStackToRegion and layoutRegion(old) always run so engine state stays consistent.
        if (!card.cardEl._animating) {
          if (REGIONS[expectedGroupId]?.type === 'free') {
            const dcStack = stackById[dcCard.stackId];
            if (dcStack?.left != null && _tiltEl) {
              const tiltW = parseFloat(_tiltEl.style.width);
              const tiltH = parseFloat(_tiltEl.style.height);
              card.fracX = dcStack.left;
              card.fracY = dcStack.top ?? 0;
              animateCardTo(card, dcStack.left * tiltW, (dcStack.top ?? 0) * tiltH, 0, card.id + 1, 300, 0);
            }
          } else {
            // Center the destination slot first so an overflowing region scrolls
            // the target on-screen before the card animates in, rather than the
            // card sliding out into the clipped overflow.
            scrollStackToCenter(expectedGroupId, card.stackId);
            layoutRegion(expectedGroupId);
          }
        }
        if (oldRegionId && oldRegionId !== expectedGroupId) layoutRegion(oldRegionId);
      }

      // 5. Free-region position update (card moved within same free region)
      if (card.regionId && REGIONS[card.regionId]?.type === 'free') {
        const dcStack = stackById[dcCard.stackId];
        if (dcStack?.left != null && _tiltEl) {
          const dx = Math.abs((dcStack.left  ?? 0) - (card.fracX || 0));
          const dy = Math.abs((dcStack.top   ?? 0) - (card.fracY || 0));
          if (dx > 0.001 || dy > 0.001) {
            const tiltW = parseFloat(_tiltEl.style.width);
            const tiltH = parseFloat(_tiltEl.style.height);
            card.fracX = dcStack.left;
            card.fracY = dcStack.top ?? 0;
            if (!card.cardEl._animating) {
              animateCardTo(card, dcStack.left * tiltW, (dcStack.top ?? 0) * tiltH, card.cardEl._layoutRotation, card.id + 1, 300, 0);
            } else {
              // A flip animation is running and owns liftEl.style.transform and
              // cardEl.style.transform. Slide only X/Y so there is no conflict.
              const targetLeft = dcStack.left * tiltW;
              const targetTop  = (dcStack.top ?? 0) * tiltH;
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
  }

  function getCardElements() {
    return cards.map(c => ({ id: c.id, frontEl: c.frontEl, faceW: c.faceW, faceH: c.faceH }));
  }

  return { init, applyTilt, applyTableOpacity, setCurrentDeg, onTiltUpdated, reconcile, openBrowse, closeBrowse, updateBrowseFilter, getCardElements };
}

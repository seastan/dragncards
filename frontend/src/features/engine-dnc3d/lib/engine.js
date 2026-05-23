import { COLORS, BASE_LIFT, LAYER_Z, DEFAULT_REGIONS, scaleDuration, ATTACH_WIGGLE_DVH, DRAG_EDGE_SCROLL_SPEED } from './config';
import { createState } from './state';
import { createProjection } from './projection';
import { createLayout } from './layout';
import { easeOut, easeIn, animateFlip } from './animation';

// Creates a self-contained dnc3d engine instance.
// options.regions         — region definitions (default: DEFAULT_REGIONS for demo/sandbox mode)
// options.onCardMove      — callback(cardId, fromRegionId, toRegionId, fracX, fracY)
// options.onAttach        — callback(cardId, targetCardId, side)
// options.onFlip          — callback(cardId)
// options.onCardClick     — callback(cardId, clientX, clientY) fired on click (no drag)
// options.onCardHover     — callback(cardId) fired on pointerenter
// options.onCardHoverEnd  — callback(cardId) fired on pointerleave
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
  const onCardHover    = options.onCardHover    || null;
  const onCardHoverEnd = options.onCardHoverEnd || null;
  // Card sizing — mirrors the 2D renderer's cardSize * zoomFactor * 1.7dvh formula.
  const _cardSize     = options.cardSize     || null;   // null → fall back to legacy formula
  const _cardDefaultH = options.cardDefaultH || 1.0;
  const _cardDefaultW = options.cardDefaultW || 0.72;
  const _zoomFactor   = options.zoomFactor   || 1.0;

  // ── Sub-system instances ───────────────────────────────────────────────────
  const state = createState(REGIONS);
  const { cards, stacks, regionState, createStack, splitStack, attachStack, moveStackToRegion, nextTopZ } = state;

  const projection = createProjection();
  const { cardWidthPx, cardHeightPx, stagePx, screenToTableAtZ, tableToScreen, setTiltDims, setCardDims, setStageDims } = projection;

  const layout = createLayout(state, projection, REGIONS);
  const {
    initLayout, regionPx, layoutFan, layoutRow, layoutPile,
    placeCardAt, layoutRegion, setAfterLayoutHook, setScrollOuter, setIndicatorEl,
    findRegionAtPoint, insertStackAtIndex, moveStackToTilt,
    animateCardTo, tiltSpacePosOf, stackCardOffsets, stackBaseCardIds,
    showInsertionIndicator, hideInsertionIndicator, clearScrollOuters,
    rowTotalWidth,
  } = layout;

  // ── Engine-level state ─────────────────────────────────────────────────────
  let _tiltEl             = null;
  let _currentDeg         = 15;
  let _attachTargetIconEl = null;

  const scrollOuterEls   = {};
  const regionOutlineEls = {};
  const sentinelEls      = {};
  const stackZoneEls     = new Map();

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
    Object.keys(sentinelEls).forEach(updateSentinel);
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
    if (onCardHover)    liftEl.addEventListener('pointerenter', (e) => onCardHover(i, e.clientX));
    if (onCardHoverEnd) liftEl.addEventListener('pointerleave', () => onCardHoverEnd(i));

    // ── Lift animation state ──
    let liftAnimId = null;

    const _maxLayerZ = Math.max(0, ...Object.values(REGIONS).map(r => LAYER_Z * (r.layerIndex || 0)));
    function dragLiftMax() { return window.innerHeight * 0.04 + _maxLayerZ; }

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
        if (hoverRegion && (REGIONS[hoverRegion].type === 'row' || REGIONS[hoverRegion].type === 'fan')) {
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
        const targetRegionId = findRegionAtPoint(dropCX, dropCY);

        function liftDown(dur, cb, targets = null, options = {}) {
          const { wiggleXPx = 0, settleProgressAt = 1, deferZIndex = false } = options;
          const targetByCardId = targets
            ? new Map(targets.map(pos => [pos.card.id, pos]))
            : null;
          let done = 0;
          const startTime = performance.now();
          droppedStackCards.forEach(c => {
            const target = targetByCardId?.get(c.id);
            if (target) {
              c.pileZ = target.stackZ;
              if (!deferZIndex) {
                c.liftEl.style.zIndex = target.zIndex;
                c._setLiftVisuals(c.liftPx);
              }
            }
            c._animateLift(0, dur, easeIn, () => {
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
                  const myPos = posById.get(c.id);
                  c.pileZ = myPos?.stackZ || 0;
                  c._animateLift(0, 200, easeIn, () => {
                    c.liftEl.style.zIndex = nextTopZ();
                    if (myPos) placeCardAt(c, myPos.left, myPos.top, 0, myPos.zIndex, myPos.stackZ || 0);
                  });
                });
              }
            })(performance.now());
          } else {
            const positions    = insertStackAtIndex(droppedStack.id, targetRegionId, droppedInsertIdx);
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
                    const myPos = myPositions[idx];
                    c.pileZ = myPos?.stackZ || 0;
                    c._animateLift(0, 200, easeIn, () => {
                      c.liftEl.style.zIndex = nextTopZ();
                      if (myPos) placeCardAt(c, myPos.left, myPos.top, 0, myPos.zIndex, myPos.stackZ || 0);
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
            onCardMove(c0.id, c0.prevPos._regionId, targetRegionId, null, null);
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
              onCardMove(c0.id, oldRegionId, targetRegionId, c0.fracX, c0.fracY);
            }
          } else {
            // Miss — snap every card back to its saved position
            const snapTargets = stackTargets(droppedStack, c => ({
              left: c.prevPos.left,
              top: c.prevPos.top,
              rot: c.prevPos.rot,
            }));
            liftDown(280, () => {
              snapTargets.forEach(pos => {
                animateCardTo(pos.card, pos.left, pos.top, pos.rot, pos.zIndex, 220, pos.stackZ);
              });
            }, snapTargets);
          }
        }
      }

      isDragging      = false;
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
      const label = document.createElement('span');
      label.className = 'dnc3d-region-label';
      label.textContent = r.label || id;
      outline.appendChild(label);
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
    });

    setAfterLayoutHook(updateSentinel);

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
      window.removeEventListener('wheel', onWheel);
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
          card.cardEl.style.transform =
            `perspective(300vw) rotateY(${card.cardEl._angle}deg) rotateZ(${totalRot}deg) scale(1)`;
        }
      }

      // 2. Flip — currentSide drives the expected rotateY angle
      const expectedSide      = dcCard.currentSide || 'A';
      const currentVisualSide = (card.cardEl._angle % 360 === 180) ? 'B' : 'A';
      if (currentVisualSide !== expectedSide && !card.cardEl._animating) {
        card.cardEl._animating = true;
        animateFlip(card.cardEl, card.liftEl, card.cardEl._angle);
        card.cardEl._angle += 180;
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
      if (expectedGroupId && card.regionId !== expectedGroupId && regionState[expectedGroupId]) {
        const oldRegionId = card.regionId;
        moveStackToRegion(card.stackId, expectedGroupId);
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
          layoutRegion(expectedGroupId);
        }
        if (oldRegionId && oldRegionId !== expectedGroupId) layoutRegion(oldRegionId);
      }

      // 4. Free-region position update (card moved within same free region)
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
            animateCardTo(card, dcStack.left * tiltW, (dcStack.top ?? 0) * tiltH, card.cardEl._layoutRotation, card.id + 1, 300, 0);
          }
        }
      }
    });
  }

  return { init, applyTilt, applyTableOpacity, setCurrentDeg, onTiltUpdated, reconcile };
}

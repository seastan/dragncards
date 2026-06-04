import { BASE_LIFT, PILE_STACK_Z, MAX_PILE_VISUAL_DEPTH, LAYER_Z, scaleDuration } from './config';
import { easeOut } from './animation';

// Attachment cards offset horizontally from their parent within a stack.
const ATTACH_OFFSET_X = 0.22; // fraction of card width per side-specific attachment index

export function createLayout(state, projection, REGIONS) {
  const { cards, stacks, regionState } = state;
  const { cardWidthPx, cardHeightPx } = projection;

  // Set once by init call.
  let _tiltEl = null;
  const scrollOuters = {};
  let _indicatorEl = null;
  let _afterLayoutHook = null;

  function initLayout(tiltEl) { _tiltEl = tiltEl; }

  function regionPx(id) {
    const r  = REGIONS[id];
    const tw = parseFloat(_tiltEl.style.width);
    const th = parseFloat(_tiltEl.style.height);
    return { x: r.left / 100 * tw, y: r.top / 100 * th, w: r.width / 100 * tw, h: r.height / 100 * th };
  }

  function findRegionAtPoint(pctX, pctY) {
    let bestId    = null;
    let bestLayer = -1;
    for (const [id, r] of Object.entries(REGIONS)) {
      if (pctX >= r.left && pctX <= r.left + r.width &&
          pctY >= r.top  && pctY <= r.top  + r.height) {
        const layer = r.layerIndex || 0;
        if (layer > bestLayer) { bestLayer = layer; bestId = id; }
      }
    }
    return bestId;
  }

  // ── Scroll outer containers ─────────────────────────────────────────────────
  function setScrollOuter(regionId, el) { scrollOuters[regionId] = el; }
  function clearScrollOuters() { Object.keys(scrollOuters).forEach(k => delete scrollOuters[k]); }

  function originOf(regionId) {
    return scrollOuters[regionId] ? regionPx(regionId) : { x: 0, y: 0 };
  }

  function tiltSpacePosOf(card) {
    const left = parseFloat(card.liftEl.style.left) || 0;
    const top  = parseFloat(card.liftEl.style.top)  || 0;
    if (card.liftEl.parentElement === _tiltEl) return { left, top };
    const o = originOf(card.regionId);
    return { left: left + o.x, top: top + o.y };
  }

  function ensureCardParent(card) {
    const target = (card.regionId && scrollOuters[card.regionId])
      ? scrollOuters[card.regionId]
      : _tiltEl;
    if (card.liftEl.parentElement !== target) target.appendChild(card.liftEl);
  }

  // Reparents a single card's liftEl into tilt space (internal helper).
  function moveCardToTilt(card) {
    if (card.liftEl.parentElement === _tiltEl) return;
    const o = originOf(card.regionId);
    card.liftEl.style.left = ((parseFloat(card.liftEl.style.left) || 0) + o.x) + 'px';
    card.liftEl.style.top  = ((parseFloat(card.liftEl.style.top)  || 0) + o.y) + 'px';
    _tiltEl.appendChild(card.liftEl);
  }

  // Reparents every card in the stack into tilt space (called at drag start).
  function moveStackToTilt(stack) {
    stack.cardIds.forEach(cid => moveCardToTilt(cards[cid]));
  }

  // Inverse of moveCardToTilt — returns card from tiltEl back to its scroll-outer.
  function moveCardFromTilt(card) {
    if (card.liftEl.parentElement !== _tiltEl) return;
    const target = (card.regionId && scrollOuters[card.regionId])
      ? scrollOuters[card.regionId]
      : _tiltEl;
    if (target === _tiltEl) return;
    const o = originOf(card.regionId);
    card.liftEl.style.left = ((parseFloat(card.liftEl.style.left) || 0) - o.x) + 'px';
    card.liftEl.style.top  = ((parseFloat(card.liftEl.style.top)  || 0) - o.y) + 'px';
    target.appendChild(card.liftEl);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function isVertical(regionId) {
    return REGIONS[regionId]?.direction === 'vertical';
  }

  // Returns how far a stack visually extends left and right of its anchor point.
  // Slots are always sized for the landscape width (ch) so that cards can be
  // exhausted/rotated without overlapping neighbours.
  function stackExtents(sid) {
    const stack   = stacks[sid];
    const offsets = stackCardOffsets(stack);
    const dxs     = offsets.map(o => o.dx);
    const cw      = cardWidthPx();
    const ch      = cardHeightPx();

    // Each slot is ch wide, centered on the card element's center (anchor.x + cw/2).
    // leftEdge is (cw-ch)/2 — negative when ch > cw, meaning the slot extends left of anchor.
    const leftEdge  = (cw - ch) / 2;
    const rightEdge = (cw + ch) / 2;

    return {
      leftExt:  Math.max(-leftEdge,   -Math.min(0, ...dxs)),
      rightExt: Math.max(rightEdge, Math.max(0, ...dxs) + cw),
    };
  }

  // Total visual width of all stacks in a horizontal row region (includes left buffer).
  function rowTotalWidth(regionId) {
    const stackIds = regionState[regionId].stackIds;
    if (!stackIds.length) return regionPx(regionId).w;
    const GAP         = cardWidthPx() * 0.1;
    const LEFT_BUFFER = cardWidthPx() * 0.15;
    const total = stackIds.reduce((sum, sid) => {
      const { leftExt, rightExt } = stackExtents(sid);
      return sum + leftExt + rightExt;
    }, 0);
    return total + (stackIds.length - 1) * GAP + LEFT_BUFFER;
  }

  function regionLayerZ(regionId) {
    return LAYER_Z * (REGIONS[regionId]?.layerIndex || 0);
  }

  // ── Layout functions ────────────────────────────────────────────────────────
  // All layout functions return an array of:
  //   { cardId, left, top, rot, zIndex, stackZ }
  // where left/top are tilt-space coordinates.

  function stackCardOffsets(stack) {
    const cw = cardWidthPx();
    let leftCount = 0;
    let rightCount = 0;

    return stack.cardIds.map((cid, cardIdx) => {
      if (cardIdx === 0) return { cardId: cid, dx: 0, dy: 0 };

      const direction = cards[cid]?.attachmentDirection;
      if (direction === 'left') {
        leftCount += 1;
        return { cardId: cid, dx: -leftCount * cw * ATTACH_OFFSET_X, dy: 0 };
      }
      if (direction === 'right') {
        rightCount += 1;
        return { cardId: cid, dx: rightCount * cw * ATTACH_OFFSET_X, dy: 0 };
      }
      return { cardId: cid, dx: 0, dy: 0 };
    });
  }

  function stackBaseCardIds(stack) {
    if (!stack?.cardIds?.length) return { leftCardId: null, rightCardId: null };

    const parentCardId = stack.cardIds[0];
    let leftCardId = parentCardId;
    let rightCardId = parentCardId;
    let leftMostDx = 0;
    let rightMostDx = 0;

    stackCardOffsets(stack).forEach(({ cardId, dx }) => {
      const direction = cards[cardId]?.attachmentDirection;
      if (direction === 'left' && dx < leftMostDx) { leftMostDx = dx; leftCardId = cardId; }
      if (direction === 'right' && dx > rightMostDx) { rightMostDx = dx; rightCardId = cardId; }
    });

    return { leftCardId, rightCardId };
  }

  function stackPositionsAtAnchor(stack, anchorLeft, anchorTop, zIndexBase, stackZBase = 0) {
    const n = stack.cardIds.length;
    return stackCardOffsets(stack).map(({ cardId, dx, dy }, cardIdx) => ({
      cardId,
      left: anchorLeft + dx,
      top: anchorTop + dy,
      rot: 0,
      zIndex: zIndexBase + (n - cardIdx),
      stackZ: stackZBase,
    }));
  }

  function layoutRow(regionId) {
    const rp       = regionPx(regionId);
    const stackIds = regionState[regionId].stackIds;
    const n        = stackIds.length;
    if (!n) return [];
    const cw = cardWidthPx(), ch = cardHeightPx();
    const lz = regionLayerZ(regionId);

    if (isVertical(regionId)) {
      const spacing = ch * 1.1;
      const totalH  = (n - 1) * spacing + ch;
      const midX    = rp.x + (rp.w - cw) / 2;
      let startY;
      if (totalH <= rp.h) {
        startY = rp.y + (rp.h - totalH) / 2;
      } else {
        const maxScroll = totalH - rp.h;
        const rs = regionState[regionId];
        rs.scrollOffset = Math.min(Math.max(rs.scrollOffset || 0, 0), maxScroll);
        startY = rp.y - rs.scrollOffset;
      }
      const positions = [];
      stackIds.forEach((sid, slotIdx) => {
        const stack = stacks[sid];
        positions.push(...stackPositionsAtAnchor(stack, midX, startY + slotIdx * spacing, slotIdx * 100, lz));
      });
      return positions;
    }

    const GAP         = cw * 0.1;
    const LEFT_BUFFER = cw * 0.15;
    const totalW      = rowTotalWidth(regionId);
    const midY        = rp.y + (rp.h - ch) / 2;
    let startVisualX;
    if (totalW <= rp.w) {
      startVisualX = rp.x + LEFT_BUFFER;
    } else {
      const maxScroll = totalW - rp.w;
      const rs = regionState[regionId];
      rs.scrollOffset = Math.min(Math.max(rs.scrollOffset || 0, 0), maxScroll);
      startVisualX = rp.x + LEFT_BUFFER - rs.scrollOffset;
    }
    const positions = [];
    let x = startVisualX;
    stackIds.forEach((sid, slotIdx) => {
      const { leftExt, rightExt } = stackExtents(sid);
      positions.push(...stackPositionsAtAnchor(stacks[sid], x + leftExt, midY, slotIdx * 100, lz));
      x += leftExt + rightExt + GAP;
    });
    return positions;
  }

  function layoutFan(regionId) {
    const rp       = regionPx(regionId);
    const stackIds = regionState[regionId].stackIds;
    const n        = stackIds.length;
    if (!n) return [];
    const cw = cardWidthPx(), ch = cardHeightPx();
    const lz = regionLayerZ(regionId);

    if (isVertical(regionId)) {
      const midX       = rp.x + (rp.w - cw) / 2;
      const minSpacing = ch * 0.20;
      let startY, spacing;
      if (n * ch <= rp.h) {
        startY  = rp.y;
        spacing = ch;
      } else {
        const overlapSpacing = n > 1 ? (rp.h - ch) / (n - 1) : ch;
        if (overlapSpacing >= minSpacing) {
          startY  = rp.y;
          spacing = overlapSpacing;
        } else {
          const totalH    = (n - 1) * minSpacing + ch;
          const maxScroll = totalH - rp.h;
          const rs        = regionState[regionId];
          rs.scrollOffset = Math.min(Math.max(rs.scrollOffset || 0, 0), maxScroll);
          startY  = rp.y - rs.scrollOffset;
          spacing = minSpacing;
        }
      }
      const positions = [];
      stackIds.forEach((sid, slotIdx) => {
        const stack = stacks[sid];
        positions.push(...stackPositionsAtAnchor(stack, midX, startY + slotIdx * spacing, slotIdx * 100, lz));
      });
      return positions;
    }

    const midY        = rp.y + (rp.h - ch) / 2;
    const LEFT_BUFFER = cw * 0.30;
    const availW      = rp.w - LEFT_BUFFER;
    const minSpacing  = cw * 0.20;
    let startX, spacing;
    if (n * cw <= availW) {
      startX  = rp.x + LEFT_BUFFER;
      spacing = cw;
    } else {
      const overlapSpacing = n > 1 ? (availW - cw) / (n - 1) : cw;
      if (overlapSpacing >= minSpacing) {
        startX  = rp.x + LEFT_BUFFER;
        spacing = overlapSpacing;
      } else {
        const totalW    = (n - 1) * minSpacing + cw + LEFT_BUFFER;
        const maxScroll = totalW - rp.w;
        const rs        = regionState[regionId];
        rs.scrollOffset = Math.min(Math.max(rs.scrollOffset || 0, 0), maxScroll);
        startX  = rp.x + LEFT_BUFFER - rs.scrollOffset;
        spacing = minSpacing;
      }
    }
    const positions = [];
    stackIds.forEach((sid, slotIdx) => {
      const stack = stacks[sid];
      positions.push(...stackPositionsAtAnchor(stack, startX + slotIdx * spacing, midY, slotIdx * 100, lz));
    });
    return positions;
  }

  function layoutPile(regionId) {
    const rp          = regionPx(regionId);
    const stackIds    = regionState[regionId].stackIds;
    const cw          = cardWidthPx(), ch = cardHeightPx();
    const LEFT_BUFFER = cw * 0.15;
    const cx          = rp.x + LEFT_BUFFER + (rp.w - LEFT_BUFFER - cw) / 2;
    const cy          = rp.y + (rp.h - ch) / 2;
    const lz       = regionLayerZ(regionId);
    const positions = [];
    stackIds.forEach((sid, slotIdx) => {
      const stack = stacks[sid];
      const cappedIdx = Math.min(slotIdx, MAX_PILE_VISUAL_DEPTH - 1);
      positions.push(...stackPositionsAtAnchor(stack, cx, cy, slotIdx * 100, cappedIdx * PILE_STACK_Z + lz));
    });
    return positions;
  }

  // Layout functions return tilt-space coords. placeCardAt / animateCardTo convert
  // to container-relative when placing cards inside a scroll outer.

  function placeCardAt(card, left, top, rot, zIdx, stackZ = 0) {
    ensureCardParent(card);
    const o = originOf(card.regionId);
    card.liftEl.style.left      = (left - o.x) + 'px';
    card.liftEl.style.top       = (top  - o.y) + 'px';
    card.liftEl.style.zIndex    = zIdx;
    card.pileZ                  = stackZ;
    card.cardEl._layoutRotation = rot;
    card.cardEl.style.transform = `perspective(300vw) rotateY(${card.cardEl._angle}deg) rotateZ(${rot + (card.cardEl._gameRotation || 0)}deg) scale(1)`;
  }

  function animateCardTo(card, targetLeft, targetTop, targetRot, targetZ, duration = 300, targetStackZ = 0) {
    if (card.layoutAnimId) { cancelAnimationFrame(card.layoutAnimId); card.layoutAnimId = null; }
    const { left: fromLeft, top: fromTop } = tiltSpacePosOf(card);
    const fromRot    = card.cardEl._layoutRotation || 0;
    const fromStackZ = card.pileZ || 0;
    const start      = performance.now();
    const durationMs = scaleDuration(duration);
    ensureCardParent(card);
    function frame(now) {
      const t = Math.min((now - start) / durationMs, 1);
      const e = easeOut(t);
      const o = originOf(card.regionId);
      const sz = fromStackZ + (targetStackZ - fromStackZ) * e;
      card.pileZ = sz;
      card.liftEl.style.left      = (fromLeft + (targetLeft - fromLeft) * e - o.x) + 'px';
      card.liftEl.style.top       = (fromTop  + (targetTop  - fromTop)  * e - o.y) + 'px';
      card.liftEl.style.transform = `translateZ(${BASE_LIFT + sz}px)`;
      card.cardEl._layoutRotation = fromRot + (targetRot - fromRot) * e;
      card.cardEl.style.transform = `perspective(300vw) rotateY(${card.cardEl._angle}deg) rotateZ(${card.cardEl._layoutRotation + (card.cardEl._gameRotation || 0)}deg) scale(1)`;
      if (t < 1) {
        card.layoutAnimId = requestAnimationFrame(frame);
      } else {
        card.layoutAnimId = null;
        card.liftEl.style.zIndex = targetZ;
        if (card.regionId && REGIONS[card.regionId].type === 'free') {
          const tw = parseFloat(_tiltEl.style.width);
          const th = parseFloat(_tiltEl.style.height);
          card.fracX = targetLeft / tw;
          card.fracY = targetTop  / th;
        }
      }
    }
    card.layoutAnimId = requestAnimationFrame(frame);
  }

  // Inserts a stack at a specific index in a region's stackIds.
  function insertStackAtIndex(stackId, regionId, insertIdx) {
    const stack      = stacks[stackId];
    const oldRegionId = cards[stack.cardIds[0]].regionId;
    if (oldRegionId) {
      const arr = regionState[oldRegionId].stackIds;
      const idx = arr.indexOf(stackId);
      if (idx !== -1) arr.splice(idx, 1);
    }
    stack.cardIds.forEach(cid => { cards[cid].regionId = regionId; });
    const arr = regionState[regionId].stackIds;
    arr.splice(Math.min(Math.max(insertIdx, 0), arr.length), 0, stackId);
    const positions = layoutRegion(regionId, stackId); // animate others, skip inserted stack
    if (oldRegionId && oldRegionId !== regionId) layoutRegion(oldRegionId);
    return positions;
  }

  // ── Insertion indicator ─────────────────────────────────────────────────────
  function setIndicatorEl(el) { _indicatorEl = el; }

  // Returns { insertIdx, lineX } for where the dragged stack would be inserted.
  function computeInsertInfo(regionId, dragCenterXTilt, dragCenterYTilt, excludeStackId) {
    const rp       = regionPx(regionId);
    const cw       = cardWidthPx(), ch = cardHeightPx();
    const type     = REGIONS[regionId].type;
    const vert     = isVertical(regionId);
    const stackIds = regionState[regionId].stackIds;
    const n        = stackIds.length;

    if (n === 0) return vert
      ? { insertIdx: 0, lineY: rp.y + rp.h / 2 }
      : { insertIdx: 0, lineX: rp.x + rp.w / 2 };

    const ownIdx = excludeStackId !== null ? stackIds.indexOf(excludeStackId) : -1;
    const m = ownIdx !== -1 ? n - 1 : n;

    // ── Horizontal row: per-stack extents, variable anchor spacing ──────────────
    if (!vert && type === 'row') {
      const GAP         = cw * 0.1;
      const LEFT_BUFFER = cw * 0.15;
      const allExtents  = stackIds.map(sid => stackExtents(sid));
      const totalW      = allExtents.reduce((s, e) => s + e.leftExt + e.rightExt, 0) + (n - 1) * GAP + LEFT_BUFFER;
      let startVisualX;
      if (totalW <= rp.w) {
        startVisualX = rp.x + LEFT_BUFFER;
      } else {
        const maxScroll = totalW - rp.w;
        const scrollOff = Math.min(Math.max(regionState[regionId].scrollOffset || 0, 0), maxScroll);
        startVisualX = rp.x + LEFT_BUFFER - scrollOff;
      }

      const anchors = [];
      let x = startVisualX;
      for (let i = 0; i < n; i++) {
        anchors.push(x + allExtents[i].leftExt);
        x += allExtents[i].leftExt + allExtents[i].rightExt + GAP;
      }

      let rawInsertIdx = 0;
      for (let i = 0; i < n; i++) {
        if (dragCenterXTilt > anchors[i] + cw / 2) rawInsertIdx = i + 1;
      }
      const insertIdx = (ownIdx !== -1 && ownIdx < rawInsertIdx) ? rawInsertIdx - 1 : rawInsertIdx;
      const slotOf    = (j) => (ownIdx !== -1 && j >= ownIdx) ? j + 1 : j;

      let lineX;
      if (m === 0) {
        lineX = rp.x + rp.w / 2;
      } else if (insertIdx === 0) {
        const s0 = slotOf(0);
        lineX = anchors[s0] - allExtents[s0].leftExt - 2;
      } else if (insertIdx >= m) {
        const sL = slotOf(m - 1);
        lineX = anchors[sL] + allExtents[sL].rightExt + 2;
      } else {
        const sA = slotOf(insertIdx - 1), sB = slotOf(insertIdx);
        lineX = (anchors[sA] + allExtents[sA].rightExt + anchors[sB] - allExtents[sB].leftExt) / 2;
      }
      return { insertIdx, lineX };
    }

    // ── Uniform-spacing path (vertical row, horizontal fan, vertical fan) ───────
    let start, spacing, cardDim, regionExtent, regionOrigin;
    if (vert) {
      cardDim       = ch;
      regionExtent  = rp.h;
      regionOrigin  = rp.y;
      if (type === 'row') {
        spacing         = ch * 1.1;
        const totalH    = (n - 1) * spacing + ch;
        if (totalH <= rp.h) {
          start = rp.y + (rp.h - totalH) / 2;
        } else {
          const maxScroll = totalH - rp.h;
          const scrollOff = Math.min(Math.max(regionState[regionId].scrollOffset || 0, 0), maxScroll);
          start = rp.y - scrollOff;
        }
      } else { // fan
        const minSpacing = ch * 0.20;
        if (n * ch <= rp.h) {
          start   = rp.y;
          spacing = ch;
        } else {
          const overlapSpacing = n > 1 ? (rp.h - ch) / (n - 1) : ch;
          if (overlapSpacing >= minSpacing) {
            start   = rp.y;
            spacing = overlapSpacing;
          } else {
            const totalH    = (n - 1) * minSpacing + ch;
            const maxScroll = totalH - rp.h;
            const scrollOff = Math.min(Math.max(regionState[regionId].scrollOffset || 0, 0), maxScroll);
            start   = rp.y - scrollOff;
            spacing = minSpacing;
          }
        }
      }
    } else { // horizontal fan
      const LEFT_BUFFER = cw * 0.30;
      const availW      = rp.w - LEFT_BUFFER;
      cardDim       = cw;
      regionExtent  = rp.w;
      regionOrigin  = rp.x;
      const minSpacing = cw * 0.20;
      if (n * cw <= availW) {
        start   = rp.x + LEFT_BUFFER;
        spacing = cw;
      } else {
        const overlapSpacing = n > 1 ? (availW - cw) / (n - 1) : cw;
        if (overlapSpacing >= minSpacing) {
          start   = rp.x + LEFT_BUFFER;
          spacing = overlapSpacing;
        } else {
          const totalW    = (n - 1) * minSpacing + cw + LEFT_BUFFER;
          const maxScroll = totalW - rp.w;
          const scrollOff = Math.min(Math.max(regionState[regionId].scrollOffset || 0, 0), maxScroll);
          start   = rp.x + LEFT_BUFFER - scrollOff;
          spacing = minSpacing;
        }
      }
    }

    const dragCenter = vert ? dragCenterYTilt : dragCenterXTilt;
    let rawInsertIdx = 0;
    for (let i = 0; i < n; i++) {
      if (dragCenter > start + i * spacing + cardDim / 2) rawInsertIdx = i + 1;
    }

    const insertIdx = (ownIdx !== -1 && ownIdx < rawInsertIdx) ? rawInsertIdx - 1 : rawInsertIdx;
    const slotOf    = (j) => (ownIdx !== -1 && j >= ownIdx) ? j + 1 : j;

    let line;
    if (m === 0) {
      line = regionOrigin + regionExtent / 2;
    } else if (insertIdx === 0) {
      line = start + slotOf(0) * spacing - 2;
    } else if (insertIdx >= m) {
      line = start + slotOf(m - 1) * spacing + cardDim + 2;
    } else {
      const slotA = slotOf(insertIdx - 1);
      const slotB = slotOf(insertIdx);
      line = start + (slotA + slotB) * spacing / 2 + cardDim / 2;
    }

    return vert ? { insertIdx, lineY: line } : { insertIdx, lineX: line };
  }

  function showInsertionIndicator(regionId, dragCenterXTilt, dragCenterYTilt, excludeStackId) {
    if (!_indicatorEl) return 0;
    const scrollOuter = scrollOuters[regionId];
    if (!scrollOuter) return 0;
    const rp   = regionPx(regionId);
    const cw   = cardWidthPx(), ch = cardHeightPx();
    const vert = isVertical(regionId);
    const info = computeInsertInfo(regionId, dragCenterXTilt, dragCenterYTilt, excludeStackId);
    if (_indicatorEl.parentElement !== scrollOuter) scrollOuter.appendChild(_indicatorEl);
    _indicatorEl.style.display = 'block';
    if (vert) {
      const indicatorW = cw * 1.5;
      _indicatorEl.style.top       = (info.lineY - rp.y) + 'px';
      _indicatorEl.style.left      = ((rp.w - indicatorW) / 2) + 'px';
      _indicatorEl.style.width     = indicatorW + 'px';
      _indicatorEl.style.height    = '3px';
      _indicatorEl.style.transform = 'translateY(-50%)';
    } else {
      const indicatorH = ch * 1.5;
      _indicatorEl.style.left      = (info.lineX - rp.x) + 'px';
      _indicatorEl.style.top       = ((rp.h - indicatorH) / 2) + 'px';
      _indicatorEl.style.width     = '3px';
      _indicatorEl.style.height    = indicatorH + 'px';
      _indicatorEl.style.transform = 'translateX(-50%)';
    }
    return info.insertIdx;
  }

  function hideInsertionIndicator() {
    if (_indicatorEl) _indicatorEl.style.display = 'none';
  }

  function setAfterLayoutHook(fn) { _afterLayoutHook = fn; }

  // Animates all cards in the region to their layout positions.
  // Skips cards whose stack matches excludeStackId (used for the inserted stack).
  function layoutRegion(regionId, excludeStackId = null) {
    if (!regionId || !REGIONS[regionId] || REGIONS[regionId].type === 'free') return null;
    let positions;
    switch (REGIONS[regionId].type) {
      case 'row':  positions = layoutRow(regionId);  break;
      case 'fan':  positions = layoutFan(regionId);  break;
      case 'pile': positions = layoutPile(regionId); break;
      default: return null;
    }
    positions.forEach(pos => {
      const card = cards[pos.cardId];
      if (excludeStackId !== null && card.stackId === excludeStackId) return;
      animateCardTo(card, pos.left, pos.top, pos.rot, pos.zIndex, 300, pos.stackZ || 0);
    });
    if (_afterLayoutHook) _afterLayoutHook(regionId);
    return positions;
  }

  return {
    initLayout, regionPx, findRegionAtPoint,
    setScrollOuter, clearScrollOuters,
    tiltSpacePosOf, ensureCardParent, moveCardToTilt, moveCardFromTilt, moveStackToTilt,
    stackCardOffsets, stackBaseCardIds,
    rowTotalWidth,
    layoutRow, layoutFan, layoutPile,
    placeCardAt, animateCardTo,
    insertStackAtIndex,
    setIndicatorEl, showInsertionIndicator, hideInsertionIndicator,
    setAfterLayoutHook,
    layoutRegion,
  };
}

import { BASE_LIFT, pileStackZPx, MAX_PILE_VISUAL_DEPTH, layerZPx, scaleDuration, dvhPx, cardTransform } from './config';
import { ease, easeOut } from './animation';

// How far each attachment peeks out past the stack's current edge, as a fraction
// of card width. Matches the 2D renderer, which peeks a fixed ATTACHMENT_OFFSET
// (3.5dvh) against a default card width of cardDefaultW * cardSize (0.72 * 16 =
// 11.52dvh) → 3.5/11.52 ≈ 0.30. Expressed as a fraction here so the peek scales
// with zoom instead of shrinking relative to the cards.
const ATTACH_OFFSET_X = 0.50;
// Vertical equivalent for top/bottom attachments, as a fraction of card height.
// Chosen so the peek is the same on-screen distance as ATTACH_OFFSET_X on a
// default portrait card (w/h ≈ 0.72), keeping the two axes visually consistent.
const ATTACH_OFFSET_Y = 0.36;

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

  // A card's rendered box. Cards render at their own face aspect ratio (see
  // applyCardDims), which can differ a lot from the global default — a tall
  // skinny card is both taller and narrower — so any layout that must not clip
  // has to measure the card rather than assume the default box. Falls back to
  // the default for cards with no face data yet (demo mode, pre-measure).
  function cardBox(cardId) {
    const card = cards[cardId];
    const w    = card?.renderedW || cardWidthPx();
    const h    = card?.renderedH || cardHeightPx();
    // Cards are scaleY'd up as the table tilts (cardHeightScaleForTilt) to undo
    // the perspective foreshortening. That scale is about the card's center —
    // .dnc3d-card takes the default transform-origin — so the card's visible box
    // overhangs its element box by half the growth at BOTH ends. `over` is that
    // overhang: a card laid out flush with an edge has it clipped away, so any
    // layout that anchors against an edge has to leave room for it.
    const hs   = card?.cardEl?._heightScale || 1;
    const over = (hs - 1) * h / 2;
    return { w, h, over };
  }

  // Returns how far a stack visually extends on each side of its anchor point.
  // Horizontally the slot is sized for the base card's rotation sweep — an
  // exhausted card turns 90° about its own center, so it needs max(w, h) of
  // width to clear its neighbours; vertically a portrait card is never taller
  // rotated than upright, so the rendered heights alone bound the slot. The
  // sweep deliberately measures the unscaled height, so a row's along-axis
  // spacing doesn't breathe in and out as the table tilts.
  function stackExtents(sid) {
    const stack = stacks[sid];
    const base  = cardBox(stack.cardIds[0]);

    // The sweep box is centered on the base card's own center (anchor.x + w/2),
    // so it reaches (sweep - w)/2 left of the anchor. For a default portrait
    // card this reduces to exactly the old (cw-ch)/2 … (cw+ch)/2 slot.
    const sweep = Math.max(base.w, base.h);
    let leftExt   = (sweep - base.w) / 2;
    let rightExt  = (sweep + base.w) / 2;
    let topExt    = 0;
    let bottomExt = 0;

    // Top/bottom carry the tilt overhang so the stack's *visible* edges — not
    // its element boxes — are what the row packs against its region.
    stackCardOffsets(stack).forEach(({ cardId, dx, dy }) => {
      const { w, h, over } = cardBox(cardId);
      leftExt   = Math.max(leftExt,   -dx);
      rightExt  = Math.max(rightExt,  dx + w);
      topExt    = Math.max(topExt,    over - dy);
      bottomExt = Math.max(bottomExt, dy + h + over);
    });

    return { leftExt, rightExt, topExt, bottomExt };
  }

  // Gap between adjacent stacks in a row region, along the row's axis. Negative
  // horizontally (slots are ch wide for rotation headroom, so they may overlap);
  // vertically it reproduces the old uniform ch * 1.1 slot spacing.
  function rowGap(vert) {
    return vert ? cardHeightPx() * 0.1 : cardWidthPx() * -0.15;
  }
  // Buffer before the first stack, so its leading edge isn't flush with the region.
  function rowStartBuffer(vert) {
    return vert ? 0 : cardWidthPx() * 0.15;
  }
  // Extents of a stack along the row's axis: near = toward the row's start.
  function rowStackExtents(sid, vert) {
    const e = stackExtents(sid);
    return vert
      ? { nearExt: e.topExt,  farExt: e.bottomExt }
      : { nearExt: e.leftExt, farExt: e.rightExt };
  }

  // Total visual extent of all stacks in a row region along its axis
  // (width for a horizontal row, height for a vertical one), including the buffer.
  function rowTotalExtent(regionId) {
    const stackIds = regionState[regionId].stackIds;
    const vert     = isVertical(regionId);
    if (!stackIds.length) return vert ? regionPx(regionId).h : regionPx(regionId).w;
    const total = stackIds.reduce((sum, sid) => {
      const { nearExt, farExt } = rowStackExtents(sid, vert);
      return sum + nearExt + farExt;
    }, 0);
    return total + (stackIds.length - 1) * rowGap(vert) + rowStartBuffer(vert);
  }

  function regionLayerZ(regionId) {
    return layerZPx(cardHeightPx()) * (REGIONS[regionId]?.layerIndex || 0);
  }

  // ── Layout functions ────────────────────────────────────────────────────────
  // All layout functions return an array of:
  //   { cardId, left, top, rot, zIndex, stackZ }
  // where left/top are tilt-space coordinates.

  function stackCardOffsets(stack) {
    const cw    = cardWidthPx();
    const ch    = cardHeightPx();
    const peekX = cw * ATTACH_OFFSET_X;
    const peekY = ch * ATTACH_OFFSET_Y;
    const base  = cards[stack.cardIds[0]];
    let leftEdge   = 0;
    let rightEdge  = base?.renderedW || cw;
    let topEdge    = 0;
    let bottomEdge = base?.renderedH || ch;

    return stack.cardIds.map((cid, cardIdx) => {
      if (cardIdx === 0) return { cardId: cid, dx: 0, dy: 0 };

      const card      = cards[cid];
      const direction = card?.attachmentDirection;
      if (direction === 'left') {
        leftEdge -= peekX;
        return { cardId: cid, dx: leftEdge, dy: 0 };
      }
      if (direction === 'top') {
        topEdge -= peekY;
        return { cardId: cid, dx: 0, dy: topEdge };
      }
      if (direction === 'bottom') {
        // Same "align the card's own far edge" reasoning as `right`, on the Y axis.
        const height = card?.renderedH || ch;
        const dy = bottomEdge - height + peekY;
        bottomEdge += peekY;
        return { cardId: cid, dx: 0, dy };
      }
      if (direction === 'behind') {
        // Hidden under the parent — the stack's z-order (base card highest,
        // attachments descending) already tucks it completely away. While the
        // stack is being looked under, the hidden cards fan downward at half a
        // peek each, exactly as the 2D renderer fans them.
        if (!stack.lookingUnder) return { cardId: cid, dx: 0, dy: 0, behind: true };
        const height = card?.renderedH || ch;
        const dy = bottomEdge - height + peekY / 2;
        bottomEdge += peekY / 2;
        return { cardId: cid, dx: 0, dy, behind: true };
      }
      // 'right', and the fallback for a card with no direction recorded yet.
      // Align the card's own (possibly narrower) right edge so it always
      // peeks out past the stack's current right edge, rather than offsetting
      // by a fraction of the shared default card width — otherwise narrow
      // attachments get fully hidden behind a wider parent/sibling.
      const width = card?.renderedW || cw;
      const dx = rightEdge - width + peekX;
      rightEdge += peekX;
      return { cardId: cid, dx, dy: 0 };
    });
  }

  // The outermost card on each side of a stack — the card whose edge the attach
  // hit-test measures against, so a new attachment lands outside the existing ones.
  function stackBaseCardIds(stack) {
    if (!stack?.cardIds?.length) {
      return { leftCardId: null, rightCardId: null, topCardId: null, bottomCardId: null };
    }

    const parentCardId = stack.cardIds[0];
    let leftCardId   = parentCardId;
    let rightCardId  = parentCardId;
    let topCardId    = parentCardId;
    let bottomCardId = parentCardId;
    let leftMostDx   = 0;
    let rightMostDx  = 0;
    let topMostDy    = 0;
    let bottomMostDy = 0;

    stackCardOffsets(stack).forEach(({ cardId, dx, dy }) => {
      const direction = cards[cardId]?.attachmentDirection;
      if (direction === 'left'   && dx < leftMostDx)   { leftMostDx   = dx; leftCardId   = cardId; }
      if (direction === 'right'  && dx > rightMostDx)  { rightMostDx  = dx; rightCardId  = cardId; }
      if (direction === 'top'    && dy < topMostDy)    { topMostDy    = dy; topCardId    = cardId; }
      if (direction === 'bottom' && dy > bottomMostDy) { bottomMostDy = dy; bottomCardId = cardId; }
    });

    return { leftCardId, rightCardId, topCardId, bottomCardId };
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
    const lz = regionLayerZ(regionId);

    // Both orientations walk their axis stack by stack, spacing each slot by that
    // stack's own extents so attachments (left/right in a horizontal row,
    // top/bottom in a vertical one) push their neighbours out of the way.
    const vert   = isVertical(regionId);
    const GAP    = rowGap(vert);
    const BUFFER = rowStartBuffer(vert);
    const total  = rowTotalExtent(regionId);
    const size   = vert ? rp.h : rp.w;
    const origin = vert ? rp.y : rp.x;
    // The cross-axis position: rows center each stack across their short side,
    // measured on that stack's base card so an odd-sized card sits centered on
    // its own box rather than on the default one. No tilt overhang term here —
    // the scale is symmetric about the center, so centering the element box
    // centers the visible box too.
    const crossOf = (sid) => {
      const base = cardBox(stacks[sid].cardIds[0]);
      return vert ? rp.x + (rp.w - base.w) / 2 : rp.y + (rp.h - base.h) / 2;
    };

    // Both orientations start flush against the region's leading edge, matching
    // the 2D renderer (a row region there is plain block flow from the top/left).
    // Centering a vertical row would push a taller-than-default card down past
    // the region's clipped bottom edge.
    const maxScroll = Math.max(0, total - size);
    const rs        = regionState[regionId];
    rs.scrollOffset = Math.min(Math.max(rs.scrollOffset || 0, 0), maxScroll);
    const start     = origin + BUFFER - rs.scrollOffset;

    const positions = [];
    let pos = start;
    stackIds.forEach((sid, slotIdx) => {
      const { nearExt, farExt } = rowStackExtents(sid, vert);
      const anchor = pos + nearExt;
      const cross  = crossOf(sid);
      positions.push(...stackPositionsAtAnchor(
        stacks[sid],
        vert ? cross : anchor,
        vert ? anchor : cross,
        slotIdx * 100,
        lz,
      ));
      pos += nearExt + farExt + GAP;
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

  // A region's `rotation` game-def key, normalized into [0, 360). Only pile
  // regions honor it today; every other layout ignores it, so authors who set it
  // elsewhere get no effect rather than a broken row.
  function regionRotation(regionId) {
    const raw = REGIONS[regionId]?.rotation;
    if (!raw) return 0;
    return ((raw % 360) + 360) % 360;
  }

  // Geometry of a pile region's single card slot. A pile rotated a quarter turn
  // lies on its side, so its slot is landscape (ch wide by cw tall); 0/180 keep
  // the upright portrait slot. Shared with the engine so the count badge and the
  // shuffle riffle anchor on exactly the same box layoutPile uses.
  function pileSlot(regionId) {
    const rp          = regionPx(regionId);
    const cw          = cardWidthPx(), ch = cardHeightPx();
    const rot         = regionRotation(regionId);
    const sideways    = rot % 180 === 90;
    const slotW       = sideways ? ch : cw;
    const slotH       = sideways ? cw : ch;
    const LEFT_BUFFER = cw * 0.15;
    const x           = rp.x + LEFT_BUFFER + (rp.w - LEFT_BUFFER - slotW) / 2;
    const y           = rp.y + (rp.h - slotH) / 2;
    return {
      rot, sideways, slotW, slotH,
      // Slot centre, and the top-left a default-sized (cw x ch) upright card box
      // needs to sit centred on it — the anchor stack offsets build from.
      centerX: x + slotW / 2,
      centerY: y + slotH / 2,
      left: x + (slotW - cw) / 2,
      top:  y + (slotH - ch) / 2,
      bottom: y + slotH,
    };
  }

  function layoutPile(regionId) {
    const stackIds = regionState[regionId].stackIds;
    const ch       = cardHeightPx();
    const slot     = pileSlot(regionId);
    const lz       = regionLayerZ(regionId);
    const positions = [];
    stackIds.forEach((sid, slotIdx) => {
      const stack = stacks[sid];
      const cappedIdx = Math.min(slotIdx, MAX_PILE_VISUAL_DEPTH - 1);
      const rawPositions = stackPositionsAtAnchor(stack, slot.left, slot.top, slotIdx * 100, cappedIdx * pileStackZPx(ch) + lz);
      rawPositions.forEach(pos => {
        const card = cards[pos.cardId];
        const rw = card.renderedW, rh = card.renderedH;
        // A landscape root card turns 90° to line up with its portrait
        // neighbours; the region's own rotation then turns that upright slot.
        const landscape = !!(rw && rh && rw > rh * 1.05);
        const rot = (slot.rot + (landscape ? 90 : 0)) % 360;
        // Re-center the card's own box on the slot center — rotation is about
        // that center, and cards may render at their own size.
        if (rw && rh && rot && !card.attachmentDirection) {
          pos.rot  = rot;
          pos.left = slot.centerX - rw / 2;
          pos.top  = slot.centerY - rh / 2;
        }
        positions.push(pos);
      });
    });
    return positions;
  }

  // Layout functions return tilt-space coords. placeCardAt / animateCardTo convert
  // to container-relative when placing cards inside a scroll outer.

  // Keep a card's token host spun to match the card's full visual rotation —
  // layout rotation (sideways regions) + game rotation (exhaust). The host hangs
  // off liftEl, which never carries the card's rotateY/rotateZ, so without this
  // the +/- token regions stay screen-aligned and "add" is always the screen-top
  // half no matter how the card is turned. The per-token label/extrude
  // counter-rotation (reading the Redux game rotation in React) cancels the game
  // portion back to upright/screen-down, exactly as before. Mirroring cardEl's
  // transition keeps the tokens spinning in lockstep with the card.
  function applyTokenHostRotation(card) {
    if (!card) return;
    const total      = (card.cardEl._layoutRotation || 0) + (card.cardEl._gameRotation || 0);
    const transition = card.cardEl.style.transition || '';
    const th = card.tokenHostEl;
    if (th) {
      th.style.transition = transition;
      th.style.transform  = `translateZ(1px) rotate(${total}deg)`;
    }
    // The ability-bolt host follows the same full rotation so the bolt tracks the
    // card's rotated top-right corner (mirrors the 2D AbilityButton).
    const ah = card.abilityHostEl;
    if (ah) {
      ah.style.transition = transition;
      ah.style.transform  = `translateZ(2px) rotate(${total}deg)`;
    }
  }

  function placeCardAt(card, left, top, rot, zIdx, stackZ = 0) {
    ensureCardParent(card);
    // placeCardAt is the instant primitive — clear any lingering transform
    // transition (e.g. from a recent game-rotation) so nothing animates, and any
    // in-flight elevation (a canceled arc would otherwise leave liftPx stale).
    if (card.cardEl._rotTransId) { clearTimeout(card.cardEl._rotTransId); card.cardEl._rotTransId = null; }
    card.cardEl.style.transition = '';
    card.liftPx = 0;
    const o = originOf(card.regionId);
    card.liftEl.style.left      = (left - o.x) + 'px';
    card.liftEl.style.top       = (top  - o.y) + 'px';
    card.liftEl.style.zIndex    = zIdx;
    card.pileZ                  = stackZ;
    card.liftEl.style.transform = `translateZ(${BASE_LIFT + stackZ}px)`;
    card.cardEl._layoutRotation = rot;
    card.cardEl.style.transform = cardTransform(card.cardEl._angle, rot + (card.cardEl._gameRotation || 0), 1, 0, card.cardEl._heightScale || 1);
    applyTokenHostRotation(card);
  }

  function animateCardTo(card, targetLeft, targetTop, targetRot, targetZ, duration = 300, targetStackZ = 0) {
    if (card.cardEl._animating) return;
    // Canceling a layout animation takes ownership of the card; an interrupted
    // arc (animateCardArc) would otherwise leave a stale mid-hop liftPx that
    // reads as "in flight" elsewhere. Cards under layout animation rest at 0.
    if (card.layoutAnimId) { cancelAnimationFrame(card.layoutAnimId); card.layoutAnimId = null; card.liftPx = 0; }
    const { left: fromLeft, top: fromTop } = tiltSpacePosOf(card);
    const fromRot    = card.cardEl._layoutRotation || 0;
    const fromStackZ = card.pileZ || 0;
    const start      = performance.now();
    const durationMs = scaleDuration(duration);
    ensureCardParent(card);
    // Reparenting may have moved the card between tilt space and a scroll-outer.
    // Write the start position in the (possibly new) parent's coordinate space
    // now, before the first rAF frame, so the element's left/top stay consistent
    // with its parent. Otherwise a synchronous tiltSpacePosOf in the same tick
    // (e.g. a second layout pass during one reconcile) reads the stale tilt-space
    // value through the new scroll-outer parent and double-counts the origin —
    // the card jumps out by the region offset, then eases back.
    {
      const o = originOf(card.regionId);
      card.liftEl.style.left = (fromLeft - o.x) + 'px';
      card.liftEl.style.top  = (fromTop  - o.y) + 'px';
    }
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
      card.cardEl.style.transform = cardTransform(card.cardEl._angle, card.cardEl._layoutRotation + (card.cardEl._gameRotation || 0), 1, 0, card.cardEl._heightScale || 1);
      applyTokenHostRotation(card);
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

  // Like animateCardTo, but lifts the card off the table along a parabolic Z arc
  // (rise → peak → drop) while it travels, instead of sliding flat. Used when
  // another player moves a card/stack so observers see it pick up, fly over, and
  // set down rather than skate across the surface (or teleport).
  // The XY uses a symmetric ease (accelerate then decelerate) so the move reads as
  // a deliberate pickup-and-place rather than easeOut's fast-start "teleport".
  // liftPx is the peak height of the hop in tilt-space px; pass a shared value for
  // every card in a stack so the whole stack rises and falls in unison.
  // options.inTiltPlane: the caller has already reparented the card into the tilt
  //   plane (moveCardToTilt) and target coords are tilt-space — fly it there
  //   without reparenting, so a clipping destination scroll-outer can't cut the
  //   flight off; the caller lands it (moveCardFromTilt) in options.onComplete.
  function animateCardArc(card, targetLeft, targetTop, targetRot, targetZ, duration = 360, targetStackZ = 0, liftPx = 0, options = {}) {
    if (card.cardEl._animating) return;
    if (card.layoutAnimId) { cancelAnimationFrame(card.layoutAnimId); card.layoutAnimId = null; }
    const { left: fromLeft, top: fromTop } = tiltSpacePosOf(card);
    const fromRot    = card.cardEl._layoutRotation || 0;
    const fromStackZ = card.pileZ || 0;
    const start      = performance.now();
    const durationMs = scaleDuration(duration);
    if (!options.inTiltPlane) ensureCardParent(card);
    // Float above the table for the duration of the hop so the card paints over
    // whatever it flies across; the resting z-index (targetZ) is restored on land.
    // The +targetZ keeps a stack's cards in their correct relative order in flight.
    card.liftEl.style.zIndex = 100000 + targetZ;
    function frame(now) {
      const t = Math.min((now - start) / durationMs, 1);
      const e = ease(t);
      // Resting Z interpolates toward the destination; the hop adds a sine bump on
      // top so the card is highest at the midpoint and settles flush at the end.
      const restZ = fromStackZ + (targetStackZ - fromStackZ) * e;
      const bump  = Math.sin(Math.PI * t) * liftPx;
      const o = options.inTiltPlane ? { x: 0, y: 0 } : originOf(card.regionId);
      card.pileZ  = restZ;
      // Track the hop height in liftPx (the drag system's "elevation above rest")
      // so concurrent reconcile paths treat the card as in flight — e.g. a flip
      // arriving mid-hop takes the drop-flip path from the current height instead
      // of yanking the card to the table.
      card.liftPx = bump;
      card.liftEl.style.left      = (fromLeft + (targetLeft - fromLeft) * e - o.x) + 'px';
      card.liftEl.style.top       = (fromTop  + (targetTop  - fromTop)  * e - o.y) + 'px';
      card.liftEl.style.transform = `translateZ(${BASE_LIFT + restZ + bump}px)`;
      card.cardEl._layoutRotation = fromRot + (targetRot - fromRot) * e;
      card.cardEl.style.transform = cardTransform(card.cardEl._angle, card.cardEl._layoutRotation + (card.cardEl._gameRotation || 0), 1, 0, card.cardEl._heightScale || 1);
      applyTokenHostRotation(card);
      if (t < 1) {
        card.layoutAnimId = requestAnimationFrame(frame);
      } else {
        card.layoutAnimId = null;
        card.pileZ  = targetStackZ;
        card.liftPx = 0;
        card.liftEl.style.transform = `translateZ(${BASE_LIFT + targetStackZ}px)`;
        card.liftEl.style.zIndex = targetZ;
        if (card.regionId && REGIONS[card.regionId].type === 'free') {
          const tw = parseFloat(_tiltEl.style.width);
          const th = parseFloat(_tiltEl.style.height);
          card.fracX = targetLeft / tw;
          card.fracY = targetTop  / th;
        }
        if (options.onComplete) options.onComplete();
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

    // ── Rows: per-stack extents, variable anchor spacing (mirrors layoutRow) ────
    if (type === 'row') {
      const GAP        = rowGap(vert);
      const BUFFER     = rowStartBuffer(vert);
      const allExtents = stackIds.map(sid => rowStackExtents(sid, vert));
      const total      = allExtents.reduce((s, e) => s + e.nearExt + e.farExt, 0) + (n - 1) * GAP + BUFFER;
      const size       = vert ? rp.h : rp.w;
      const origin     = vert ? rp.y : rp.x;
      // Half a stack's own extent along the row axis — the midpoint the drag has
      // to cross to land after that stack. Per-stack so an odd-sized card's
      // midpoint tracks the card the pointer actually sees.
      const halfOf     = (sid) => {
        const base = cardBox(stacks[sid].cardIds[0]);
        return (vert ? base.h : base.w) / 2;
      };
      const maxScroll = Math.max(0, total - size);
      const scrollOff = Math.min(Math.max(regionState[regionId].scrollOffset || 0, 0), maxScroll);
      const start     = origin + BUFFER - scrollOff;

      const anchors = [];
      let p = start;
      for (let i = 0; i < n; i++) {
        anchors.push(p + allExtents[i].nearExt);
        p += allExtents[i].nearExt + allExtents[i].farExt + GAP;
      }

      const dragCenter = vert ? dragCenterYTilt : dragCenterXTilt;
      let rawInsertIdx = 0;
      for (let i = 0; i < n; i++) {
        if (dragCenter > anchors[i] + halfOf(stackIds[i])) rawInsertIdx = i + 1;
      }
      const insertIdx = (ownIdx !== -1 && ownIdx < rawInsertIdx) ? rawInsertIdx - 1 : rawInsertIdx;
      const slotOf    = (j) => (ownIdx !== -1 && j >= ownIdx) ? j + 1 : j;

      let line;
      if (m === 0) {
        line = origin + size / 2;
      } else if (insertIdx === 0) {
        const s0 = slotOf(0);
        line = anchors[s0] - allExtents[s0].nearExt - 2;
      } else if (insertIdx >= m) {
        const sL = slotOf(m - 1);
        line = anchors[sL] + allExtents[sL].farExt + 2;
      } else {
        const sA = slotOf(insertIdx - 1), sB = slotOf(insertIdx);
        line = (anchors[sA] + allExtents[sA].farExt + anchors[sB] - allExtents[sB].nearExt) / 2;
      }
      return vert ? { insertIdx, lineY: line } : { insertIdx, lineX: line };
    }

    // ── Uniform-spacing path (horizontal fan, vertical fan) ─────────────────────
    let start, spacing, cardDim, regionExtent, regionOrigin;
    if (vert) { // vertical fan
      cardDim       = ch;
      regionExtent  = rp.h;
      regionOrigin  = rp.y;
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
    } else if (insertIdx >= m) {
      // No card to the right — sit just past the trailing edge of the last card.
      line = start + slotOf(m - 1) * spacing + cardDim + 2;
    } else if (type === 'fan') {
      // Fans overlap their cards once crowded, so a midpoint line would float in
      // the overlap and read ambiguously. Align it with the leading edge of the
      // card to the right of the insertion point — the card the dropped stack
      // would land in front of. (With no overlap this equals the old midpoint.)
      line = start + slotOf(insertIdx) * spacing - 2;
    } else if (insertIdx === 0) {
      line = start + slotOf(0) * spacing - 2;
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
    // Keep the line shorter than the region so its rounded caps and the
    // end-fade gradient stay visible instead of being clipped by neighbors.
    // dvh-based so it scales with the table like the other table chrome.
    const endMargin = 0.5 * dvhPx(); // breathing room at each end for caps + glow
    const thin      = 0.3 * dvhPx(); // probe's thin dimension (overlay sets the visible band)
    if (vert) {
      const indicatorW = Math.min(cw * 1.5, Math.max(cw * 0.5, rp.w - 2 * endMargin));
      _indicatorEl.style.setProperty('--dnc3d-indicator-fade', 'to right');
      _indicatorEl.style.top       = (info.lineY - rp.y) + 'px';
      _indicatorEl.style.left      = ((rp.w - indicatorW) / 2) + 'px';
      _indicatorEl.style.width     = indicatorW + 'px';
      _indicatorEl.style.height    = thin + 'px';
      _indicatorEl.style.transform = 'translateY(-50%)';
    } else {
      const indicatorH = Math.min(ch * 1.5, Math.max(ch * 0.5, rp.h - 2 * endMargin));
      _indicatorEl.style.setProperty('--dnc3d-indicator-fade', 'to bottom');
      _indicatorEl.style.left      = (info.lineX - rp.x) + 'px';
      _indicatorEl.style.top       = ((rp.h - indicatorH) / 2) + 'px';
      _indicatorEl.style.width     = thin + 'px';
      _indicatorEl.style.height    = indicatorH + 'px';
      _indicatorEl.style.transform = 'translateX(-50%)';
    }
    // Pin two zero-size markers to the line's two ends. They ride the region's
    // tilted plane, so the overlay can read their projected screen positions and
    // draw its twin rotated to match the table's perspective (vs. axis-aligned).
    positionEndMarkers(vert);
    return info.insertIdx;
  }

  function positionEndMarkers(vert) {
    let ends = _indicatorEl.getElementsByClassName('dnc3d-insert-end');
    if (ends.length < 2) {
      while (_indicatorEl.firstChild) _indicatorEl.removeChild(_indicatorEl.firstChild);
      for (let i = 0; i < 2; i++) {
        const m = document.createElement('div');
        m.className = 'dnc3d-insert-end';
        _indicatorEl.appendChild(m);
      }
      ends = _indicatorEl.getElementsByClassName('dnc3d-insert-end');
    }
    if (vert) { // horizontal bar: ends at left & right edges, mid height
      ends[0].style.left = '0%';   ends[0].style.top = '50%';
      ends[1].style.left = '100%'; ends[1].style.top = '50%';
    } else {    // vertical bar: ends at top & bottom edges, mid width
      ends[0].style.left = '50%';  ends[0].style.top = '0%';
      ends[1].style.left = '50%';  ends[1].style.top = '100%';
    }
  }

  function hideInsertionIndicator() {
    if (_indicatorEl) _indicatorEl.style.display = 'none';
  }

  function setAfterLayoutHook(fn) { _afterLayoutHook = fn; }

  // Animates all cards in the region to their layout positions.
  // Skips cards whose stack matches excludeStackId (used for the inserted stack).
  // instant: place cards at their computed slots with no slide animation. Used
  // when opening browse, where the reveal is a "peek" ability and not a physical
  // move of the cards, so they should simply appear in the fan.
  function layoutRegion(regionId, excludeStackId = null, instant = false) {
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
      if (instant) {
        if (card.layoutAnimId) { cancelAnimationFrame(card.layoutAnimId); card.layoutAnimId = null; }
        placeCardAt(card, pos.left, pos.top, pos.rot, pos.zIndex, pos.stackZ || 0);
      } else {
        animateCardTo(card, pos.left, pos.top, pos.rot, pos.zIndex, 300, pos.stackZ || 0);
      }
    });
    if (_afterLayoutHook) _afterLayoutHook(regionId);
    return positions;
  }

  return {
    initLayout, regionPx, findRegionAtPoint,
    setScrollOuter, clearScrollOuters,
    tiltSpacePosOf, ensureCardParent, moveCardToTilt, moveCardFromTilt, moveStackToTilt,
    stackCardOffsets, stackBaseCardIds, stackPositionsAtAnchor,
    rowTotalExtent,
    layoutRow, layoutFan, layoutPile, pileSlot,
    placeCardAt, animateCardTo, animateCardArc, applyTokenHostRotation,
    insertStackAtIndex,
    setIndicatorEl, showInsertionIndicator, hideInsertionIndicator,
    setAfterLayoutHook,
    layoutRegion,
  };
}

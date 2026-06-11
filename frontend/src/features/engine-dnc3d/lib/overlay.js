import { PLAYER_COLORS, dvhPx } from './config';

// ── Targeting + arrow overlay ────────────────────────────────────────────────
//
// Card targeting (the spinning target icon with player numbers) and card-to-card
// arrows are drawn in a flat, screen-space layer that sits above the tilted
// table. Rather than re-deriving each card's projected position from the tilt /
// perspective maths, we read the card element's live getBoundingClientRect():
// that already reflects every transform applied to it (tilt, lift, drag,
// in-flight animations, region scroll), so the overlay tracks cards correctly
// in all of those cases for free.
//
// The active target/arrow set only changes on a game reconcile, so we rebuild
// that list there; a requestAnimationFrame loop then re-positions the existing
// overlay elements every frame while anything is on screen (cards may be moving
// without a reconcile, e.g. a local drag or settle animation).

const TARGET_IMG = process.env.PUBLIC_URL + '/images/other/target.png';

// White outline so the dark target number reads against any card art — mirrors
// the textShadow used by the 2D engine's Target component.
const LABEL_TEXT_SHADOW =
  'rgb(255,255,255) 2px 0 0, rgb(255,255,255) 1.75517px 0.958851px 0, ' +
  'rgb(255,255,255) 1.0806px 1.68294px 0, rgb(255,255,255) 0.141474px 1.99499px 0, ' +
  'rgb(255,255,255) -0.832294px 1.81859px 0, rgb(255,255,255) -1.60229px 1.19694px 0, ' +
  'rgb(255,255,255) -1.97999px 0.28224px 0, rgb(255,255,255) -1.87291px -0.701566px 0, ' +
  'rgb(255,255,255) -1.30729px -1.51361px 0, rgb(255,255,255) -0.421592px -1.95506px 0, ' +
  'rgb(255,255,255) 0.567324px -1.91785px 0, rgb(255,255,255) 1.41734px -1.41108px 0, ' +
  'rgb(255,255,255) 1.92034px -0.558831px 0';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createOverlay() {
  let _overlayEl = null; // flat screen-space layer, sibling of the tilt
  let _arrowSvg  = null; // <svg> child holding all arrow paths
  let _active    = false;
  let _raf       = null;

  let _targets = []; // [{ card, players: ['1', '2'] }]
  let _arrows  = []; // [{ fromCard, toCard, color }]

  // The insertion line lives at table level (under the dragged card) but we also
  // draw a screen-space twin up here so it stays visible ON TOP of the card. The
  // probe is the real table-level indicator element; we read its live rect each
  // frame and mirror it into `_insertLineEl`, so the twin tracks the gap exactly
  // without re-deriving the tilt/perspective projection.
  let _insertProbe  = null;
  let _insertLineEl = null;

  // Persistent target DOM per card id so the CSS spin animation isn't reset on
  // every frame (rebuilding the element would restart the animation).
  const _targetEls = new Map(); // cardId -> { wrap, label }

  function mount(stageEl) {
    if (!stageEl) return;
    _overlayEl = document.createElement('div');
    _overlayEl.className = 'dnc3d-overlay';
    _arrowSvg = document.createElementNS(SVG_NS, 'svg');
    _arrowSvg.setAttribute('class', 'dnc3d-overlay-arrows');
    _overlayEl.appendChild(_arrowSvg);
    // The white line is wrapped so the black outline can live as a drop-shadow on
    // the (unmasked) wrapper — a shadow on the line itself would be clipped by the
    // line's own mask.
    const wrap = document.createElement('div');
    wrap.className = 'dnc3d-insert-overlay-line-wrap';
    _insertLineEl = document.createElement('div');
    _insertLineEl.className = 'dnc3d-insert-overlay-line';
    wrap.appendChild(_insertLineEl);
    _overlayEl.appendChild(wrap);
    stageEl.appendChild(_overlayEl);
  }

  function unmount() {
    stop();
    if (_overlayEl) _overlayEl.remove();
    _overlayEl    = null;
    _arrowSvg     = null;
    _insertLineEl = null;
    _insertProbe  = null;
    _targets      = [];
    _arrows       = [];
  }

  // Point the screen-space twin at a table-level indicator element (or null to
  // hide it). Keeps the render loop alive while a probe is set.
  function setInsertProbe(el) {
    _insertProbe = el || null;
    if (_insertProbe) {
      start();
    } else {
      if (_insertLineEl) _insertLineEl.style.display = 'none';
      if (!_targets.length && !_arrows.length) stop();
    }
  }

  function renderInsertLine(originRect) {
    if (!_insertLineEl) return;
    const probe = _insertProbe;
    if (!probe || probe.style.display === 'none') {
      _insertLineEl.style.display = 'none';
      return;
    }
    // Read the two end markers' projected screen positions. Because they ride the
    // region's tilted plane, the segment between them already carries the table's
    // perspective skew — so the twin can be drawn rotated to match it.
    const ends = probe.getElementsByClassName('dnc3d-insert-end');
    if (ends.length < 2) { _insertLineEl.style.display = 'none'; return; }
    const ra = ends[0].getBoundingClientRect();
    const rb = ends[1].getBoundingClientRect();
    const ax = (ra.left + ra.width / 2) - originRect.left;
    const ay = (ra.top  + ra.height / 2) - originRect.top;
    const bx = (rb.left + rb.width / 2) - originRect.left;
    const by = (rb.top  + rb.height / 2) - originRect.top;

    const dx = bx - ax, dy = by - ay;
    const length = Math.hypot(dx, dy);
    if (!length) { _insertLineEl.style.display = 'none'; return; }
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const midX  = (ax + bx) / 2, midY = (ay + by) / 2;

    // The twin is a horizontal bar of width=length, rotated about its centre to
    // lie along the marker segment. Band width in dvh so it scales with the table;
    // the mask tapers it to a ~half-width bright core.
    const THICK = 0.8 * dvhPx();
    _insertLineEl.style.display   = 'block';
    _insertLineEl.style.width     = length + 'px';
    _insertLineEl.style.height    = THICK + 'px';
    _insertLineEl.style.left      = (midX - length / 2) + 'px';
    _insertLineEl.style.top       = (midY - THICK / 2) + 'px';
    _insertLineEl.style.transform = `rotate(${angle}deg)`;

    // Crossed-gradient mask in the bar's own (post-rotation) axes: one tapers
    // ACROSS the thickness (triangle — brightest at the centreline), the other
    // ALONG the length (solid, soft only near the tips). intersect ⇒ fades all
    // around. Constant now, since the bar is always length×THICK before rotation.
    const mask =
      'linear-gradient(to bottom, transparent 0%, #000 50%, transparent 100%),' +
      'linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%)';
    _insertLineEl.style.webkitMaskImage = mask;
    _insertLineEl.style.maskImage       = mask;
  }

  // Card center in overlay-local coordinates (overlay is inset:0 over the stage,
  // so its rect doubles as the coordinate origin). Returns null for cards that
  // aren't currently on screen (hidden region, zero-size, detached, or scrolled
  // into a scrollable region's clipped overflow).
  function centerOf(card, originRect) {
    const el = card?.cardEl;
    if (!el || card.liftEl?.style.display === 'none') return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    // getBoundingClientRect ignores ancestor overflow clipping, so a card
    // scrolled into a row/fan region's hidden overflow still reports a valid
    // rect. Skip it when its center lies outside its scroll-outer's clip box so
    // we don't paint a target/arrow onto a card that isn't actually visible.
    const clip = el.closest('.dnc3d-region-scroll-outer');
    if (clip) {
      const cr = clip.getBoundingClientRect();
      if (cx < cr.left || cx > cr.right || cy < cr.top || cy > cr.bottom) return null;
    }
    return {
      x: cx - originRect.left,
      y: cy - originRect.top,
      h: r.height,
    };
  }

  function makeTargetEl() {
    const wrap = document.createElement('div');
    wrap.className = 'dnc3d-target';
    const img = document.createElement('img');
    img.className = 'dnc3d-target-img';
    img.src = TARGET_IMG;
    img.draggable = false;
    const label = document.createElement('div');
    label.className = 'dnc3d-target-label';
    label.style.textShadow = LABEL_TEXT_SHADOW;
    wrap.appendChild(img);
    wrap.appendChild(label);
    return { wrap, label };
  }

  function renderArrows(originRect) {
    let markup = '';
    for (const a of _arrows) {
      const p1 = centerOf(a.fromCard, originRect);
      const p2 = centerOf(a.toCard,   originRect);
      if (!p1 || !p2) continue;

      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;

      // Gentle perpendicular bow so overlapping arrows between the same pair of
      // cards stay distinguishable and the line reads as directional.
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      const ux = dx / len, uy = dy / len;
      const curve = Math.min(len * 0.12, 50);
      const cx = mx - uy * curve, cy = my + ux * curve;

      // Arrowhead, sized to the source card and aimed along the curve's tangent
      // at the destination so it points correctly even on a bowed line.
      const sw = Math.max(2, p1.h * 0.045);
      const head = Math.max(10, Math.min(len * 0.22, p1.h * 0.4));
      let tdx = p2.x - cx, tdy = p2.y - cy;
      const tlen = Math.hypot(tdx, tdy) || 1;
      const ax = tdx / tlen, ay = tdy / tlen;
      const baseX = p2.x - ax * head, baseY = p2.y - ay * head;
      const halfW = head * 0.5;
      const lX = baseX - ay * halfW, lY = baseY + ax * halfW;
      const rX = baseX + ay * halfW, rY = baseY - ax * halfW;

      // End the curve at the arrowhead base so the stroke doesn't poke past the tip.
      markup +=
        `<path d="M ${p1.x} ${p1.y} Q ${cx} ${cy} ${baseX} ${baseY}" ` +
        `fill="none" stroke="${a.color}" stroke-width="${sw}" ` +
        `stroke-opacity="0.7" stroke-linecap="round"/>` +
        `<polygon points="${p2.x},${p2.y} ${lX},${lY} ${rX},${rY}" ` +
        `fill="${a.color}" fill-opacity="0.7"/>`;
    }
    _arrowSvg.innerHTML = markup;
  }

  function renderTargets(originRect) {
    const seen = new Set();
    for (const t of _targets) {
      const c = centerOf(t.card, originRect);
      if (!c) continue;
      let entry = _targetEls.get(t.card.id);
      if (!entry) {
        entry = makeTargetEl();
        _overlayEl.appendChild(entry.wrap);
        _targetEls.set(t.card.id, entry);
      }
      const size = c.h * 0.85;
      entry.wrap.style.left   = c.x + 'px';
      entry.wrap.style.top    = c.y + 'px';
      entry.wrap.style.width  = size + 'px';
      entry.wrap.style.height = size + 'px';
      const text = t.players.join('');
      if (entry.label.textContent !== text) entry.label.textContent = text;
      entry.label.style.fontSize = (size * 0.45) + 'px';
      seen.add(t.card.id);
    }
    for (const [id, entry] of _targetEls) {
      if (!seen.has(id)) { entry.wrap.remove(); _targetEls.delete(id); }
    }
  }

  function render() {
    if (!_overlayEl) return;
    const originRect = _overlayEl.getBoundingClientRect();
    renderArrows(originRect);
    renderTargets(originRect);
    renderInsertLine(originRect);
  }

  function tick() {
    render();
    if (_active) _raf = requestAnimationFrame(tick);
  }

  function start() {
    if (_active) return;
    _active = true;
    _raf = requestAnimationFrame(tick);
  }

  function stop() {
    _active = false;
    if (_raf) cancelAnimationFrame(_raf);
    _raf = null;
    if (_arrowSvg) _arrowSvg.innerHTML = '';
    if (_insertLineEl) _insertLineEl.style.display = 'none';
    for (const [, entry] of _targetEls) entry.wrap.remove();
    _targetEls.clear();
  }

  // Recompute the active target/arrow set from game state. Called on reconcile.
  // cards is the engine's card array; idMap maps dragncards card ids -> index.
  function rebuild(game, idMap, cards) {
    _targets = [];
    _arrows  = [];
    if (game && idMap && cards?.length) {
      const cardById = game.cardById || {};
      for (const [dcId, dcCard] of Object.entries(cardById)) {
        const i = idMap.get(dcId);
        if (i === undefined) continue;
        const card = cards[i];
        if (!card || !card.cardEl) continue;

        if (dcCard.targeting) {
          const players = [];
          for (const key of Object.keys(dcCard.targeting)) {
            const m = key.match(/^player(\d+)$/);
            if (m && dcCard.targeting[key]) players.push(m[1]);
          }
          if (players.length) _targets.push({ card, players });
        }

        if (dcCard.arrows) {
          for (const [playerKey, destIds] of Object.entries(dcCard.arrows)) {
            const color = PLAYER_COLORS[playerKey] || 'rgb(180,180,180)';
            for (const destDcId of destIds || []) {
              const j = idMap.get(destDcId);
              if (j === undefined) continue;
              const toCard = cards[j];
              if (!toCard || !toCard.cardEl) continue;
              _arrows.push({ fromCard: card, toCard, color });
            }
          }
        }
      }
    }

    if (_targets.length || _arrows.length || _insertProbe) start();
    else stop();
  }

  return { mount, unmount, rebuild, setInsertProbe };
}

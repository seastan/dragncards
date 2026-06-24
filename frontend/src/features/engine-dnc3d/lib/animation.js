import { BASE_LIFT, MAX_ZOOM, GROW, FLIP, SHRINK, OVERLAP, scaleDuration, cardTransform } from './config';

export function ease(t)    { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }
export function easeOut(t) { return t * (2 - t); }
export function easeIn(t)  { return t * t; }

// Animates a card flip.
// startLiftPx > 0: "drop-flip" mode — card is already elevated at that height,
// so skip the GROW phase and go straight to FLIP → SHRINK (rotate then descend).
// endLiftPx: the resting translateZ the card descends to (e.g. the top-of-pile
// stack height). Defaults to 0 (the table plane) for regular flips.
// startRestPx: the resting translateZ the regular (rise-fall) arc begins from,
// e.g. the top-of-pile height a card sits at before lifting off. Defaults to 0.
// direction: +1 (default) spins rotateY toward +180; -1 spins toward -180 (the
// opposite way), mirroring the lateral swing too. The caller is responsible for
// advancing cardEl._angle by direction*180 so the resting angle stays in sync.
export function animateFlip(cardEl, liftEl, startAngle, onComplete, startLiftPx = 0, endLiftPx = 0, startRestPx = 0, direction = 1) {
  const startTime      = performance.now();
  const LIFT           = window.innerHeight * 0.07 * (1 + MAX_ZOOM);
  const startLayoutRot = (cardEl._layoutRotation || 0) + (cardEl._gameRotation || 0);
  const flipMs         = scaleDuration(FLIP);
  const shrinkMs       = scaleDuration(SHRINK);
  const overlapMs      = scaleDuration(OVERLAP);

  const dropFlip = startLiftPx > 0;
  const growMs   = dropFlip ? 0 : scaleDuration(GROW);
  const t2       = dropFlip ? 0 : (growMs - overlapMs);
  // Drop-flip: no GROW phase, so start SHRINK only after FLIP fully completes
  // (no overlap). Regular flip: normal overlap between FLIP and SHRINK.
  const t3       = dropFlip ? flipMs : t2 + flipMs - overlapMs;
  const total    = t3 + shrinkMs;
  const peakLift = dropFlip ? startLiftPx : LIFT;

  function frame(now) {
    const elapsed = Math.min(now - startTime, total);

    const p1 = dropFlip ? 1 : ease(Math.min(elapsed / growMs, 1));
    const p2 = easeOut(Math.max(0, Math.min((elapsed - t2) / flipMs, 1)));
    const p3 = ease(Math.max(0, Math.min((elapsed - t3) / shrinkMs, 1)));

    const scale         = 1 + MAX_ZOOM * p1 - MAX_ZOOM * p3;
    const shadowVH      = Math.max(0, 1 * p1 - 1 * p3);
    const shadowOpacity = 0.7 - 0.4 * p1 + 0.4 * p3;
    const currentAngle  = startAngle + direction * 180 * p2;
    const tx            = direction * -25 * Math.sin(p2 * Math.PI);
    const lift          = dropFlip
      ? peakLift + (endLiftPx - peakLift) * p3
      // Regular flip: rise startRestPx → startRestPx+peakLift (GROW), then descend
      // to endLiftPx (SHRINK). startRestPx/endLiftPx default to 0 (table) so
      // ordinary in-place flips are unchanged.
      : Math.max(0, startRestPx + peakLift * p1 - (startRestPx + peakLift - endLiftPx) * p3);

    liftEl.style.transform = `translateZ(${BASE_LIFT + lift}px)`;
    cardEl.style.transform = cardTransform(currentAngle, startLayoutRot, scale, tx, cardEl._heightScale || 1);
    cardEl.style.boxShadow = `0 ${shadowVH}vh ${shadowVH * 2}vh rgba(0,0,0,${shadowOpacity})`;

    if (elapsed < total) {
      requestAnimationFrame(frame);
    } else {
      liftEl.style.transform = `translateZ(${BASE_LIFT + endLiftPx}px)`;
      cardEl.style.transform = cardTransform(startAngle + direction * 180, startLayoutRot, 1, 0, cardEl._heightScale || 1);
      cardEl.style.boxShadow = 'none';
      cardEl._animating      = false;
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(frame);
}

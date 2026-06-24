import {
  TOKEN_EXTRUDE_FILTER_ID,
  TOKEN_EXTRUDE_STEPS,
  TOKEN_EXTRUDE_DX,
  TOKEN_EXTRUDE_DY,
  TOKEN_EXTRUDE_COLOR,
  TOKEN_EXTRUDE_OPACITY,
  TOKEN_EXTRUDE_GROUND_BLUR,
  TOKEN_EXTRUDE_GROUND_OPACITY,
} from './lib/config';

// Hidden <svg> holding the reusable token-extrusion filter. Rendered once per
// table; every token references it via `filter: url(#...)`.
//
// Why one SVG filter instead of a chain of CSS drop-shadow()s: each chained CSS
// filter re-rasterizes the element, so an N-deep wall costs N passes per token.
// Here the whole wedge is built inside ONE filter region (one offscreen buffer),
// regardless of wall height — and every primitive reads SourceAlpha, so the
// fake side wall follows the PNG's transparency exactly.
//
// Pipeline:
//   1. side wall  — union of STEPS offset copies of SourceAlpha, flood-filled
//                   with the wall colour. The union (feMerge) of 1px-stepped
//                   silhouettes is a solid shape extended along (DX,DY).
//   2. ground     — a blurred, fully-offset SourceAlpha, flooded darker, to
//                   ground the token on the card (skipped if BLUR <= 0).
//   3. composite  — ground (back) / wall / original art (front).
export function Dnc3DTokenExtrudeFilter() {
  const steps = Array.from({ length: TOKEN_EXTRUDE_STEPS }, (_, i) => i + 1);
  const maxDx = TOKEN_EXTRUDE_DX * TOKEN_EXTRUDE_STEPS;
  const maxDy = TOKEN_EXTRUDE_DY * TOKEN_EXTRUDE_STEPS;
  const hasGround = TOKEN_EXTRUDE_GROUND_BLUR > 0;

  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
      <defs>
        {/* Region must be generous enough to contain the wall + blur, which
            extend beyond the token's own box. objectBoundingBox fractions. */}
        <filter
          id={TOKEN_EXTRUDE_FILTER_ID}
          x="-50%"
          y="-50%"
          width="200%"
          height="250%"
          colorInterpolationFilters="sRGB">
          {/* 1. side wall: offset copies of the alpha, then their union */}
          {steps.map((k) => (
            <feOffset
              key={k}
              in="SourceAlpha"
              dx={TOKEN_EXTRUDE_DX * k}
              dy={TOKEN_EXTRUDE_DY * k}
              result={`wallStep${k}`}
            />
          ))}
          <feMerge result="wallAlpha">
            {steps.map((k) => (
              <feMergeNode key={k} in={`wallStep${k}`} />
            ))}
          </feMerge>
          <feFlood floodColor={TOKEN_EXTRUDE_COLOR} floodOpacity={TOKEN_EXTRUDE_OPACITY} result="wallFlood" />
          <feComposite in="wallFlood" in2="wallAlpha" operator="in" result="wall" />

          {/* 2. soft contact shadow under the bottom of the wall */}
          {hasGround && (
            <>
              <feGaussianBlur in="SourceAlpha" stdDeviation={TOKEN_EXTRUDE_GROUND_BLUR} result="groundBlur" />
              <feOffset in="groundBlur" dx={maxDx} dy={maxDy} result="groundOffset" />
              <feFlood floodColor={TOKEN_EXTRUDE_COLOR} floodOpacity={TOKEN_EXTRUDE_GROUND_OPACITY} result="groundFlood" />
              <feComposite in="groundFlood" in2="groundOffset" operator="in" result="ground" />
            </>
          )}

          {/* 3. stack: ground (back) -> wall -> token art (front) */}
          <feMerge>
            {hasGround && <feMergeNode in="ground" />}
            <feMergeNode in="wall" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

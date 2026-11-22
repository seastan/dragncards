import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setObservingPlayerN } from "../store/playerUiSlice";
import { useFormatGroupId } from "./hooks/useFormatGroupId";
import { usePlayerIList } from "./hooks/usePlayerIList";

// Swipe between players' boards in the mobile UI.
//
// A sideways drag that starts on empty table moves the on-screen player's
// board — the layout's regions whose groupId contains playerN, i.e. not the
// shared regions and not perspective:"self" ones like your hand — with the
// finger. Let go past a quarter of the table's width (or with a flick) and that
// board slides off while the next player's slides in from the other side;
// otherwise it springs back. Dragging left goes to the next player, right to
// the previous one, wrapping round.
//
// The movement is Dnc3DTable's regionSlideX. Switching players rebuilds the
// table (observingPlayerN changes which groups the regions show), so the new
// board is built already slid off to the side, then slid in.

const OUT_MS = 170;
const IN_MS = 220;
const START_PX = 12;        // movement before a press counts as a swipe
const COMMIT_FRAC = 0.25;   // of the table width
const FLICK_PX_PER_MS = 0.5;

// Presses that belong to something else: a card (its own drag), the hidden
// piles drawer, scroll arrows, buttons.
const IGNORE = ".dnc3d-card-lift, .dnc3d-tilt-overlay, .dnc3d-scroll-arrow, button, [role=menuitem]";

export const useBoardSwipe = ({ tableRef, layoutRegions, tableWidth, enabled }) => {
  const dispatch = useDispatch();
  const formatGroupId = useFormatGroupId();
  const playerIList = usePlayerIList();
  const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
  const [slide, setSlide] = useState({ px: 0, ms: null });   // ms null: idle

  const boardRegionIds = useMemo(
    () => Object.values(layoutRegions || {})
      .filter(r => typeof r?.groupId === "string" && /playerN/.test(r.groupId))
      .map(r => formatGroupId(r.groupId)),
    // formatGroupId follows observingPlayerN
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutRegions, observingPlayerN, playerIList.length]
  );

  // Latest values for the native listeners below.
  const live = useRef({});
  live.current = { enabled: enabled && playerIList.length > 1, tableWidth, playerIList, observingPlayerN };

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    let g = null;            // the gesture in progress
    let raf = null;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    const onDown = (e) => {
      if (!live.current.enabled || g || (e.button !== undefined && e.button !== 0)) return;
      if (e.target.closest?.(IGNORE)) return;
      g = { x0: e.clientX, y0: e.clientY, id: e.pointerId, dragging: false, samples: [] };
    };
    const onMove = (e) => {
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (!g.dragging) {
        if (Math.abs(dy) > START_PX && Math.abs(dy) > Math.abs(dx)) { g = null; return; }
        if (Math.abs(dx) < START_PX || Math.abs(dx) < Math.abs(dy) * 1.3) return;
        g.dragging = true;
      }
      const now = performance.now();
      g.samples.push({ x: e.clientX, t: now });
      while (g.samples.length > 2 && now - g.samples[0].t > 100) g.samples.shift();
      g.dx = dx;
      if (!raf) raf = requestAnimationFrame(() => { raf = null; if (g) setSlide({ px: g.dx, ms: 0 }); });
    };
    const onUp = (e) => {
      if (!g || e.pointerId !== g.id) return;
      const gesture = g;
      g = null;
      if (!gesture.dragging) return;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      // A swipe is not a tap: keep the click that follows from reaching the
      // table (which would close menus etc.).
      const block = (ce) => { ce.stopPropagation(); window.removeEventListener("click", block, true); };
      window.addEventListener("click", block, true);
      later(() => window.removeEventListener("click", block, true), 300);

      const { tableWidth: W, playerIList: list, observingPlayerN: obs } = live.current;
      const dx = e.clientX - gesture.x0;
      const s = gesture.samples;
      const v = s.length >= 2 ? (s[s.length - 1].x - s[0].x) / Math.max(1, s[s.length - 1].t - s[0].t) : 0;
      const commit = Math.abs(dx) > W * COMMIT_FRAC || (Math.abs(v) > FLICK_PX_PER_MS && Math.sign(v) === Math.sign(dx));
      if (!commit) {
        setSlide({ px: 0, ms: OUT_MS });
        later(() => setSlide({ px: 0, ms: null }), OUT_MS + 30);
        return;
      }
      const step = dx < 0 ? 1 : -1;   // drag left → next player
      const i = Math.max(0, list.indexOf(obs));
      const next = list[(i + step + list.length) % list.length];
      setSlide({ px: dx < 0 ? -W : W, ms: OUT_MS });
      later(() => {
        // Same render: the new player's board, built off the other side.
        dispatch(setObservingPlayerN(next));
        setSlide({ px: dx < 0 ? W : -W, ms: 0 });
        // Then, once the rebuilt table has painted, slide it in.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setSlide({ px: 0, ms: IN_MS });
          later(() => setSlide({ px: 0, ms: null }), IN_MS + 30);
        }));
      }, OUT_MS + 20);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (raf) cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [tableRef, dispatch]);

  const slideMap = useMemo(() => {
    const map = {};
    boardRegionIds.forEach(id => { map[id] = slide.px; });
    return map;
  }, [boardRegionIds, slide.px]);

  return { slideMap, slideMs: slide.ms };
};

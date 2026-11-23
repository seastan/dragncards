import { useEffect, useMemo, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { setObservingPlayerN } from "../store/playerUiSlice";
import { usePlayerIList } from "./hooks/usePlayerIList";
import { formatGroupId } from "../engine-dnc3d/adapters/regions";

// Swipe between players' boards in the mobile UI.
//
// A player's "board" is the layout's regions whose groupId contains playerN —
// not the shared regions, and not perspective:"self" ones like your hand
// (those are already resolved to your own seat).
//
// The neighbouring players' boards are on the table all the time, as extra
// regions parked one table-width off to either side: the next player's to the
// right, the previous player's to the left (with two players, the one other
// board parks on whichever side the drag is heading). A sideways drag that
// starts on empty table moves all of them with the finger, so the incoming
// board slides in alongside the outgoing one. Let go past a quarter of the
// width (or with a flick) and they finish the slide; otherwise they spring
// back. Once the slide is done, observingPlayerN switches to the new player.
// That rebuilds the table, but every board is already where the rebuilt table
// puts it (the new player's at 0, its neighbours parked), so the switch is
// invisible.
//
// The movement is Dnc3DTable's regionSlideX. Regions are keyed by groupId, so
// a neighbour board's regions (e.g. player2Play1) are the very regions that
// player's board uses once it is the one on screen.

const SLIDE_MS = 240;
const START_PX = 12;        // movement before a press counts as a swipe
const COMMIT_FRAC = 0.25;   // of the table width
const FLICK_PX_PER_MS = 0.5;

// Presses that belong to something else: a card (its own drag), the hidden
// piles drawer, scroll arrows, buttons.
const IGNORE = ".dnc3d-card-lift, .dnc3d-tilt-overlay, .dnc3d-scroll-arrow, button, [role=menuitem]";

const neighbours = (list, obs) => {
  const i = Math.max(0, list.indexOf(obs));
  const n = list.length;
  return { next: list[(i + 1) % n], prev: list[(i - 1 + n) % n] };
};

export const useBoardSwipe = ({ tableRef, layoutRegions, tableWidth, enabled }) => {
  const dispatch = useDispatch();
  const playerIList = usePlayerIList();
  const numPlayers = playerIList.length;
  const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
  // px: how far the on-screen board is moved; ms: animate the change over ms
  // (0 = follow the finger), null = idle.
  const [slide, setSlide] = useState({ px: 0, ms: null });

  const boardRegions = useMemo(
    () => Object.entries(layoutRegions || {})
      .filter(([, r]) => typeof r?.groupId === "string" && /playerN/.test(r.groupId) && r.visible !== false),
    [layoutRegions]
  );
  const forPlayer = (player) => boardRegions.map(([key, r]) => [key, formatGroupId(r.groupId, player, numPlayers), r]);

  const { next, prev } = numPlayers > 1 ? neighbours(playerIList, observingPlayerN) : {};
  const neighbourPlayers = numPlayers > 1 ? [...new Set([next, prev])].filter(p => p && p !== observingPlayerN) : [];

  // Extra regions for the neighbouring boards. Same geometry as the on-screen
  // board; the slide map keeps them off-screen until a swipe brings one in.
  const ghostRegions = useMemo(() => {
    const regions = {};
    neighbourPlayers.forEach(player => {
      forPlayer(player).forEach(([key, groupId, r]) => {
        regions[`_board_${player}_${key}`] = { ...r, groupId };
      });
    });
    return regions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardRegions, observingPlayerN, numPlayers]);

  // Latest values for the native listeners below.
  const live = useRef({});
  live.current = { enabled: enabled && numPlayers > 1, tableWidth, playerIList, observingPlayerN };

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    let g = null;            // the gesture in progress
    let raf = null;
    let busy = false;        // a committed slide is finishing
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const settle = (px = 0) => {
      setSlide({ px, ms: SLIDE_MS });
      later(() => setSlide({ px: 0, ms: null }), SLIDE_MS + 30);
    };

    const onDown = (e) => {
      if (!live.current.enabled || g || busy || (e.button !== undefined && e.button !== 0)) return;
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
      // A cancelled pointer (the browser took the gesture over, a second
      // finger, the app backgrounded) carries no meaningful position: spring
      // back rather than read a swipe into it.
      if (e.type === "pointercancel") { settle(0); return; }
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
      if (!commit) { settle(0); return; }
      const { next: nextP, prev: prevP } = neighbours(list, obs);
      const target = dx < 0 ? nextP : prevP;   // drag left → next player
      // Finish the slide: the outgoing board off one side, the incoming one
      // (already following the finger) into place.
      busy = true;
      setSlide({ px: dx < 0 ? -W : W, ms: SLIDE_MS });
      later(() => {
        // Everything is now where the table will be rebuilt to put it. The
        // player switch and the offset reset must land in ONE render: this
        // app renders the React 17 way (ReactDOM.render), which doesn't batch
        // updates made in a timeout, so unbatched the switch rendered first —
        // rebuilding the table with the new board still offset a full width —
        // and the reset then slid it in a second time.
        unstable_batchedUpdates(() => {
          dispatch(setObservingPlayerN(target));
          setSlide({ px: 0, ms: 0 });
        });
        later(() => setSlide({ px: 0, ms: null }), 50);
        busy = false;
      }, SLIDE_MS + 20);
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

  const W = tableWidth || window.innerWidth;
  const slideMap = useMemo(() => {
    const map = {};
    const px = slide.px;
    forPlayer(observingPlayerN).forEach(([, groupId]) => { map[groupId] = px; });
    if (numPlayers > 1) {
      if (next === prev) {
        // Two players: the other board follows whichever side the drag is on.
        forPlayer(next).forEach(([, groupId]) => { map[groupId] = px > 0 ? px - W : px + W; });
      } else {
        forPlayer(next).forEach(([, groupId]) => { map[groupId] = px + W; });
        forPlayer(prev).forEach(([, groupId]) => { map[groupId] = px - W; });
      }
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardRegions, observingPlayerN, numPlayers, slide.px, W]);

  return { slideMap, slideMs: slide.ms, ghostRegions };
};

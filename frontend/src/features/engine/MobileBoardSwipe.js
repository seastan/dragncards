import { useMemo, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { setObservingPlayerN } from "../store/playerUiSlice";
import { usePlayerIList } from "./hooks/usePlayerIList";
import { formatGroupId } from "../engine-dnc3d/adapters/regions";

// Switching between players' boards in the mobile UI, with a slide.
//
// A player's "board" is the layout's regions whose groupId contains playerN —
// not the shared regions, and not perspective:"self" ones like your hand
// (those are already resolved to your own seat).
//
// The neighbouring players' boards are on the table all the time, as extra
// regions parked one table-width off to either side: the next player's to the
// right, the previous player's to the left (with two players, the one other
// board parks on whichever side the slide is heading). goTo(player) slides the
// on-screen board out and the neighbour in together; once the slide is done,
// observingPlayerN switches to the new player. That rebuilds the table, but
// every board is already where the rebuilt table puts it, so the switch is
// invisible. A player who isn't a neighbour (4+ players, jumping two seats)
// switches without the slide.
//
// What triggers it: swiping the top bar's player panel (MobileTable's
// PlayerCarousel). The table background is left to the radial menu.
//
// The movement is Dnc3DTable's regionSlideX. Regions are keyed by groupId, so
// a neighbour board's regions (e.g. player2Play1) are the very regions that
// player's board uses once it is the one on screen.

const SLIDE_MS = 240;

const neighbours = (list, obs) => {
  const i = Math.max(0, list.indexOf(obs));
  const n = list.length;
  return { next: list[(i + 1) % n], prev: list[(i - 1 + n) % n] };
};

export const useBoardSwipe = ({ layoutRegions, tableWidth }) => {
  const dispatch = useDispatch();
  const playerIList = usePlayerIList();
  const numPlayers = playerIList.length;
  const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
  // px: how far the on-screen board is moved; ms: animate the change over ms
  // (0 = jump), null = idle.
  const [slide, setSlide] = useState({ px: 0, ms: null });
  const busy = useRef(false);

  const boardRegions = useMemo(
    () => Object.entries(layoutRegions || {})
      .filter(([, r]) => typeof r?.groupId === "string" && /playerN/.test(r.groupId) && r.visible !== false),
    [layoutRegions]
  );
  const forPlayer = (player) => boardRegions.map(([key, r]) => [key, formatGroupId(r.groupId, player, numPlayers), r]);

  const { next, prev } = numPlayers > 1 ? neighbours(playerIList, observingPlayerN) : {};
  const neighbourPlayers = numPlayers > 1 ? [...new Set([next, prev])].filter(p => p && p !== observingPlayerN) : [];

  // Extra regions for the neighbouring boards. Same geometry as the on-screen
  // board; the slide map keeps them off-screen until a slide brings one in.
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

  const W = tableWidth || window.innerWidth;

  const goTo = (target) => {
    if (busy.current || !target || target === observingPlayerN) return;
    if (target !== next && target !== prev) {
      dispatch(setObservingPlayerN(target));
      return;
    }
    // The next player's board is parked on the right, so going to them the
    // boards move left; the previous player's is on the left. (Wrapping from
    // the last seat to the first is still "next".) With two players the other
    // board is both, and parks on the side the slide heads away from; go by
    // seat order then.
    const leftward = next !== prev
      ? target === next
      : playerIList.indexOf(target) > playerIList.indexOf(observingPlayerN);
    busy.current = true;
    setSlide({ px: leftward ? -W : W, ms: SLIDE_MS });
    setTimeout(() => {
      // The player switch and the offset reset in ONE render: this app renders
      // the React 17 way, which doesn't batch updates made in a timeout, and
      // unbatched the rebuilt table would slide the new board in a second time.
      unstable_batchedUpdates(() => {
        dispatch(setObservingPlayerN(target));
        setSlide({ px: 0, ms: 0 });
      });
      setTimeout(() => { setSlide({ px: 0, ms: null }); busy.current = false; }, 50);
    }, SLIDE_MS + 20);
  };

  const slideMap = useMemo(() => {
    const map = {};
    const px = slide.px;
    forPlayer(observingPlayerN).forEach(([, groupId]) => { map[groupId] = px; });
    if (numPlayers > 1) {
      if (next === prev) {
        // Two players: the other board comes in from the side the slide heads away from.
        forPlayer(next).forEach(([, groupId]) => { map[groupId] = px > 0 ? px - W : px + W; });
      } else {
        forPlayer(next).forEach(([, groupId]) => { map[groupId] = px + W; });
        forPlayer(prev).forEach(([, groupId]) => { map[groupId] = px - W; });
      }
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardRegions, observingPlayerN, numPlayers, slide.px, W]);

  return { slideMap, slideMs: slide.ms, ghostRegions, goTo };
};

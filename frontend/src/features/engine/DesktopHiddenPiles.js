import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faEye } from "@fortawesome/free-solid-svg-icons";
import store from "../../store";
import { useLayout } from "./hooks/useLayout";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useFormatGroupId } from "./hooks/useFormatGroupId";
import { useGameL10n } from "./hooks/useGameL10n";
import { useBrowseTopN } from "./hooks/useBrowseTopN";
import { setDropdownMenu, setMouseXY } from "../store/playerUiSlice";
import { LAYER_Z_FRAC } from "../engine-dnc3d/lib/config";

// The regular (desktop) table's hidden piles drawer, on the right edge.
//
// Every group the current layout doesn't put on the table is a pile here:
// those with cards by default, all of them with "Show all". It slides out when
// the mouse — or a card being dragged — reaches the table's right edge, and
// back when the pointer leaves it. It runs the table's full height and
// scrolls (the wheel, a row at a time). Each pile's name, count and browse /
// menu buttons sit to its right. Resting on a pile for a second spreads its
// cards out over the top half of the table, every card whole, in as many rows
// as it takes (scrolling when they don't fit); moving off the pile and the
// spread folds it back.
//
// As in the mobile drawer (MobileHiddenPiles.js) the piles are real table
// regions — cards drag onto and off them, and a fan's cards can be picked out —
// drawn in the table's 3D space, raised above the table's own regions, with
// the panel behind them in Dnc3DTable's tiltOverlay. They stay on the table
// while the drawer is closed, slid off past the right edge (regionSlideX), so
// opening it only slides things that already exist. Scrolling slides them
// vertically the same way, and piles scrolled out of view are parked aside.

const LAYER = 2;
const EDGE_PX = 10;          // the pointer this close to the right edge opens it
const HEADER_H = 40;
const INFO_W = 128;          // name, count and buttons to the right of each pile
const EXPAND_MS = 1000;      // rest on a pile this long to fan it out
const CLOSE_MS = 350;
const SLIDE_MS = 200;
const BG = "rgb(24,24,30)";

export const desktopDrawerSlideMs = SLIDE_MS;

// [{ groupId, count }], in the game definition's group order: shared groups,
// then the on-screen player's, then the other players'.
const useDrawerPiles = (showAll) => {
  const layout = useLayout();
  const formatGroupId = useFormatGroupId();
  const gameDef = useGameDefinition();
  const groupById = useSelector(state => state?.gameUi?.game?.groupById);
  const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
  if (!groupById || !layout?.regions) return [];
  const onTable = new Set(Object.values(layout.regions)
    .filter(r => r?.visible !== false && r?.groupId)
    .map(r => formatGroupId(r.groupId)));
  const order = Object.keys(gameDef?.groups || {});
  const rank = (id) => (id.startsWith("shared") ? 0 : id.startsWith(observingPlayerN || "player1") ? 1 : 2);
  return Object.keys(groupById)
    .filter(id => !onTable.has(id))
    .map(id => ({ groupId: id, count: groupById[id]?.stackIds?.length || 0 }))
    .filter(p => showAll || p.count > 0)
    .sort((a, b) => rank(a.groupId) - rank(b.groupId) ||
      (order.indexOf(a.groupId.replace(/^player\d+/, "playerN")) - order.indexOf(b.groupId.replace(/^player\d+/, "playerN"))) ||
      a.groupId.localeCompare(b.groupId));
};

// Geometry of the drawer and its pile regions, in the table's own px
// (tableSize: the 3D table's surface, .dnc3d-tilt). Region positions are fractions of it.
export const useDesktopDrawerGeometry = ({ enabled, tableSize, showAll, scroll, expanded }) => {
  const layout = useLayout();
  const gameDef = useGameDefinition();
  const zoom = useSelector(state => (state?.playerUi?.userSettings?.zoomPercent ?? 100) / 100);
  const piles = useDrawerPiles(showAll);
  const totalAll = useDrawerPiles(true).length;
  if (!enabled || !tableSize?.w || !tableSize?.h) return null;

  // The card size the 3D table uses on the regular table (engine applyCardDims:
  // card-back size × cardSize × zoom × 1dvh).
  const back = Object.values(gameDef?.cardBacks || {})[0];
  const unit = window.innerHeight / 100;
  const cardH = (back?.height ?? 1) * (layout?.cardSize || 10) * zoom * unit;
  const cardW = (back?.width ?? 0.72) * (layout?.cardSize || 10) * zoom * unit;
  const cellW = Math.round(cardW * 1.15 + 16);
  const rowH = Math.round(cardH + 14);
  const width = cellW + INFO_W;

  // tableSize is the table's own (tilted) surface, which regions are fractions
  // of: the drawer runs its full height, against its right edge. (Raised
  // regions sit a little nearer the eye than the surface; the panel is raised
  // with them, so they stay aligned with each other.)
  // On a tilted table the near (bottom) edge is magnified, and runs past the
  // screen's edge: tableSize.right is the surface x whose bottom lands on the
  // screen's right edge. Raised content also rises on screen by about
  // Z·sin(tilt), so the drawer starts that far down the surface.
  const layerZ = LAYER_Z_FRAC * cardH * LAYER;
  const top = Math.round(layerZ * Math.sin((tableSize.tiltDeg || 0) * Math.PI / 180) + 24);
  const height = tableSize.h - top;
  const right = Math.min(tableSize.w, tableSize.right ?? tableSize.w);
  const left = right - width;

  // Scrolling, a whole row at a time: `scroll` is the first row shown.
  const visibleCount = Math.max(1, Math.floor((height - HEADER_H) / rowH));
  const maxScroll = Math.max(0, piles.length - visibleCount);
  const first = Math.min(Math.max(scroll, 0), maxScroll);

  // The spread-out pile: a grid over the top half of the table, left of the
  // drawer.
  const spread = {
    left: Math.round(tableSize.w * 0.03),
    top,
    width: Math.round(left - 16 - tableSize.w * 0.03),
    height: Math.round(tableSize.h * 0.5 - top),
  };

  const rows = piles.map((pile, i) => {
    const slot = i - first;
    const visible = slot >= 0 && slot < visibleCount;
    const isOpen = pile.groupId === expanded && pile.count > 0;
    const y = top + HEADER_H + i * rowH;   // unscrolled; the slide moves it
    return {
      ...pile,
      slot,
      visible,
      isOpen,
      yInDrawer: HEADER_H + slot * rowH,
      // Always a grid fan, so spreading out is just a bigger box — moved in
      // place (liveGeometry), with no rebuild that would drop a card in hand.
      // Collapsed, its cell shows the first (top) card.
      region: {
        groupId: pile.groupId,
        type: "fan",
        grid: true,
        direction: "vertical",
        liveGeometry: true,
        layerIndex: LAYER,
        hideLabel: true,
        ...(isOpen ? {
          left: spread.left / tableSize.w,
          top: spread.top / tableSize.h,
          width: spread.width / tableSize.w,
          height: spread.height / tableSize.h,
        } : {
          left: (left + 6) / tableSize.w,
          top: (y + 4) / tableSize.h,
          width: (cellW - 6) / tableSize.w,
          height: (rowH - 8) / tableSize.h,
          style: { background: "rgba(255,255,255,0.04)", borderRadius: 6 },
        }),
      },
    };
  });

  return {
    rows, top, left, width, height, cellW, rowH, layerZ, spread,
    first, visibleCount, maxScroll, totalAll, totalShown: piles.length,
  };
};

// How far the closed drawer is slid off the right edge.
export const desktopDrawerParked = (g) => g.width + 40;

// Region slides: piles scrolled into view move up by the scroll; the rest
// (and all of them while the drawer is closed) wait off to the right. A
// spread-out pile stays where its region is.
export const desktopDrawerSlide = (g, open) => {
  if (!g) return null;
  const park = desktopDrawerParked(g);
  return Object.fromEntries(g.rows.map(r => [r.groupId,
    r.isOpen ? (open ? 0 : { x: park, y: 0 })
      : { x: open && r.visible ? 0 : park, y: -g.first * g.rowH }]));
};

export const desktopDrawerRegions = (g) => {
  const regions = {};
  (g?.rows || []).forEach(row => { regions[`_drawerPile_${row.groupId}`] = row.region; });
  return regions;
};

// Open / close and fan-out, driven by where the pointer is on screen (it works
// the same while a card is being dragged, whose pointer events still reach the
// window).
export const useDesktopDrawerState = ({ tableRef, enabled }) => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const panelRef = useRef(null);
  const live = useRef({});
  live.current = { open, expanded, enabled };

  useEffect(() => {
    let closeTimer = null, expandTimer = null, expandFor = null, foldTimer = null;
    const clear = (t) => t && clearTimeout(t);
    const onMove = (e) => {
      const { open: isOpen, expanded: exp, enabled: on } = live.current;
      const table = tableRef.current;
      if (!on || !table) return;
      const x = e.clientX, y = e.clientY;
      const t = table.getBoundingClientRect();
      const atEdge = x >= t.right - EDGE_PX && x <= t.right + 2 && y >= t.top && y <= t.bottom;

      // While a card is being dragged the drawer doesn't close (it would
      // slide aside the pile being dropped on); piles still spread out on a
      // second's rest, so a card can be placed among a pile's cards.
      const dragging = !!table.querySelector(".dnc3d-dragging");
      if (dragging) {
        clear(closeTimer); closeTimer = null;
        if (!isOpen && atEdge) { setOpen(true); return; }
      }
      const within = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      };
      const panel = panelRef.current;
      const inPanel = within(panel);
      const fanEl = panel?.parentElement?.querySelector("[data-drawer-fan]");
      const inFan = within(fanEl);

      if (!isOpen) {
        if (atEdge) { clear(closeTimer); closeTimer = null; setOpen(true); }
        return;
      }
      // Open: stay while the pointer is on the drawer, a fanned pile or the
      // edge, or a menu it opened is up.
      const busy = !!store.getState()?.playerUi?.dropdownMenu || dragging;
      if (inPanel || inFan || atEdge || busy) { clear(closeTimer); closeTimer = null; }
      else if (!closeTimer) {
        closeTimer = setTimeout(() => { closeTimer = null; setExpanded(null); setOpen(false); }, CLOSE_MS);
      }

      // Fan out the pile the pointer rests on; fold it when it leaves both the
      // pile and its fan.
      const rowEl = panel && [...panel.querySelectorAll("[data-pile-row]")].find(within);
      const rowId = rowEl?.getAttribute("data-pile-row") || null;
      if (rowId && rowId !== exp) {
        if (expandFor !== rowId) {
          clear(expandTimer);
          expandFor = rowId;
          expandTimer = setTimeout(() => { expandTimer = null; setExpanded(rowId); }, EXPAND_MS);
        }
      } else if (!rowId) {
        clear(expandTimer); expandTimer = null; expandFor = null;
      }
      if (exp) {
        const onIt = rowId === exp || inFan;
        if (onIt) { clear(foldTimer); foldTimer = null; }
        else if (!foldTimer) foldTimer = setTimeout(() => { foldTimer = null; setExpanded(null); }, 250);
      }
    };
    window.addEventListener("pointermove", onMove, true);
    return () => {
      window.removeEventListener("pointermove", onMove, true);
      clear(closeTimer); clear(expandTimer); clear(foldTimer);
    };
  }, [tableRef]);

  useEffect(() => { if (!enabled) { setOpen(false); setExpanded(null); } }, [enabled]);
  return { open, expanded, panelRef, setExpanded };
};

const IconButton = ({ icon, title, onClick }) => (
  <button
    type="button"
    title={title}
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    style={{
      width: 28, height: 26, borderRadius: 6, border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)",
      fontSize: 12, cursor: "pointer",
    }}>
    <FontAwesomeIcon icon={icon}/>
  </button>
);

const PileInfo = ({ row, g }) => {
  const dispatch = useDispatch();
  const gameL10n = useGameL10n();
  const browseTopN = useBrowseTopN();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[row.groupId]);
  if (!group) return null;
  const label = gameL10n(group.label);
  return (
    <div
      data-pile-row={row.groupId}
      style={{
        position: "absolute", left: 0, top: row.yInDrawer, width: g.width, height: g.rowH,
        borderBottom: "1px solid rgba(255,255,255,0.06)", boxSizing: "border-box",
      }}>
      <div style={{
        position: "absolute", left: g.cellW, top: 0, width: INFO_W, height: "100%",
        boxSizing: "border-box", padding: "6px 8px 6px 4px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 12, lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {label}
          </div>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{row.count} {row.count === 1 ? "card" : "cards"}</div>
        </div>
        {playerN &&
          <div style={{ display: "flex", gap: 4 }}>
            <IconButton icon={faEye} title="Look at all" onClick={() => browseTopN(row.groupId, "All")}/>
            <IconButton icon={faBars} title="Menu" onClick={(e) => {
              dispatch(setMouseXY({ x: e.clientX, y: e.clientY }));
              dispatch(setDropdownMenu({ type: "group", group, title: label }));
            }}/>
          </div>}
      </div>
    </div>
  );
};

// The drawer panel (and the backdrop of a fanned-out pile), drawn in the
// table's 3D space via Dnc3DTable's tiltOverlay.
export const DesktopPilesDrawer = ({ g, open, panelRef, showAll, setShowAll, setScroll }) => {
  const ref = useRef(null);
  const setRefs = (el) => { ref.current = el; if (panelRef) panelRef.current = el; };
  const mounted = !!g;

  // The table listens for pointerdown on its own element, which this panel
  // sits inside; stop it natively (React's stopPropagation can't).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e) => e.stopPropagation();
    el.addEventListener("pointerdown", stop);
    el.addEventListener("contextmenu", stop);
    return () => { el.removeEventListener("pointerdown", stop); el.removeEventListener("contextmenu", stop); };
  }, [mounted]);

  // The wheel scrolls the list a row per notch (a native, non-passive
  // listener, so the page itself doesn't scroll).
  const live = useRef({});
  live.current = { g, setScroll };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e) => {
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      e.preventDefault();
      e.stopPropagation();
      const { g: geo, setScroll: set } = live.current;
      if (!geo) return;
      acc += e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      const steps = Math.trunc(acc / 60);
      if (!steps) return;
      acc -= steps * 60;
      set(Math.min(Math.max(geo.first + steps, 0), geo.maxScroll));
    };
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, [mounted]);

  // As in the mobile drawer: the slide is applied from an effect so it starts
  // with the piles' (regionSlideX, also from an effect), and the first frame
  // is already parked.
  const slide = g ? `translateZ(${g.layerZ - 0.5}px) translateX(${open ? 0 : desktopDrawerParked(g)}px)` : "";
  useEffect(() => { if (ref.current) ref.current.style.transform = slide; }, [slide]);
  const mountTransform = useRef(null);
  if (mountTransform.current === null && g) mountTransform.current = slide;

  if (!g) return null;
  const spreadRow = g.rows.find(r => r.isOpen);
  const hiddenCount = g.totalAll - g.totalShown;
  return (
    <>
      {open && spreadRow &&
        <div
          data-drawer-fan=""
          style={{
            position: "absolute",
            left: g.spread.left - 8,
            top: g.spread.top - 8,
            width: g.spread.width + 16,
            height: g.spread.height + 16,
            transform: `translateZ(${g.layerZ - 0.5}px)`,
            background: BG,
            borderRadius: 12,
            boxShadow: "0 8px 28px rgba(0,0,0,0.65)",
            pointerEvents: "none",
          }}/>}
      <div
        ref={setRefs}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", left: g.left, top: g.top, width: g.width, height: g.height,
          transform: mountTransform.current,
          transition: `transform ${SLIDE_MS}ms ease-out`,
          background: BG,
          borderRadius: "12px 0 0 12px",
          boxShadow: "-6px 0 20px rgba(0,0,0,0.6)",
          color: "white",
          pointerEvents: "auto",
          overflow: "hidden",
        }}>
        <div style={{
          position: "absolute", left: 0, top: 0, width: "100%", height: HEADER_H,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
          padding: "0 8px 0 12px", boxSizing: "border-box",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", opacity: 0.8 }}>PILES</span>
          {(hiddenCount > 0 || showAll) &&
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); setScroll(0); }}
              style={{ border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer",
                background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }}>
              {showAll ? "Hide empty" : `Show all (${g.totalAll})`}
            </button>}
        </div>
        {g.rows.length === 0
          ? <div style={{ position: "absolute", top: HEADER_H, padding: 12, fontSize: 12, opacity: 0.6 }}>
              Every pile with cards is on the table.
            </div>
          : g.rows.filter(r => r.visible).map(row => <PileInfo key={row.groupId} row={row} g={g}/>)}
        {g.maxScroll > 0 && (() => {
          // Scroll bar: where the shown rows sit in the whole list.
          const trackH = g.height - HEADER_H - 12;
          const n = g.rows.length;
          const thumbH = Math.max(24, trackH * g.visibleCount / n);
          const thumbTop = HEADER_H + 6 + (trackH - thumbH) * (g.first / g.maxScroll);
          return <div style={{ position: "absolute", right: 3, top: thumbTop, width: 4, height: thumbH,
            borderRadius: 2, background: "rgba(255,255,255,0.3)" }}/>;
        })()}
      </div>
    </>
  );
};

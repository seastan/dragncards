import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faEye, faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
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
// back when the pointer leaves it. Each pile's name, count and browse / menu
// buttons sit to its right. Resting on a pile for a second fans its cards out
// to the left; moving off the pile and its fan folds it back.
//
// As in the mobile drawer (MobileHiddenPiles.js) the piles are real table
// regions — cards drag onto and off them, and a fan's cards can be picked out —
// drawn in the table's 3D space, raised above the table's own regions, with
// the panel behind them in Dnc3DTable's tiltOverlay. They stay on the table
// while the drawer is closed, slid off past the right edge (regionSlideX), so
// opening it only slides things that already exist.

const LAYER = 2;
const EDGE_PX = 10;          // the pointer this close to the right edge opens it
const HEADER_H = 40;
const PAGER_H = 34;
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
export const useDesktopDrawerGeometry = ({ enabled, tableSize, showAll, page, expanded }) => {
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
  // ...and ends above the game log, when that sits in the bottom-right.
  const height = Math.min(tableSize.h, tableSize.bottom ?? tableSize.h) - top;
  const right = Math.min(tableSize.w, tableSize.right ?? tableSize.w);
  const left = right - width;

  const fit = Math.max(1, Math.floor((height - HEADER_H - PAGER_H) / rowH));
  const pageCount = Math.max(1, Math.ceil(piles.length / fit));
  const p = Math.min(page, pageCount - 1);
  const shown = piles.slice(p * fit, (p + 1) * fit);

  // A fanned-out pile spreads left from the drawer, wide enough to show each
  // card (most of it), up to most of the table.
  const fanWidthFor = (count) => Math.min(Math.max(count, 1) * cardW * 0.8 + cardW, tableSize.w * 0.7);

  const rows = shown.map((pile, i) => {
    const y = top + HEADER_H + i * rowH;
    const isOpen = pile.groupId === expanded && pile.count > 0;
    const fanW = isOpen ? fanWidthFor(pile.count) : 0;
    return {
      ...pile,
      yInDrawer: HEADER_H + i * rowH,
      fanW,
      region: {
        groupId: pile.groupId,
        type: isOpen ? "fan" : "pile",
        direction: "horizontal",
        left: (left - fanW + 6) / tableSize.w,
        top: (y + 4) / tableSize.h,
        width: (cellW - 6 + fanW) / tableSize.w,
        height: (rowH - 8) / tableSize.h,
        layerIndex: LAYER,
        hideLabel: true,
        style: { background: "rgba(255,255,255,0.04)", borderRadius: 6 },
      },
    };
  });

  return { rows, top, left, width, height, cellW, rowH, layerZ, page: p, pageCount, totalAll, totalShown: piles.length };
};

// How far the closed drawer is slid off the right edge.
export const desktopDrawerParked = (g) => g.width + 40;

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
      const busy = !!store.getState()?.playerUi?.dropdownMenu;
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
export const DesktopPilesDrawer = ({ g, open, panelRef, showAll, setShowAll, setPage }) => {
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

  // As in the mobile drawer: the slide is applied from an effect so it starts
  // with the piles' (regionSlideX, also from an effect), and the first frame
  // is already parked.
  const slide = g ? `translateZ(${g.layerZ - 0.5}px) translateX(${open ? 0 : desktopDrawerParked(g)}px)` : "";
  useEffect(() => { if (ref.current) ref.current.style.transform = slide; }, [slide]);
  const mountTransform = useRef(null);
  if (mountTransform.current === null && g) mountTransform.current = slide;

  if (!g) return null;
  const fanRow = g.rows.find(r => r.fanW > 0);
  const hiddenCount = g.totalAll - g.totalShown;
  return (
    <>
      {open && fanRow &&
        <div
          data-drawer-fan=""
          style={{
            position: "absolute",
            left: g.left - fanRow.fanW - 6,
            top: g.top + fanRow.yInDrawer - 4,
            width: fanRow.fanW + 12,
            height: g.rowH + 8,
            transform: `translateZ(${g.layerZ - 0.5}px)`,
            background: BG,
            borderRadius: "10px 0 0 10px",
            boxShadow: "-6px 0 20px rgba(0,0,0,0.6)",
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
              onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); setPage(0); }}
              style={{ border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer",
                background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }}>
              {showAll ? "Hide empty" : `Show all (${g.totalAll})`}
            </button>}
        </div>
        {g.rows.length === 0
          ? <div style={{ position: "absolute", top: HEADER_H, padding: 12, fontSize: 12, opacity: 0.6 }}>
              Every pile with cards is on the table.
            </div>
          : g.rows.map(row => <PileInfo key={row.groupId} row={row} g={g}/>)}
        {g.pageCount > 1 &&
          <div style={{
            position: "absolute", left: 0, bottom: 0, width: "100%", height: PAGER_H,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 8px", boxSizing: "border-box", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 11,
          }}>
            <IconButton icon={faChevronUp} title="Previous" onClick={() => setPage(Math.max(0, g.page - 1))}/>
            <span style={{ opacity: 0.7 }}>{g.page + 1} / {g.pageCount}</span>
            <IconButton icon={faChevronDown} title="Next" onClick={() => setPage(Math.min(g.pageCount - 1, g.page + 1))}/>
          </div>}
      </div>
    </>
  );
};

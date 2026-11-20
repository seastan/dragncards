import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faEye, faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useLayout } from "./hooks/useLayout";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useFormatGroupId } from "./hooks/useFormatGroupId";
import { useGameL10n } from "./hooks/useGameL10n";
import { useBrowseTopN } from "./hooks/useBrowseTopN";
import { setDropdownMenu } from "../store/playerUiSlice";
import { LAYER_Z_FRAC, perspectivePx } from "../engine-dnc3d/lib/config";

// The mobile layout's hidden piles drawer (gameDef.mobileLayout.hiddenPiles).
//
// The piles are real table regions while the drawer is open — not pictures of
// piles — so cards drag onto and off them like any other region. Each row is a
// `pile` region on the left (added to the layout the 3D table renders; it draws
// the cards and takes the drops) and, beside it, the pile's name, count, and
// browse / menu buttons.
//
// The drawer itself (background, labels, buttons) is drawn INSIDE the table's
// 3D space (Dnc3DTable's tiltOverlay), at the height of the raised pile regions.
// That matters twice over: raised content is magnified by the perspective, so
// a drawer drawn over the table as page content drifted out of line with its
// piles, more so further from the screen's centre; and a card being dragged is
// lifted higher still, so it passes over the drawer rather than under it.
//
// Regions can't sit in a scrolling box, so more than ROWS_PER_PAGE piles page
// with the arrows. Empty piles are left out, except entries marked
// showWhenEmpty: something has to be there to drop the first card onto.

const ROWS_PER_PAGE = 4;
const MARGIN = 8;            // px between the drawer and the table's bottom edge
const PAGER_H = 36;
export const DRAWER_BG = "rgb(24,24,30)";
const LAYER = 2;             // above the table's own regions
export const SLIDE_MS = 200;

const normalizeEntry = (entry) => (typeof entry === "string" ? { groupId: entry } : entry || {});

// Which piles go in the drawer, in order: [{groupId, count}].
export const useHiddenPileList = () => {
  const layout = useLayout();
  const formatGroupId = useFormatGroupId();
  const groupById = useSelector(state => state?.gameUi?.game?.groupById);
  return (layout?.hiddenPiles || [])
    .map(normalizeEntry)
    .map(e => ({ ...e, groupId: formatGroupId(e.groupId) }))
    .filter(e => groupById?.[e.groupId])
    .map(e => ({ ...e, count: groupById[e.groupId].stackIds?.length || 0 }))
    .filter(e => e.count > 0 || e.showWhenEmpty);
};

// Pixel geometry of the drawer and the regions for the piles on this page.
// tableSize is the measured size of the table area (the 3D stage); region
// positions are fractions of it, as layout regions are.
export const useHiddenPilesGeometry = (enabled, tableSize, page) => {
  const layout = useLayout();
  const gameDef = useGameDefinition();
  const zoom = useSelector(state => (state?.playerUi?.userSettings?.zoomPercent ?? 100) / 100);
  const piles = useHiddenPileList();
  if (!enabled || !tableSize?.w || !tableSize?.h) return null;

  // Same card size the 3D table uses for the mobile layout (Dnc3DTable's
  // mobileCardUnitPx and the engine's cardDefaultW/H from any card back).
  const unit = tableSize.h / 100;   // 1% of the table area's height
  const back = Object.values(gameDef?.cardBacks || {})[0];
  const cardH = (back?.height ?? 1) * (layout?.cardSize || 16) * zoom * unit;
  const cardW = (back?.width ?? 0.72) * (layout?.cardSize || 16) * zoom * unit;

  const cellW = Math.round(cardW * 1.15 + 14);   // pile slot (the engine leaves a 15% left buffer)
  const rowH = Math.round(cardH + 14);
  const width = Math.max(Math.round(tableSize.w / 3), cellW + 64);

  const fit = Math.max(1, Math.floor((tableSize.h - 2 * MARGIN - PAGER_H) / rowH));
  const rowsPerPage = Math.min(ROWS_PER_PAGE, fit);
  const pageCount = Math.max(1, Math.ceil(piles.length / rowsPerPage));
  const p = Math.min(page, pageCount - 1);
  const shown = piles.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
  const paged = pageCount > 1;

  const height = (shown.length ? shown.length * rowH : 48) + (paged ? PAGER_H : 0);

  // Depth of the raised pile regions (engine: layerZPx(cardH) * layerIndex).
  // At that depth the perspective (centred on the table) magnifies everything
  // by P / (P - Z), so place the drawer such that its magnified bottom edge
  // lands MARGIN px above the table's bottom on screen.
  const layerZ = LAYER_Z_FRAC * cardH * LAYER;
  const P = perspectivePx();
  const scale = P / (P - layerZ);
  const cy = tableSize.h / 2;
  const top = cy + (tableSize.h - MARGIN - cy) / scale - height;
  const rowsTop = paged ? PAGER_H : 0;   // within the drawer

  const rows = shown.map((pile, i) => {
    const y = top + rowsTop + i * rowH;   // in the table
    return {
      ...pile,
      yInDrawer: rowsTop + i * rowH,
      region: {
        groupId: pile.groupId,
        type: "pile",
        direction: "horizontal",
        left: 0,
        top: y / tableSize.h,
        width: cellW / tableSize.w,
        height: rowH / tableSize.h,
        layerIndex: LAYER,
        style: { background: DRAWER_BG },
      },
    };
  });

  return { rows, top, width, height, cellW, rowH, page: p, pageCount, paged, layerZ };
};

// How far the drawer (panel and piles) is slid off the left edge while closed:
// its width plus enough that its drop shadow doesn't peek in either.
export const drawerParkedOffset = (geometry) => geometry.width + 40;

// Layout regions for the drawer's piles, keyed apart from the layout's own.
export const hiddenPileRegions = (geometry) => {
  const regions = {};
  (geometry?.rows || []).forEach(row => { regions[`_hiddenPile_${row.groupId}`] = row.region; });
  return regions;
};

const IconButton = ({ icon, onClick }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    style={{
      width: 30,
      height: 28,
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.85)",
      fontSize: 13,
      cursor: "pointer",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
    }}>
    <FontAwesomeIcon icon={icon}/>
  </div>
);

const PileInfo = ({ row, geometry, onDone }) => {
  const dispatch = useDispatch();
  const gameL10n = useGameL10n();
  const browseTopN = useBrowseTopN();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[row.groupId]);
  if (!group) return null;
  const label = gameL10n(group.label);
  const count = group.stackIds?.length || 0;
  return (
    <div style={{
      position: "absolute",
      left: geometry.cellW,
      top: row.yInDrawer,
      width: geometry.width - geometry.cellW,
      height: geometry.rowH,
      boxSizing: "border-box",
      padding: "6px 8px 6px 2px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      <div style={{ fontSize: 12, lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {label}
      </div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{count} {count === 1 ? "card" : "cards"}</div>
      {playerN &&
        <div style={{ display: "flex", gap: 4 }}>
          <IconButton icon={faEye} onClick={() => { browseTopN(row.groupId, "All"); onDone(); }}/>
          <IconButton icon={faBars} onClick={() => dispatch(setDropdownMenu({ type: "group", group, title: label }))}/>
        </div>
      }
    </div>
  );
};

// The drawer panel, rendered in the table's 3D space (Dnc3DTable tiltOverlay).
// `slidIn` drives the slide from the screen's left edge. It stays mounted while
// closed, parked off-screen with its piles (see MobileTable).
export const HiddenPilesDrawer = ({ geometry, slidIn, setPage, onDone }) => {
  const ref = useRef(null);
  const mounted = !!geometry;

  // The table listens for pointerdown on its own element (tiltEl), which this
  // panel now sits inside; React's stopPropagation can't stop a native listener
  // on an ancestor, so stop it natively before it reaches the table.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e) => e.stopPropagation();
    el.addEventListener("pointerdown", stop);
    el.addEventListener("contextmenu", stop);
    return () => {
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("contextmenu", stop);
    };
  }, [mounted]);

  // The slide is applied from an effect, not the style prop, so it starts in
  // the same frame as the piles' slide (Dnc3DTable applies regionSlideX from
  // an effect too); set through render, the panel ran a frame ahead of them.
  const slideTransform = geometry
    ? `translateZ(${geometry.layerZ - 0.5}px) translateX(${slidIn ? 0 : -drawerParkedOffset(geometry)}px)`
    : "";
  useEffect(() => {
    if (ref.current) ref.current.style.transform = slideTransform;
  }, [slideTransform]);
  // ...but the very first frame must already be off to the side, or the panel
  // flashes up in place before the effect moves it away. The style prop gets
  // the transform it mounts with and never changes it, so React leaves the
  // effect's later updates alone.
  const mountTransform = useRef(null);
  if (mountTransform.current === null && geometry) mountTransform.current = slideTransform;

  if (!geometry) return null;
  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: 0,
        top: geometry.top,
        width: geometry.width,
        height: geometry.height,
        // transform (set by the effect above): half a px under the piles'
        // cards (which rest at layerZ), above the region fills (layerZ - 1)
        // and everything on the table below; slid aside while closed.
        transform: mountTransform.current,
        transition: `transform ${SLIDE_MS}ms ease-out`,
        background: DRAWER_BG,
        borderRadius: "0 12px 12px 0",
        boxShadow: "6px 0 20px rgba(0,0,0,0.6)",
        color: "white",
        pointerEvents: "auto",
        overflow: "hidden",
      }}>
      {geometry.paged &&
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: PAGER_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 6px",
          boxSizing: "border-box",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontSize: 11,
        }}>
          <IconButton icon={faChevronUp} onClick={() => setPage(Math.max(0, geometry.page - 1))}/>
          <span style={{ opacity: 0.7 }}>{geometry.page + 1} / {geometry.pageCount}</span>
          <IconButton icon={faChevronDown} onClick={() => setPage(Math.min(geometry.pageCount - 1, geometry.page + 1))}/>
        </div>
      }
      {geometry.rows.length === 0
        ? <div style={{ padding: 12, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>No hidden piles have cards.</div>
        : geometry.rows.map(row => <PileInfo key={row.groupId} row={row} geometry={geometry} onDone={onDone}/>)}
    </div>
  );
};

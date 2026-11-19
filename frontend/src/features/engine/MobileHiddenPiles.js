import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faEye, faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useLayout } from "./hooks/useLayout";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useFormatGroupId } from "./hooks/useFormatGroupId";
import { useGameL10n } from "./hooks/useGameL10n";
import { useBrowseTopN } from "./hooks/useBrowseTopN";
import { setDropdownMenu } from "../store/playerUiSlice";
import { Z_INDEX } from "./functions/common";

// The mobile layout's hidden piles drawer (gameDef.mobileLayout.hiddenPiles).
//
// The piles are real table regions while the drawer is open — not pictures of
// piles — so cards drag onto and off them like any other region. Each row is a
// `pile` region on the left (added to the layout the 3D table renders; it draws
// the cards and takes the drops) and, beside it, a column drawn here with the
// pile's name, count, and browse / menu buttons. Because the piles are regions
// they can't sit in a scrolling box, so more than ROWS_PER_PAGE piles page with
// the arrows instead.
//
// Empty piles are left out, except entries marked showWhenEmpty: something has
// to be there to drop the first card onto a discard pile.

const ROWS_PER_PAGE = 4;
const MARGIN = 8;            // px between the drawer and the table's bottom edge
const PAGER_H = 28;
export const DRAWER_BG = "rgb(24,24,30)";
const LAYER = 2;             // above the table's own regions

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
export const useHiddenPilesGeometry = (open, tableSize, page) => {
  const layout = useLayout();
  const gameDef = useGameDefinition();
  const zoom = useSelector(state => (state?.playerUi?.userSettings?.zoomPercent ?? 100) / 100);
  const piles = useHiddenPileList();
  if (!open || !tableSize?.w || !tableSize?.h) return null;

  // Same card size the 3D table uses for the mobile layout (Dnc3DTable's
  // mobileCardUnitPx and the engine's cardDefaultW/H from any card back).
  const unit = Math.min(window.innerWidth, window.innerHeight) / 100;
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

  const height = shown.length * rowH + (paged ? PAGER_H : 0);
  const top = tableSize.h - MARGIN - height;
  const rowsTop = top + (paged ? PAGER_H : 0);

  const rows = shown.map((pile, i) => {
    const y = rowsTop + i * rowH;
    return {
      ...pile,
      y,
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

  return { rows, top, width, height, cellW, rowH, page: p, pageCount, paged };
};

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
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        // Overlaps the pile cell by a few px so no sliver of table shows between.
        left: geometry.cellW - 4,
        top: row.y,
        width: geometry.width - geometry.cellW + 4,
        height: geometry.rowH,
        boxSizing: "border-box",
        padding: "6px 8px 6px 2px",
        background: DRAWER_BG,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "white",
        zIndex: Z_INDEX.ChatHover,
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

// The part of the drawer drawn as page content: each pile's info column and the
// pager. The piles themselves are the regions from hiddenPileRegions.
export const HiddenPilesOverlay = ({ geometry, setPage, onDone }) => {
  if (!geometry) return null;
  if (geometry.rows.length === 0) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", left: 0, bottom: MARGIN, width: geometry.width, padding: 12,
          background: DRAWER_BG, borderRadius: "0 12px 12px 0", color: "rgba(255,255,255,0.6)",
          fontSize: 12, zIndex: Z_INDEX.ChatHover,
        }}>
        No hidden piles have cards.
      </div>
    );
  }
  return (
    <>
      {geometry.paged &&
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: 0,
            top: geometry.top,
            width: geometry.width,
            height: PAGER_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 6px",
            boxSizing: "border-box",
            background: DRAWER_BG,
            borderRadius: "0 12px 0 0",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            color: "white",
            fontSize: 11,
            zIndex: Z_INDEX.ChatHover,
          }}>
          <IconButton icon={faChevronUp} onClick={() => setPage(Math.max(0, geometry.page - 1))}/>
          <span style={{ opacity: 0.7 }}>{geometry.page + 1} / {geometry.pageCount}</span>
          <IconButton icon={faChevronDown} onClick={() => setPage(Math.min(geometry.pageCount - 1, geometry.page + 1))}/>
        </div>
      }
      {geometry.rows.map(row => <PileInfo key={row.groupId} row={row} geometry={geometry} onDone={onDone}/>)}
    </>
  );
};

import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons";
import store from "../../store";
import { processLabel } from "./Hotkeys";
import { dragnHotkeys, useDoDragnHotkey } from "./hooks/useDragnHotkeys";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useGameL10n } from "./hooks/useGameL10n";
import { useDoActionList } from "./hooks/useDoActionList";
import { usePlugin } from "./hooks/usePlugin";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { setPreHotkeyActiveCardGroupId } from "../store/playerUiSlice";

// Hotkeys for the mobile UI, which has no keyboard: lists of the hotkeys a
// desktop player would press, run with a tap, and per-device favourites that
// become buttons on the mobile bottom bar.
//
//   kind "card":  gameDef.hotkeys.card, run on the active card (the card the
//                 card sheet is showing), exactly as useKeyDown runs them
//   kind "game":  gameDef.hotkeys.game
//   kind "dragn": the engine's own hotkeys (useDragnHotkeys)

// Engine hotkeys that act on a card: listed with the card hotkeys.
const DRAGN_CARD_ACTIONS = ["targetCard", "drawArrow", "triggerAutomationAbility"];

// The engine lists some actions under two keys (Ctrl+Z and ←); keep the first.
const dedupeByAction = (list) => {
  const seen = new Set();
  return list.filter(h => {
    const id = typeof h.actionList === "string" ? h.actionList : JSON.stringify(h.actionList);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const hotkeyId = (item) => `${item.kind}:${item.key}`;

// [{kind, key, label, actionList}] for the card sheet's hotkey list.
export const useCardHotkeyItems = () => {
  const gameDef = useGameDefinition();
  return [
    ...(gameDef?.hotkeys?.card || []).filter(h => !h.hideFromTable).map(h => ({ ...h, kind: "card" })),
    ...dedupeByAction(dragnHotkeys.filter(h => DRAGN_CARD_ACTIONS.includes(h.actionList))).map(h => ({ ...h, kind: "dragn" })),
  ];
};

// { game: [...], dragn: [...] } for the bottom bar's hotkey sheet.
export const useGameHotkeyItems = () => {
  const gameDef = useGameDefinition();
  return {
    game: (gameDef?.hotkeys?.game || []).filter(h => !h.hideFromTable).map(h => ({ ...h, kind: "game" })),
    dragn: dedupeByAction(dragnHotkeys.filter(h => !DRAGN_CARD_ACTIONS.includes(h.actionList))).map(h => ({ ...h, kind: "dragn" })),
  };
};

export const useRunHotkey = () => {
  const dispatch = useDispatch();
  const doActionList = useDoActionList();
  const doDragnHotkey = useDoDragnHotkey();
  return (item) => {
    if (item.kind === "dragn") return doDragnHotkey(item.actionList);
    if (item.kind === "game") return doActionList(item.actionList, `Mobile hotkey "${item.key}"`);
    // card: same as useKeyDown — the playerUi goes along so $ACTIVE_CARD is
    // the card the sheet is showing.
    const playerUi = store.getState().playerUi;
    const activeCardId = playerUi?.activeCardId;
    const groupId = store.getState().gameUi?.game?.cardById?.[activeCardId]?.groupId;
    doActionList(item.actionList, `Mobile card hotkey "${item.key}"`, playerUi);
    dispatch(setPreHotkeyActiveCardGroupId(groupId));
  };
};

export const useHotkeyLabel = () => {
  const gameL10n = useGameL10n();
  const siteL10n = useSiteL10n();
  return (item) => (item.kind === "dragn" ? siteL10n(item.label) : gameL10n(item.label)) || item.key;
};

export const HotkeyLabel = ({ text, iconSize = 22 }) => (
  <>
    {processLabel(String(text)).map((part, i) => part.startsWith("icon(")
      ? <img key={i} alt="" src={part.slice(5, -1)} style={{ height: iconSize, display: "inline-block", verticalAlign: "middle" }}/>
      : <React.Fragment key={i}>{part}</React.Fragment>)}
  </>
);

// ── Favourites (per device, per plugin) ─────────────────────────────────────

const FAV_EVENT = "dragncards-mobile-fav-hotkeys";
const favKey = (pluginId) => `dragncards_mobile_fav_hotkeys_${pluginId}`;
const readFavs = (pluginId) => {
  try { return JSON.parse(window.localStorage.getItem(favKey(pluginId)) || "[]"); } catch (e) { return []; }
};

export const useFavoriteHotkeys = () => {
  const pluginId = usePlugin()?.id;
  const [favs, setFavs] = useState(() => readFavs(pluginId));
  useEffect(() => {
    setFavs(readFavs(pluginId));
    const onChange = () => setFavs(readFavs(pluginId));
    window.addEventListener(FAV_EVENT, onChange);
    return () => window.removeEventListener(FAV_EVENT, onChange);
  }, [pluginId]);
  const toggle = (id) => {
    const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
    try { window.localStorage.setItem(favKey(pluginId), JSON.stringify(next)); } catch (e) { /* session only */ }
    setFavs(next);
    window.dispatchEvent(new Event(FAV_EVENT));
  };
  return { favs, toggle };
};

// ── List ────────────────────────────────────────────────────────────────────

const KEY_GLYPHS = { ArrowLeft: "←", ArrowUp: "↑", ArrowRight: "→", ArrowDown: "↓", Escape: "Esc" };

const KeyHint = ({ keys }) => (
  <span style={{ flexShrink: 0, fontFamily: "monospace", fontSize: 11, color: "#9ca3af", border: "1px solid #4b5563", borderRadius: 4, padding: "1px 5px" }}>
    {String(keys).split("+").map(k => KEY_GLYPHS[k] || k).join("+")}
  </span>
);

// Rows of hotkeys: tap the row to run it; the star (when favourites are
// passed) adds it to the bottom bar.
export const MobileHotkeyList = ({ items, onRun, favorites = null }) => {
  const labelOf = useHotkeyLabel();
  return (
    <div>
      {items.map(item => {
        const id = hotkeyId(item);
        const fav = favorites?.favs.includes(id);
        return (
          <div
            key={id}
            onClick={(e) => { e.stopPropagation(); onRun(item); }}
            className="menu-item"
            style={{ height: "auto", minHeight: 44, gap: 10, padding: "6px 12px", fontSize: 15, cursor: "pointer", touchAction: "manipulation" }}>
            <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}><HotkeyLabel text={labelOf(item)}/></span>
            <KeyHint keys={item.key}/>
            {favorites &&
              <span
                onClick={(e) => { e.stopPropagation(); favorites.toggle(id); }}
                style={{ flexShrink: 0, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: fav ? "#facc15" : "#6b7280", fontSize: 17 }}>
                <FontAwesomeIcon icon={fav ? faStarSolid : faStarOutline}/>
              </span>}
          </div>
        );
      })}
    </div>
  );
};

export const SectionLabel = ({ children }) => (
  <div style={{ padding: "10px 12px 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af" }}>
    {children}
  </div>
);

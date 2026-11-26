import React, { useEffect, useRef, useState } from "react";
import Axios from "axios";
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
import useProfile from "../../hooks/useProfile";
import { useAuthOptions } from "../../hooks/useAuthOptions";
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

// Armable (Token / Card tab) items get their own ids: the same engine hotkey
// can be both run (Dragn tab) and armed (Card tab), and favourites are keyed
// by id.
export const hotkeyId = (item) => `${item.armable ? "arm:" : ""}${item.kind}:${item.key}`;

// ── Tabs of the hotkeys sheet ───────────────────────────────────────────────
// Token: gameDef.hotkeys.token entries that add a token (tokenType).
// Card: gameDef.hotkeys.card, the action entries plugins also put in the token
//       list (LotR does), and the engine's target / arrow hotkeys. (The engine's
//       trigger-ability hotkey needs the card's ability passed in, which an
//       armed action can't supply; cards have their own ability button.)
// Game / Dragn: as useGameHotkeyItems.
export const useHotkeyTabs = () => {
  const gameDef = useGameDefinition();
  const tokenList = (gameDef?.hotkeys?.token || []).filter(h => !h.hideFromTable);
  const { game, dragn } = useGameHotkeyItems();
  return {
    token: tokenList.filter(h => h.tokenType).map(h => ({ ...h, kind: "token", armable: true })),
    card: [
      ...(gameDef?.hotkeys?.card || []).filter(h => !h.hideFromTable).map(h => ({ ...h, kind: "card", armable: true })),
      ...tokenList.filter(h => !h.tokenType && h.actionList).map(h => ({ ...h, kind: "card", armable: true })),
      ...dedupeByAction(dragnHotkeys.filter(h => ["targetCard", "drawArrow"].includes(h.actionList))).map(h => ({ ...h, kind: "dragn", armable: true })),
    ],
    game,
    dragn,
  };
};

// The armed action (the same shape as touch mode's armed button) for a
// token or card hotkey: applied to each card tapped until the table is tapped.
export const useHotkeyToTouchAction = () => {
  const gameDef = useGameDefinition();
  const labelOf = useHotkeyLabel();
  return (item) => item.kind === "token"
    ? { id: `mobile_${hotkeyId(item)}`, actionType: "token", tokenType: item.tokenType,
        label: labelOf(item), imageUrl: gameDef?.tokens?.[item.tokenType]?.imageUrl }
    : { id: `mobile_${hotkeyId(item)}`, actionType: "card", actionList: item.actionList,
        label: labelOf(item), isDragnButton: item.kind === "dragn" };
};

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
  const gameDef = useGameDefinition();
  return (item) => {
    const label = (item.kind === "dragn" ? siteL10n(item.label) : gameL10n(item.label)) || item.key;
    // Token hotkeys are often labelled with just the token's icon: add its name.
    if (item.kind === "token") {
      const name = gameL10n(gameDef?.tokens?.[item.tokenType]?.label) || item.tokenType;
      return /^\s*icon\([^)]*\)\s*$/.test(label) ? `${label} ${name}` : label;
    }
    return label;
  };
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
// Where favourites are kept: on the account when signed in, in
// user.plugin_settings[pluginId].favoriteHotkeys, so they follow the player
// between devices. It's a JSON string, not a list, because the server merges
// settings by appending lists. localStorage keeps a copy on the device, used
// when signed out; a device's list from before favourites were on the account
// is copied up the first time that account loads it.
const favKey = (pluginId) => `dragncards_mobile_fav_hotkeys_${pluginId}`;
const parseAccountFavs = (raw) => {
  if (typeof raw !== "string") return null;
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : null; } catch (e) { return null; }
};
// The device's saved list, or null when it has none for the plugin yet (the
// plugin's defaults apply until the player changes them).
const readFavs = (pluginId) => {
  try {
    const raw = window.localStorage.getItem(favKey(pluginId));
    return raw === null ? null : JSON.parse(raw);
  } catch (e) { return null; }
};

// gameDef.defaultFavorites (or, from before favourites were for every table,
// gameDef.mobileLayout.defaultFavorites): ["<tab>:<key>", ...] → hotkey ids.
// The tab is the hotkeys sheet's (token / card / game / dragn).
export const resolveDefaultFavorites = (entries, tabs) => (Array.isArray(entries) ? entries : [])
  .map(entry => {
    if (typeof entry !== "string") return null;
    const i = entry.indexOf(":");
    if (i < 0) return null;
    const item = (tabs[entry.slice(0, i)] || []).find(h => h.key === entry.slice(i + 1));
    return item ? hotkeyId(item) : null;
  })
  .filter(Boolean);

// What the player has done with favourites on this device, which retires the
// hints that teach it (MobileGestureGuide.js).
export const FAV_REORDERED_KEY = "dragncards_mobile_fav_reordered";
export const RADIAL_USES_KEY = "dragncards_mobile_radial_uses";

export const useFavoriteHotkeys = () => {
  const pluginId = usePlugin()?.id;
  const gameDef = useGameDefinition();
  const tabs = useHotkeyTabs();
  const user = useProfile();
  const authOptions = useAuthOptions();
  const [stored, setFavs] = useState(() => readFavs(pluginId));
  const accountFavs = user?.id ? parseAccountFavs(user?.plugin_settings?.[pluginId]?.favoriteHotkeys) : null;
  const favs = accountFavs ?? stored ?? resolveDefaultFavorites(gameDef?.defaultFavorites ?? gameDef?.mobileLayout?.defaultFavorites, tabs);

  const saveToAccount = (next) => {
    if (!user?.id || !pluginId) return;
    const value = JSON.stringify(next);
    Axios.post("/be/api/v1/profile/update_plugin_user_settings",
      { [pluginId]: { favoriteHotkeys: value } }, authOptions).catch(() => { /* the device copy stands */ });
    // Update the loaded profile too, so every component sees it at once.
    if (user.setData) {
      const pluginSettings = { ...(user.plugin_settings || {}) };
      pluginSettings[pluginId] = { ...(pluginSettings[pluginId] || {}), favoriteHotkeys: value };
      user.setData({ user_profile: { ...user, plugin_settings: pluginSettings } });
    }
  };

  // A device list from before favourites were on the account: copy it up once.
  const migrated = useRef(null);
  useEffect(() => {
    if (!user?.id || !pluginId || migrated.current === `${user.id}:${pluginId}`) return;
    migrated.current = `${user.id}:${pluginId}`;
    const local = readFavs(pluginId);
    if (local && !parseAccountFavs(user?.plugin_settings?.[pluginId]?.favoriteHotkeys)) saveToAccount(local);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, pluginId]);
  useEffect(() => {
    setFavs(readFavs(pluginId));
    const onChange = () => setFavs(readFavs(pluginId));
    window.addEventListener(FAV_EVENT, onChange);
    return () => window.removeEventListener(FAV_EVENT, onChange);
  }, [pluginId]);
  const save = (next) => {
    try { window.localStorage.setItem(favKey(pluginId), JSON.stringify(next)); } catch (e) { /* session only */ }
    setFavs(next);
    window.dispatchEvent(new Event(FAV_EVENT));
    saveToAccount(next);
  };
  const toggle = (id) => save(favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]);
  // A new order for the same favourites (the favourites bar's drag to reorder).
  const reorder = (ids) => {
    try { window.localStorage.setItem(FAV_REORDERED_KEY, "1"); } catch (e) { /* fine */ }
    save(ids);
  };
  return { favs, toggle, reorder };
};

// For the Tab overlay's star column: the favourite id of an entry in one of
// its tables ("token" / "card" / "game" / "dragn", each listing the gameDef
// or engine hotkeys as is), or null when it can't be a favourite. Engine
// hotkeys are matched by action, since the favourites lists keep one key per
// action (Ctrl+Z and ← are both undo).
export const useFavoriteIdFor = () => {
  const tabs = useHotkeyTabs();
  const sameAction = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return (table, h) => {
    if (!h || h.hideFromTable) return null;
    if (table === "dragn") {
      const item = [...tabs.dragn, ...tabs.card.filter(c => c.kind === "dragn")]
        .find(c => sameAction(c.actionList, h.actionList));
      return item ? hotkeyId(item) : null;
    }
    const pool = table === "token" ? [...tabs.token, ...tabs.card] : tabs[table] || [];
    const item = pool.find(c => c.key === h.key && sameAction(c.actionList, h.actionList) && c.tokenType === h.tokenType);
    return item ? hotkeyId(item) : null;
  };
};

// ── List ────────────────────────────────────────────────────────────────────

const KEY_GLYPHS = { ArrowLeft: "←", ArrowUp: "↑", ArrowRight: "→", ArrowDown: "↓", Escape: "Esc" };

const KeyHint = ({ keys }) => (
  <span style={{ flexShrink: 0, fontFamily: "monospace", fontSize: 11, color: "#9ca3af", border: "1px solid #4b5563", borderRadius: 4, padding: "1px 5px" }}>
    {String(keys).split("+").map(k => KEY_GLYPHS[k] || k).join("+")}
  </span>
);

// Rows of hotkeys: tap the row to run it; the star (when favourites are
// passed) adds it to the favourites bar.
export const MobileHotkeyList = ({ items, onRun, favorites = null }) => {
  const labelOf = useHotkeyLabel();
  return (
    <div>
      {items.map((item, index) => {
        const id = hotkeyId(item);
        const fav = favorites?.favs.includes(id);
        return (
          <div
            key={`${id}:${index}`}  // ids can repeat: plugins bind two actions to one key
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

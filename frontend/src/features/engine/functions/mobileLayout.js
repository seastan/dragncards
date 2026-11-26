// Mobile UI: a phone-first table driven by the plugin's optional
// `gameDef.mobileLayout`.
//
// One mobile layout covers every player count. It shows the shared regions plus
// ONE player's board at a time: groupIds written with `playerN` / `{playerN}`
// resolve to the player currently on screen (observingPlayerN, which the mobile
// player switcher moves), exactly like the desktop layouts already do. So a
// plugin writes a single portrait layout and the engine handles 1-, 2-, 3- or
// 4-player games by letting the user flip between boards.
//
// A region can opt out of following the on-screen player with `perspective`:
// "self" makes its playerN always the viewer's own seat; "panel" makes it the
// player whose page the top bar's player panel shows (playerUi.mobilePanelPlayerN),
// so swiping the panel flips e.g. the hand without moving the board.
//
// The layout is chosen per device, not stored in game state: the room's real
// layout (game.layout / playerData[n].layout) is untouched, so desktop players
// in the same room see no change. The mobile layout is derived client-side from
// the gameDef and, for regions whose key also exists in the live layout, picks
// up that region's `visible` flag — so plugin buttons that show/hide a region by
// writing `/playerData/$PLAYER_N/layout/regions/<key>/visible` keep working.

const MOBILE_UI_KEY = "dragncards_mobile_ui";

// Device-local on purpose (see TouchModePrompt): the same account is used from a
// phone and a desktop, and switching the phone to mobile UI must not switch the
// desktop too, which a profile-synced userSetting would.
// `?mobile=1` / `?mobile=0` in the URL overrides it, for testing.
export const readMobileUIPref = () => {
  try {
    const param = new URLSearchParams(window.location.search).get("mobile");
    if (param === "1" || param === "true") return true;
    if (param === "0" || param === "false") return false;
    return window.localStorage.getItem(MOBILE_UI_KEY) === "true";
  } catch (e) {
    return false;
  }
};

// The same choice as a tri-state: true / false when this device has made one,
// null when it hasn't (then a profile that had touch mode on counts as on; see
// hooks/useMobileUI).
export const readMobileUIChoice = () => {
  try {
    const param = new URLSearchParams(window.location.search).get("mobile");
    if (param === "1" || param === "true") return true;
    if (param === "0" || param === "false") return false;
    const raw = window.localStorage.getItem(MOBILE_UI_KEY);
    return raw === "true" ? true : raw === "false" ? false : null;
  } catch (e) {
    return null;
  }
};

// Which mobile UI this device picked by hand: "v1" (touch mode on the regular
// table) or "v2" (the plugin's mobileLayout); null = automatic (v2 when the
// plugin has a mobile layout, else v1).
const MOBILE_UI_VERSION_KEY = "dragncards_mobile_ui_version";
export const readMobileUIVersion = () => {
  try {
    const raw = window.localStorage.getItem(MOBILE_UI_VERSION_KEY);
    return raw === "v1" || raw === "v2" ? raw : null;
  } catch (e) {
    return null;
  }
};
export const writeMobileUIVersion = (value) => {
  try { window.localStorage.setItem(MOBILE_UI_VERSION_KEY, value); } catch (e) { /* session only */ }
};

export const writeMobileUIPref = (value) => {
  try {
    window.localStorage.setItem(MOBILE_UI_KEY, value ? "true" : "false");
  } catch (e) { /* storage unavailable — the choice lasts this session only */ }
};

const resolveSelf = (groupId, playerN) => {
  if (typeof groupId !== "string" || !playerN) return groupId;
  return groupId.replace(/\{playerN\}/g, playerN).replace(/playerN(?![+-]\d)/g, playerN);
};

// A layout position ("25%", "1/7", 0.3) as a 0-1 fraction; null if unreadable.
const toFrac = (v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.endsWith("%")) return parseFloat(s) / 100;
  const m = s.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[1]) / parseFloat(m[2]);
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

export const buildMobileLayout = (mobileLayout, liveLayout, playerN, panelPlayerN = null) => {
  if (!mobileLayout) return null;
  const liveRegions = liveLayout?.regions || {};
  const regions = {};
  Object.entries(mobileLayout.regions || {}).forEach(([key, region]) => {
    let next = region;
    if (region.perspective === "self" && playerN) {
      next = { ...next, groupId: resolveSelf(region.groupId, playerN) };
    } else if (region.perspective === "panel" && panelPlayerN) {
      // Until the panel has reported a page, playerN keeps meaning the
      // on-screen player, which is where the panel starts.
      next = { ...next, groupId: resolveSelf(region.groupId, panelPlayerN) };
    }
    const live = liveRegions[key];
    if (live && live.visible !== undefined && region.syncVisibility !== false) {
      next = { ...next, visible: live.visible };
    }
    regions[key] = next;
  });
  // Text boxes are driven by the game (e.g. a plugin writing
  // /layout/textBoxes/roundAdvancement/label as the round moves on), so a
  // mobile text box takes its label and visibility from the live layout's box
  // of the same key, keeping its own position and style.
  const liveTextBoxes = liveLayout?.textBoxes || {};
  let textBoxes = mobileLayout.textBoxes;
  if (textBoxes) {
    textBoxes = {};
    Object.entries(mobileLayout.textBoxes).forEach(([key, box]) => {
      const live = liveTextBoxes[key];
      if (!live || box.syncContent === false) { textBoxes[key] = box; return; }
      textBoxes[key] = {
        ...box,
        ...(live.label !== undefined ? { label: live.label } : {}),
        ...(live.visible !== undefined ? { visible: live.visible } : {}),
      };
    });
  }
  // A visible text box spanning the top edge of the table (top 0, full width —
  // e.g. a round-advancement banner) reserves its height: every region is
  // squeezed into the space below it instead of being drawn underneath.
  const reserved = Math.max(0, ...Object.values(textBoxes || {})
    .filter(b => b.visible !== false && toFrac(b.top) === 0 && toFrac(b.left) === 0 && toFrac(b.width) >= 0.999)
    .map(b => toFrac(b.height) || 0));
  if (reserved > 0 && reserved < 1) {
    Object.keys(regions).forEach(key => {
      const r = regions[key];
      const top = toFrac(r.top), height = toFrac(r.height);
      if (top === null || height === null) return;
      regions[key] = { ...r, top: reserved + top * (1 - reserved), height: height * (1 - reserved) };
    });
  }
  return {
    // Nothing a mobile layout leaves out is inherited from the live layout except
    // the fields a renderer can't do without. No chat on the table: the mobile
    // shell gives chat its own panel.
    chat: null,
    rowSpacing: liveLayout?.rowSpacing ?? 3,
    ...mobileLayout,
    regions,
    ...(textBoxes ? { textBoxes } : {}),
    isMobile: true,
  };
};

// Memoized so useSelector callers get a stable reference until an input changes.
let cache = { mobileLayout: undefined, liveLayout: undefined, playerN: undefined, result: undefined };

export const selectLiveLayout = (state) => {
  const obs = state?.playerUi?.observingPlayerN;
  const game = state?.gameUi?.game;
  return obs ? game?.playerData?.[obs]?.layout : game?.layout;
};

// The layout the table should render: the plugin's mobile layout when mobile UI
// is on and the plugin has one, otherwise the room's live layout.
export const selectLayout = (state, gameDef) => {
  const liveLayout = selectLiveLayout(state);
  const mobileLayout = gameDef?.mobileLayout;
  if (!state?.playerUi?.mobileUI || !mobileLayout) return liveLayout;
  const playerN = state?.playerUi?.playerN;
  const panelPlayerN = state?.playerUi?.mobilePanelPlayerN || null;
  if (cache.mobileLayout === mobileLayout && cache.liveLayout === liveLayout && cache.playerN === playerN
      && cache.panelPlayerN === panelPlayerN) {
    return cache.result;
  }
  const result = buildMobileLayout(mobileLayout, liveLayout, playerN, panelPlayerN);
  cache = { mobileLayout, liveLayout, playerN, panelPlayerN, result };
  return result;
};

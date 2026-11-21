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
// A region can opt out of following the on-screen player with
// `"perspective": "self"`: its playerN then always means the viewer's own seat.
// That is what a docked hand wants — your hand stays yours while you look at a
// teammate's board.
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

export const writeMobileUIPref = (value) => {
  try {
    window.localStorage.setItem(MOBILE_UI_KEY, value ? "true" : "false");
  } catch (e) { /* storage unavailable — the choice lasts this session only */ }
};

const resolveSelf = (groupId, playerN) => {
  if (typeof groupId !== "string" || !playerN) return groupId;
  return groupId.replace(/\{playerN\}/g, playerN).replace(/playerN(?![+-]\d)/g, playerN);
};

export const buildMobileLayout = (mobileLayout, liveLayout, playerN) => {
  if (!mobileLayout) return null;
  const liveRegions = liveLayout?.regions || {};
  const regions = {};
  Object.entries(mobileLayout.regions || {}).forEach(([key, region]) => {
    let next = region;
    if (region.perspective === "self" && playerN) {
      next = { ...next, groupId: resolveSelf(region.groupId, playerN) };
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
  if (cache.mobileLayout === mobileLayout && cache.liveLayout === liveLayout && cache.playerN === playerN) {
    return cache.result;
  }
  const result = buildMobileLayout(mobileLayout, liveLayout, playerN);
  cache = { mobileLayout, liveLayout, playerN, result };
  return result;
};

import { createSlice } from "@reduxjs/toolkit";
import { updateValues } from "./updateValues";
import { uiSettings } from "../engine/SettingsModal";
import { deepMerge } from "../myplugins/uploadPluginFunctions";

const draggingDefault = {
  stackId: null,
  dragStep: null,
  started: false,
  end: true,
  endDelay: false,
  transform: null,
  fromDroppableId: null,
  mouseCurrentX: null,
  mouseCurrentY: null,
  mouseDownX: null,
  mouseDownY: null,
  stackRectangles: [],
  groupRectangle: null,
  hoverOverAttachmentAllowed: true,
  hoverOverStackId: null,
  hoverOverDirection: null,
  hoverOverDroppableId: null,
  prevStackId: null,
};

export const defaultKeypress = {
  Control: 0,
  Alt: 0,
  Shift: 0,
  Tab: 0,
  Space: 0,
};

const initialState = {
  alert: {
    text: null,
    level: null,
    autoClose: true,
  },
  playerN: "player1",
  keypress: defaultKeypress,
  replayStep: 0,
  showHotkeys: false,
  touchMode: false,
  typing: false,
  activeCardId: null,
  preHotkeyActiveCardGroupId: null,
  observingPlayerN: "player1",
  dropdownMenu: null,
  showModal: null,
  showDeveloper: null,
  tooltipIds: [],
  mouseXY: null,
  cardClicked: false,
  randomNumBetween: "3",
  autoLoadedDecks: false,
  droppableRefs: {},
  dragging: draggingDefault,
  spectatorMode: {
    peekingAll: false,
  },
  status: {
    text: null,
  },
  pluginRepoUpdateGameDef: null,
  pluginRepoUpdateAutoRefresh: false,
  tempDragStack: {
    stackId: null,
    toGroupId: null,
    left: null,
    top: null,
  },
  userSettings: Object.keys(uiSettings).reduce((acc, settingId) => {
    acc[settingId] = uiSettings[settingId].default;
    return acc;
  },{}),
  multiSelect: {
    enabled: false,
    cardIds: [], // This is to keep track of selected card ids for multi-select
  }
};

const playerUiSlice = createSlice({
  name: "playerUi",
  initialState,
  reducers: {
    resetPlayerUi: () => initialState,
    setPlayerUiValues: (state, { payload }) => {
      deepMerge(state, payload);
    },
    setPlayerN: (state, { payload }) => {
      state.playerN = payload;
    },
    setAlert: (state, { payload }) => {
      state.alert = payload;
    },
    setKeypress: (state, { payload }) => {
      state.keypress = payload;
    },
    setKeypressControl: (state, { payload }) => {
      state.keypress.Control = payload;
    },
    setKeypressAlt: (state, { payload }) => {
      state.keypress.Alt = payload;
    },
    setKeypressShift: (state, { payload }) => {
      state.keypress.Shift = payload;
    },
    setKeypressTab: (state, { payload }) => {
      state.keypress.Tab = payload;
    },
    setKeypressSpace: (state, { payload }) => {
      state.keypress.Space = payload;
    },
    setKeypressW: (state, { payload }) => {
      state.keypress.w = payload;
    },
    setReplayStep: (state, { payload }) => {
      state.replayStep = payload;
    },
    setShowHotkeys: (state, { payload }) => {
      state.showHotkeys = payload;
    },
    setTouchMode: (state, { payload }) => {
      state.touchMode = payload;
    },
    setTyping: (state, { payload }) => {
      state.typing = payload;
    },
    setActiveCardId: (state, { payload }) => {
      state.activeCardId = payload;
    },
    setPreHotkeyActiveCardGroupId: (state, { payload }) => {
      state.preHotkeyActiveCardGroupId = payload;
    },
    setScreenLeftRight: (state, { payload }) => {
      state.screenLeftRight = payload;
    },
    setObservingPlayerN: (state, { payload }) => {
      state.observingPlayerN = payload;
    },
    setDropdownMenu: (state, { payload }) => {
      state.dropdownMenu = payload;
    },
    setShowModal: (state, { payload }) => {
      state.showModal = payload;
    },
    setShowDeveloper: (state, { payload }) => {
      state.showDeveloper = payload;
    },
    setLoaded: (state, { payload }) => {
      state.loaded = payload;
    },
    setTooltipIds: (state, { payload }) => {
      state.tooltipIds = payload;
    },
    setMouseXY: (state, { payload }) => {
      state.mouseXY = payload;
    },
    setMouseTopBottom: (state, { payload }) => {
      state.mouseTopBottom = payload;
    },
    setCardClicked: (state, { payload }) => {
      state.cardClicked = payload;
    },
    setRandomNumBetween: (state, { payload }) => {
      state.randomNumBetween = payload;
    },
    setDraggingDefault: (state) => {
      state.dragging = draggingDefault;
      //state.status.text = "null";
    },
    setDraggingFromDroppableId: (state, { payload }) => {
      state.dragging.fromDroppableId = payload;
    },
    setDraggingStackId: (state, { payload }) => {
      state.dragging.stackId = payload;
    },
    setDragStep: (state, { payload }) => {
      state.dragging.dragStep = payload;
      //state.status.text = payload;
    },
    setDraggingStarted: (state, { payload }) => {
      state.dragging.started = payload;
    },
    setDraggingEnd: (state, { payload }) => {
      state.dragging.end = payload;
    },
    setDraggingEndDelay: (state, { payload }) => {
      state.dragging.endDelay = payload;
    },
    setDraggingTransform: (state, { payload }) => {
      state.dragging.transform = payload;
    },
    setDraggingPrevStyle: (state, { payload }) => {
      state.dragging.prevStyle = payload;
    },
    setDraggingMouseCurrentX: (state, { payload }) => {
      state.dragging.mouseCurrentX = payload;
    },
    setDraggingMouseCurrentY: (state, { payload }) => {
      state.dragging.mouseCurrentY = payload;
    },
    setDraggingMouseDownX: (state, { payload }) => {
      state.dragging.mouseDownX = payload;
    },
    setDraggingMouseDownY: (state, { payload }) => {
      state.dragging.mouseDownY = payload;
    },
    setDraggingStackRectangles: (state, { payload }) => {
      state.dragging.stackRectangles = payload;
    },
    setDraggingGroupRectangle: (state, { payload }) => {
      state.dragging.groupRectangle = payload;
    },
    setDraggingHoverOverAttachmentAllowed: (state, { payload }) => {
      state.dragging.hoverOverAttachmentAllowed = payload;
    },
    setDraggingHoverOverStackId: (state, { payload }) => {
      state.dragging.hoverOverStackId = payload;
    },
    setDraggingHoverOverDirection: (state, { payload }) => {
      state.dragging.hoverOverDirection = payload;
    },
    setDraggingHoverOverDroppableId: (state, { payload }) => {
      state.dragging.hoverOverDroppableId = payload;
    },
    setDraggingPrevStackId: (state, { payload }) => {
      state.dragging.prevStackId = payload;
    },
    setUserSettings: (state, { payload }) => {
      state.userSettings = payload; 
    },
    setAutoLoadedDecks: (state, { payload }) => {
      state.autoLoadedDecks = payload;
    },
    setDroppableRefs: (state, { payload }) => {
      state.droppableRefs[payload.id] = payload.ref;
    },
    setTempDragStack: (state, { payload }) => {
      state.tempDragStack = payload;
    },
    setSpectatorModeEnabled: (state, { payload }) => {
      state.spectatorMode.active = payload;
    },
    setSpectatorModePeekingAll: (state, { payload }) => {
      state.spectatorMode.peekingAll = payload;
    },
    setPluginRepoUpdateGameDef: (state, { payload }) => {
      state.pluginRepoUpdateGameDef = payload;
    },
    setPluginRepoUpdateAutoRefresh: (state, { payload }) => {
      state.pluginRepoUpdateAutoRefresh = payload;
    },
    setStatusText: (state, { payload }) => {
      state.status.text = payload;
    },
    setMultiSelectEnabled: (state, { payload }) => {
      state.multiSelect.enabled = payload;
    },
    setMultiSelectCardIds: (state, { payload }) => {
      state.multiSelect.cardIds = payload;
    },
    addMultiSelectCardId: (state, { payload }) => {
      if (!state.multiSelect.cardIds.includes(payload)) {
        state.multiSelect.cardIds.push(payload);
      }
    },
    removeMultiSelectCardId: (state, { payload }) => {
      state.multiSelect.cardIds = state.multiSelect.cardIds.filter(id => id !== payload);
    },
    toggleMultiSelectCardId: (state, { payload }) => {
      if (state.multiSelect.cardIds.includes(payload)) {
        state.multiSelect.cardIds = state.multiSelect.cardIds.filter(id => id !== payload);
      } else {
        state.multiSelect.cardIds.push(payload);
      }
    },
    clearMultiSelectCardIds: (state) => {
      state.multiSelect.cardIds = [];
    }
  }
});

export const { 
  resetPlayerUi,
  setPlayerUiValues,
  setPlayerN, 
  setKeypress, 
  setKeypressControl,
  setKeypressShift,
  setKeypressAlt,
  setKeypressTab,
  setKeypressSpace,
  setKeypressW, 
  setReplayStep,
  setShowHotkeys, 
  setTouchMode, 
  setTyping,
  setActiveCardId,
  setPreHotkeyActiveCardGroupId,
  setScreenLeftRight,
  setObservingPlayerN,
  setDropdownMenu,
  setShowModal,
  setShowDeveloper,
  setLoaded,
  setTooltipIds,
  setMouseXY,
  setMouseTopBottom,
  setCardClicked,
  setRandomNumBetween,
  setDraggingDefault,
  setDraggingFromDroppableId,
  setDraggingStackId,
  setDragStep,
  setDraggingStarted,
  setDraggingEnd,
  setDraggingEndDelay,
  setDraggingTransform,
  setDraggingPrevStyle,
  setDraggingMouseCurrentX,
  setDraggingMouseCurrentY,
  setDraggingMouseDownX,
  setDraggingMouseDownY,
  setDraggingStackRectangles,
  setDraggingGroupRectangle,
  setDraggingHoverOverAttachmentAllowed,
  setDraggingHoverOverStackId,
  setDraggingHoverOverDirection,
  setDraggingHoverOverDroppableId,
  setDraggingPrevStackId,
  setUserSettings,
  setAlert,
  setAutoLoadedDecks,
  setDroppableRefs,
  setTempDragStack,
  setSpectatorModeEnabled,
  setSpectatorModePeekingAll,
  setPluginRepoUpdateGameDef,
  setPluginRepoUpdateAutoRefresh,
  setStatusText,
  setMultiSelectEnabled,
  setMultiSelectCardIds,
  addMultiSelectCardId,
  toggleMultiSelectCardId,
  removeMultiSelectCardId,
  clearMultiSelectCardIds
 } = playerUiSlice.actions;
export default playerUiSlice.reducer;

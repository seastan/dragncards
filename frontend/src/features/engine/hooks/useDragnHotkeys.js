import { useContext } from "react";
import BroadcastContext from "../../../contexts/BroadcastContext";
import store from "../../../store";
import { useDoActionList } from "./useDoActionList";
import { dragnActionLists } from "../functions/dragnActionLists";
import { useDispatch } from "react-redux";
import { useImportViaUrl } from "./useImportViaUrl";
import { setPluginRepoUpdateAutoRefresh, setShowModal, setSpectatorModePeekingAll } from "../../store/playerUiSlice";
import { useActiveCardId } from "./useActiveCardId";
import { useSendLocalMessage } from "./useSendLocalMessage";
import { useCurrentFace } from "./useCurrentFace";
import { useCurrentSide } from "./useCurrentSide";
import useProfile from "../../../hooks/useProfile";
import { useRefreshPlugin } from "./useRefreshPlugin";
import { useIsPluginAuthor } from "./isPluginAuthor";
import { useSetPluginSetting } from "./useSetPluginSetting";

export const dragnHotkeys = [
  {"key": "T", "actionList": "targetCard", "label": "targetCard"},
  {"key": "Shift+A", "actionList": "triggerAutomationAbility", "label": "triggerAbility"},
  {"key": "Shift+W", "actionList": "drawArrow", "label": "startStopDrawingArrow"},
  {"key": "Escape", "actionList": "clearTargets", "label": "clearTargetsArrows"},
  {"key": "Ctrl+U", "actionList": "loadURL", "label": "loadUrl"},
  {"key": "Ctrl+L", "actionList": "loadPrebuilt", "label": "loadPrebuilt"},
  {"key": "Ctrl+F", "actionList": "peekAtAllFacedownCards", "label": "peekAtAllFacedownCards"},
  {"key": "Ctrl+S", "actionList": "saveGame", "label": "saveGame"},
  {"key": "Ctrl+Z", "actionList": "undo", "label": "undoOneAction"},
  {"key": "Ctrl+Y", "actionList": "redo", "label": "redoOneAction"},
  {"key": "ArrowLeft", "actionList": "undo", "label": "undoOneAction"},
  {"key": "ArrowRight", "actionList": "redo", "label": "redoOneAction"},
  {"key": "Shift+ArrowLeft", "actionList": "undoMany", "label": "undoManyActions"},
  {"key": "Shift+ArrowRight", "actionList": "redoMany", "label": "redoManyActions"},
  {"key": "ArrowUp", "actionList": "prevStep", "label": "moveToPreviousGameStep"},
  {"key": "ArrowDown", "actionList": "nextStep", "label": "moveToNextGameStep"},
  {"key": "Ctrl+Shift+L", "actionList": "refreshPlugin", "label": "refreshPluginIfAuthor"},
  {"key": "Ctrl+Shift+K", "actionList": "refreshPluginAuto", "label": "refreshPluginIfAuthorAuto"}
]

export const dragnTouchButtons = {
  "targetCard": {
    "id": "targetCard",
    "label": "targetCard",
    "actionType": "card",
    "actionList": "targetCard"
  },
  "drawArrow": {
    "id": "drawArrow",
    "label": "drawArrow",
    "actionType": "card",
    "actionList": "drawArrow"
  },
  "clearTargets": {
    "id": "clearTargets",
    "label": "clearTargets",
    "actionType": "game",
    "actionList": "clearTargets"
  },
  "saveGame": {
    "id": "saveGame",
    "label": "saveGame",
    "actionType": "game",
    "actionList": "saveGame"
  },
  "undo": {
    "id": "undo",
    "label": "undo",
    "actionType": "game",
    "actionList": "undo"
  },
  "redo": {
    "id": "redo",
    "label": "redo",
    "actionType": "game",
    "actionList": "redo"
  },
  "undoMany": {
    "id": "undoMany",
    "label": "undoMany",
    "actionType": "game",
    "actionList": "undoMany"
  },
  "redoMany": {
    "id": "redoMany",
    "label": "redoMany",
    "actionType": "game",
    "actionList": "redoMany"
  },
  "prevStep": {
    "id": "prevStep",
    "label": "prevStep",
    "actionType": "game",
    "actionList": "prevStep"
  },
  "nextStep": {
    "id": "nextStep",
    "label": "nextStep",
    "actionType": "game",
    "actionList": "nextStep"
  }
}
  
export const useDoDragnHotkey = () => {
  const user = useProfile();
  const doActionList = useDoActionList();
  const dispatch = useDispatch();
  const importViaUrl = useImportViaUrl();
  const sendLocalMessage = useSendLocalMessage();
  const refreshPlugin = useRefreshPlugin();
  const isPluginAuthor = useIsPluginAuthor
  const setPluginSetting = useSetPluginSetting();
  const activeCardId = useActiveCardId();
  const currentSide = useCurrentSide(activeCardId);
  const currentFace = useCurrentFace(activeCardId);
  const {gameBroadcast} = useContext(BroadcastContext);
  const cardActionLists = ["targetCard", "drawArrow", "triggerAutomationAbility"];
  return (actionList) => {
    if (cardActionLists.includes(actionList) && !activeCardId) {
      sendLocalMessage(`You must hover over a card to use that hotkey.`);
      return;
    }
    switch (actionList) {
      case "refreshPlugin":
        if (isPluginAuthor) {
          refreshPlugin();
        } else {
          sendLocalMessage("You must be the author of the plugin to use this hotkey.");
        }
        return
      case "refreshPluginAuto":
        if (isPluginAuthor) {
          const pluginRepoUpdateAutoRefresh = store.getState().playerUi.pluginRepoUpdateAutoRefresh;
          if (pluginRepoUpdateAutoRefresh) {
            sendLocalMessage("Auto-refreshing plugin updates is now off.");
          } else {
            sendLocalMessage("Auto-refreshing plugin updates is now on.");
          }
          dispatch(setPluginRepoUpdateAutoRefresh(!pluginRepoUpdateAutoRefresh));
        } else {
          sendLocalMessage("You must be the author of the plugin to use this hotkey.");
        }
        return 
      case "loadURL":
        return importViaUrl();
      case "loadPrebuilt":
        return dispatch(setShowModal("prebuilt_deck"));
      case "targetCard":
        return doActionList(dragnActionLists.targetCard(), `Target card ${currentFace?.name}`);
      case "triggerAutomationAbility":
        return doActionList(dragnActionLists.triggerAutomationAbility(currentFace?.ability, activeCardId, currentSide), `Trigger ability of ${currentFace?.name}`);
      case "saveGame":
        var playerUi = store.getState().playerUi;
        // Drop the droppableRefs from the playerUi object
        playerUi = {...playerUi, droppableRefs: {}}
        return gameBroadcast("save_replay", {options: {player_ui: playerUi}});
      case "clearTargets":
        return doActionList(dragnActionLists.clearTargets(), "Clear targets and arrows");
      case "peekAtAllFacedownCards":
          const isSpectator = store.getState().gameUi.spectators[user?.id];
          if (!isSpectator) {
            return sendLocalMessage("Only omniscient spectators cannot peek at facedown cards. The host can grant this permission in the chat section of the messages panel.");
          } else {
            const isPeekingAll = store.getState().playerUi.spectatorMode.peekingAll;
            if (isPeekingAll) {
              sendLocalMessage("You are no longer peeking at all facedown cards.");
            } else {
              sendLocalMessage("You are now peeking at all facedown cards.");
            }
            return dispatch(setSpectatorModePeekingAll(!isPeekingAll));
          }
      case "undo":
        return gameBroadcast("step_through", {options: {size: "single", direction: "undo"}});
      case "redo":
        return gameBroadcast("step_through", {options: {size: "single", direction: "redo"}});
      case "undoMany":
        return gameBroadcast("step_through", {options: {size: "round", direction: "undo"}});
      case "redoMany":
        return gameBroadcast("step_through", {options: {size: "round", direction: "redo"}});
      case "prevStep": 
        return doActionList(["PREV_STEP"], "Move to previous game step");
      case "nextStep":
        return doActionList(["NEXT_STEP"], "Move to next game step");
      case "drawArrow":
        return doActionList(dragnActionLists.drawArrow(), "Start/stop drawing arrow");
      }
  }
}
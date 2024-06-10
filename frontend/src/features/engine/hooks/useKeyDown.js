import { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BroadcastContext from '../../../contexts/BroadcastContext';
import { setKeypress, setKeypressAlt, setKeypressCommand, setKeypressControl, setKeypressShift, setKeypressSpace, setKeypressTab, setPreHotkeyActiveCardGroupId, setShowModal } from '../../store/playerUiSlice';
import { useAddToken } from './useAddToken';
import { useDoActionList } from './useDoActionList';
import { dragnHotkeys, useDoDragnHotkey } from './useDragnHotkeys';
import { useGameDefinition } from './useGameDefinition';
import { useActiveCardId } from './useActiveCardId';
import { useSendLocalMessage } from './useSendLocalMessage';
import { usePlayerN } from './usePlayerN';
import { useVisibleFace } from './useVisibleFace';


export const useKeyDown = () => {
    const gameDef = useGameDefinition();
    const dispatch = useDispatch();
    
    const keypress = useSelector(state => state?.playerUi?.keypress); 
    const keypressControl = keypress?.Control;
    const keypressShift = keypress?.Shift;
    const keypressAlt = keypress?.Alt;
    const keypressCommand = keypress?.Command;
    const mouseTopBottom = useSelector(state => state?.playerUi?.mouseTopBottom);
    const playerN = usePlayerN();
    const prompts = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.prompts) || {};
    const sortedPromptIds = Object.keys(prompts).sort((a,b) => prompts[a].timestamp - prompts[b].timestamp);
    const activeCardId = useActiveCardId();
    const activeCardGroupId = useSelector(state => state?.gameUi?.game?.cardById?.[activeCardId]?.groupId);
    const visibleFace = useVisibleFace(activeCardId);
    const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
    const doActionList = useDoActionList();
    const doDragnHotkey = useDoDragnHotkey()
    const addToken = useAddToken();
    const sendLocalMessage = useSendLocalMessage();
    console.log("gameb render keydown 1", gameBroadcast)

    return (event) => {
        event.preventDefault();
        if (!playerN) {
            sendLocalMessage("You must be logged in and seated at the table to use hotkeys.");   
            return;
        }
        const k = event.key;
        const unix_sec = Math.floor(Date.now() / 1000);
        if (k === "Alt") dispatch(setKeypressAlt(unix_sec));
        if (k === "Meta") dispatch(setKeypressAlt(unix_sec)); // We are using Meta as Alt on Macs
        if (k === " ") dispatch(setKeypressSpace(unix_sec));
        if (k === "Control") dispatch(setKeypressControl(unix_sec));
        if (k === "Shift") dispatch(setKeypressShift(unix_sec));
        if (k === "Tab") {
            if (keypress?.Shift) {
                dispatch(setShowModal("settings"));
            } else {
                dispatch(setKeypressTab(unix_sec));
            }
        }
        if (["Alt", " ", "Control", "Shift", "Tab", "Meta"].includes(k)) return;

        var dictKey = k.length === 1 ? k.toUpperCase() : k;
        //if ((unix_sec - keypressShift) < 30) dictKey = "Shift+"+dictKey;
        //if ((unix_sec - keypressControl) < 30) dictKey = "Ctrl+"+dictKey;
        //if ((unix_sec - keypressAlt) < 30) dictKey = "Alt+"+dictKey;
        if (Math.abs(keypressShift)) { //-unix_sec) < 5) {
            dictKey = "Shift+" + dictKey;
        }
        if (Math.abs(keypressControl)) { //-unix_sec) < 5) {
            dictKey = "Ctrl+" + dictKey;
        }
        if (Math.abs(keypressAlt)) { //-unix_sec) < 5) {
            dictKey = "Alt+" + dictKey;
        }

        console.log("Detected hotkey: ", dictKey)
        // Prompt hotkeys
        if (sortedPromptIds.length > 0) {
            const prompt = prompts[sortedPromptIds[0]];
            for (var option of prompt.options) {
                if (keyMatch(option.hotkey, dictKey)) {
                    doActionList(option.code);
                    return;
                }
            }
        }

        const gameDefTokenHotkeys = gameDef?.hotkeys?.token || [];
        const gameDefCardHotkeys = gameDef?.hotkeys?.card || [];
        const gameDefGameHotkeys = gameDef?.hotkeys?.game || [];

        var hotkeyTokenType = null;
        for (var keyObj of gameDefTokenHotkeys) {
            var increment = 0;
            if (keyMatch(keyObj.key, dictKey)) increment = 1;
            if (keyMatch("Ctrl+"+keyObj.key, dictKey)) increment = 5;

            if (increment) {
                hotkeyTokenType = keyObj.tokenType;
                if (!activeCardId) {
                    sendLocalMessage(`You must hover over a card to use the "${dictKey}" hotkey.`);
                    return;
                }
                const allowedTokens = gameDef.cardTypes?.[visibleFace?.type]?.tokens;
                if (!allowedTokens || (allowedTokens && allowedTokens.includes(hotkeyTokenType))) {
                    addToken(hotkeyTokenType, mouseTopBottom === "top" ? increment : -increment);
                    return;
                }
            }
        }
        if (hotkeyTokenType) {
            sendLocalMessage(`The selected hotkey attempted to add a token that is not valid for this card type.`);
            return;
        }
        for (var keyObj of gameDefGameHotkeys) {
            if (keyMatch(keyObj.key, dictKey)) {
                doActionList(keyObj.actionList)
                return;
            }
        }
        for (var keyObj of gameDefCardHotkeys) {
            if (keyMatch(keyObj.key, dictKey)) {
                if (!activeCardId) {
                    sendLocalMessage(`You must hover over a card to use the "${dictKey}" hotkey.`);
                    return;
                }
                doActionList(keyObj.actionList)
                dispatch(setPreHotkeyActiveCardGroupId(activeCardGroupId));
                return;
            }
        }
        for (var keyObj of dragnHotkeys) {
            if (keyMatch(keyObj.key, dictKey)) {
                doDragnHotkey(keyObj.actionList)
                return;
            }
        }

        sendLocalMessage(`No hotkey found for "${dictKey}".`)

        //if (Object.keys(defaultHotkeys["card"]).includes(dictKey)) doActionList("_custom",defaultActionLists[defaultHotkeys["card"][dictKey]]);
        //else if (Object.keys(defaultHotkeys["ui"]).includes(dictKey)) doActionList("_custom",defaultActionLists[defaultHotkeys["ui"][dictKey]]);
        //else if (Object.keys(defaultHotkeys["game"]).includes(dictKey)) doActionList("_custom",defaultActionLists[defaultHotkeys["game"][dictKey]]);
        //else if (Object.keys(defaultHotkeys["token"]).includes(dictKey)) keyTokenAction(defaultHotkeys["token"][dictKey]);
    }

/*     return (actionListName, actionList = null, _options = null) => {
        const state = store.getState();
        if (Object.keys(gameDef.actionLists).includes(actionListName)) {
            actionList = gameDef.actionLists[actionListName]
        } else if (actionListName === "flipCard") {
            actionList = flipCard;
        }
        if (actionList != null) gameBroadcast("game_action", {
            action: "game_action_list", 
            options: {
                action_list: actionList, 
                player_ui: state.playerUi,
            }
        })
    } */
}

const keyMatch = (key1, key2) => {

    if (key1 === key2) return true;
    if (key1.split('+').sort().join('+') === key2.split('+').sort().join('+')) return true;

    // Check if key1 is "1", "2", ... "9"
    if (key1.length === 1 && key1 >= "1" && key1 <= "9") {
        // Drop any instance of Shift+ from key2
        key2 = key2.replace("Shift+", "");
        if (key1.split('+').sort().join('+') === key2.split('+').sort().join('+')) return true;
    }
    
    return false;
}
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BroadcastContext from '../../../contexts/BroadcastContext';
import { defaultKeypress, setKeypress, setKeypressAlt, setKeypressCommand, setKeypressControl, setKeypressShift, setKeypressSpace, setKeypressTab, setPreHotkeyActiveCardGroupId, setShowModal } from '../../store/playerUiSlice';
import { useAddToken } from './useAddToken';
import { useDoActionList } from './useDoActionList';
import { dragnHotkeys, useDoDragnHotkey } from './useDragnHotkeys';
import { useGameDefinition } from './useGameDefinition';
import { useActiveCardId } from './useActiveCardId';
import { useSendLocalMessage } from './useSendLocalMessage';
import { usePlayerN } from './usePlayerN';
import { useVisibleFace } from './useVisibleFace';
import { setPromptVisible } from '../../store/gameUiSlice';
import { useVisiblePrompts } from './useVisiblePrompts';

function isLetter(value) {
    return /^[a-z,A-Z]$/.test(value);
}

export const useKeyDown = () => {
    const gameDef = useGameDefinition();
    const dispatch = useDispatch();
    
    const keypress = useSelector(state => state?.playerUi?.keypress);
    const mouseTopBottom = useSelector(state => state?.playerUi?.mouseTopBottom);
    const playerN = usePlayerN();
    const prompts = useVisiblePrompts();
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


    useEffect(() => {
        const handleFocus = () => {
            dispatch(setKeypress(defaultKeypress));
        };

        const handleBlur = () => {
            dispatch(setKeypress(defaultKeypress));
            console.log('Tab is out of focus');
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    return (event) => {
        const k = event.key;
        if (k === "F5") return;
        if (k === "F11") return;
        event.preventDefault();
        if (!playerN) {
            sendLocalMessage("You must be logged in and seated at the table to use hotkeys.");   
            return;
        }
        console.log("Keydown event: ", event, event.ctrlKey, event.shiftKey, event.altKey, event.metaKey)
        const unix_sec = Math.floor(Date.now() / 1000);
        console.log("Keydown detected: ", k)

        if (k === " ") {
            dispatch(setKeypressSpace(unix_sec));
            return;
        } else if (k === "Tab") {
            if (event.shiftKey) {
                dispatch(setShowModal("settings"));
                return;
            } else {
                dispatch(setKeypressTab(unix_sec));
                return;
            }
        }

        var dictKey = k.length === 1 ? k.toUpperCase() : k;
        const newKeypress = {
            ...keypress,
            Control: event.ctrlKey ? unix_sec : 0,
            Alt: event.altKey || event.metaKey ? unix_sec : 0,
            Shift: event.shiftKey ? unix_sec : 0,
        }
        dispatch(setKeypress(newKeypress));

        if (["Alt", " ", "Control", "Shift", "Tab", "Meta"].includes(k)) return;
        
        if (Math.abs(newKeypress.Shift && isLetter(dictKey))) { //-unix_sec) < 5) {
            dictKey = "Shift+" + dictKey;
        }
        if (Math.abs(newKeypress.Control)) { //-unix_sec) < 5) {
            dictKey = "Ctrl+" + dictKey;
        }
        if (Math.abs(newKeypress.Alt)) { //-unix_sec) < 5) {
            dictKey = "Alt+" + dictKey;
        }
        if (Math.abs(newKeypress.Meta)) { //-unix_sec) < 5) {
            dictKey = "Alt+" + dictKey;
        }

        console.log("Keydown dictKey: ", dictKey)

        // Prompt hotkeys
        if (sortedPromptIds.length > 0 && prompts[sortedPromptIds[0]].visible !== false) {
            const prompt = prompts[sortedPromptIds[0]];
            for (var option of prompt.options) {
                if (keyMatch(option.hotkey, dictKey)) {
                    dispatch(setPromptVisible({playerI: playerN, promptUuid: prompt.uuid, visible: false}));
                    doActionList(option.code, `Prompt response: ${option.label} of prompt ${prompt.uuid}`);
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
        for (var keyObj of gameDefCardHotkeys) {
            if (keyMatch(keyObj.key, dictKey)) {
                if (!activeCardId) {
                    sendLocalMessage(`You must hover over a card to use the "${dictKey}" hotkey.`);
                    return;
                }
                doActionList(keyObj.actionList, `Pressed hotkey "${dictKey}" on card ${visibleFace?.name}`);
                dispatch(setPreHotkeyActiveCardGroupId(activeCardGroupId));
                return;
            }
        }
        for (var keyObj of gameDefGameHotkeys) {
            if (keyMatch(keyObj.key, dictKey)) {
                doActionList(keyObj.actionList, `Pressed game hotkey "${dictKey}"`);
                return;
            }
        }
        for (var keyObj of dragnHotkeys) {
            if (keyMatch(keyObj.key, dictKey)) {
                doDragnHotkey(keyObj.actionList, `Pressed dragn hotkey "${dictKey}"`);
                return;
            }
        }

        sendLocalMessage(`No hotkey found for "${dictKey}".`)

    }
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
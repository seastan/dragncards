// Handle behavior when a card is touched/clicked

import { useState, useContext } from "react";
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { setMouseXY, setDropdownMenu, setTouchAction } from "../../store/playerUiSlice";
import store from "../../../store";
import BroadcastContext from "../../../contexts/BroadcastContext";
import { useDoActionList } from "./useDoActionList";
import { useGameDefinition } from "./useGameDefinition";
import { useGetDefaultAction } from "./useGetDefaultAction";
import { useDoDragnHotkey } from "./useDragnHotkeys";
import { useSetTouchAction } from "./useSetTouchAction";
import { useTouchAction } from "./useTouchAction";

export const useHandleTouchAction = () => {
    const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
    const dispatch = useDispatch();
    const gameDef = useGameDefinition();
    const playerN = useSelector(state => state?.playerUi?.playerN);
    const touchAction = useTouchAction();
    const setTouchAction = useSetTouchAction();
    const activeCardId = useSelector(state => state?.playerUi?.activeCardId);
    const doActionList = useDoActionList();
    const doDragnHotkey = useDoDragnHotkey();
    const [prevActive, setPrevActive] = useState(null);
    const getDefaultAction = useGetDefaultAction(activeCardId);
    const state = store.getState();
    const actionProps = {state, dispatch, gameBroadcast, chatBroadcast};
    console.log("Rendering HandleTouchActions")
    return ((touchedCard) => {
        console.log("handleTouchAction", touchedCard)
        // Must be a player
        if (!playerN) return null;
        if (touchAction) {
            if (touchAction?.actionType === "token" && touchedCard) {
                const tokenType = touchAction?.tokenType;
                const increment = touchAction?.doubleClicked ? -1 : 1;
                const hasToken = touchedCard.tokens[tokenType] > 0;
                if (!hasToken && increment < 0 && gameDef["tokens"]?.[tokenType]?.modifier !== true) return; // Can't have negative non-modifier tokens
                const actionList = [
                    ["DEFINE", "$ACTIVE_CARD_ID", touchedCard.id],
                    ["LOG", "$ALIAS_N", increment > 0 ? " added " : " removed ", Math.abs(increment), " ", gameDef["tokens"]?.[tokenType]?.name," token to ", "$ACTIVE_FACE.name", "."],
                    ["INCREASE_VAL", "/cardById/$ACTIVE_CARD_ID/tokens/" + tokenType, increment]
                ]
                doActionList(actionList);
                const tokensLeft = touchAction?.tokensLeft;
                if (tokensLeft >= 0) {
                    if (tokensLeft === 0) setTouchAction(null);
                    else if (tokensLeft === 1 && hasToken) setTouchAction(null);
                    else if (hasToken) {
                        setTouchAction({...touchAction, tokensLeft: tokensLeft - 1})
                    }
                }
            } else if (touchAction?.actionType === "card" && touchedCard) {
                const actionListId = touchAction?.actionList;
                const actionList = [...gameDef?.actionLists?.[actionListId]];
                if (actionList === null || actionList === undefined) {
                    alert("Action list not found: " + actionListId);
                    return;
                }
                // Prepend the actionList with the touched card id
                actionList.unshift(["DEFINE", "$ACTIVE_CARD_ID", touchedCard.id]);
                doActionList(actionList);
                dispatch(setMouseXY(null));
            }
            dispatch(setMouseXY(null));
            dispatch(setDropdownMenu(null));
        } else if (touchedCard.id === activeCardId) {
            // If a touched card is the active card, we do the default action
            const defaultAction = getDefaultAction(touchedCard.id);
            doActionList(defaultAction?.actionList)
            return;
        }
    })
}
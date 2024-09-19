// Handle behavior when a card is touched/clicked

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { setMouseXY, setDropdownMenu } from "../../store/playerUiSlice";
import { useDoActionList } from "./useDoActionList";
import { useGameDefinition } from "./useGameDefinition";
import { useSetTouchAction } from "./useSetTouchAction";
import { useTouchAction } from "./useTouchAction";
import { useDoDragnHotkey } from './useDragnHotkeys';

export const useHandleTouchAction = () => {
    const dispatch = useDispatch();
    const gameDef = useGameDefinition();
    const playerN = useSelector(state => state?.playerUi?.playerN);
    const touchAction = useTouchAction();
    const setTouchAction = useSetTouchAction();
    const doActionList = useDoActionList();
    const doDragnHotkey = useDoDragnHotkey();
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
                //if (touchAction.isDragnButton) {

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
        }
    })
}
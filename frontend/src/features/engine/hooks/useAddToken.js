import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import store from '../../../store';
import { defaultdict } from '../functions/common';
import { setValues } from '../../store/gameUiSlice';
import { useDoActionList } from './useDoActionList';
import { useGameDefinition } from './useGameDefinition';

var delayBroadcast;

export const useAddToken = () => {
    const gameDef = useGameDefinition();  
    const [tokenDict, setTokenDict] = useState({});
    const doActionList = useDoActionList();
    const dispatch = useDispatch();
    const activeCardId = useSelector(state => state?.playerUi?.activeCardId);
    const currentTokens = useSelector(state => state?.gameUi?.game?.cardById?.[activeCardId]?.tokens);

    const resolveTokenDict = (tempTokenDict) => {
        const actionList = [];
        for (const [cardId, cardTokenDict] of Object.entries(tempTokenDict)) {
            for (const [tokenType, value] of Object.entries(cardTokenDict)) {
                actionList.push(["LOG", "$ALIAS_N", value >= 0 ? " added " : " removed ", 
                        Math.abs(value), " ", gameDef?.tokens?.[tokenType]?.label, value === 1 ? " token" : " tokens", " to ", 
                        ["FACEUP_NAME_FROM_CARD_ID", cardId], "."])
                actionList.push(["INCREASE_VAL", "/cardById/" + cardId + "/tokens/" + tokenType, value])
            }
        }
        doActionList(actionList, `Added tokens to card ${activeCardId}`);
    }

    return (tokenType, amount) => {
        const currentVal = currentTokens?.[tokenType] || 0;
        var newVal = currentVal + amount;
        var adjustedAmount = amount;
        if (newVal < 0 && !gameDef?.tokens?.[tokenType]?.canBeNegative) {
            return
        }

        var tempTokenDict = {}
        if (tokenDict?.[activeCardId]?.[tokenType] !== undefined) {
            tempTokenDict = {...tokenDict, [activeCardId]: {...tokenDict[activeCardId], [tokenType]: tokenDict[activeCardId][tokenType] + adjustedAmount}};
        } else if (tokenDict?.[activeCardId] !== undefined) {
            tempTokenDict = {...tokenDict, [activeCardId]: {...tokenDict[activeCardId], [tokenType]: adjustedAmount}};
        } else {
            tempTokenDict = {...tokenDict, [activeCardId]: {[tokenType]: adjustedAmount}};
        }

        setTokenDict({...tempTokenDict});
        if (delayBroadcast) clearTimeout(delayBroadcast);
        delayBroadcast = setTimeout(() => {
            resolveTokenDict(tempTokenDict);
            setTokenDict({});
        }, 400);
        const updates = [["game", "cardById", activeCardId, "tokens", tokenType, newVal]];
        dispatch(setValues({updates: updates}));
    }
}
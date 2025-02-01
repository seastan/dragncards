import React from "react";
import { useSelector } from "react-redux";
import { useCardZIndex } from "./hooks/useCardZIndex";
import { useDoActionList } from "./hooks/useDoActionList";
import { dragnActionLists } from "./functions/dragnActionLists";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { usePlayerN } from "./hooks/usePlayerN";
import { dragnHotkeys } from "./hooks/useDragnHotkeys";
import { useCurrentFace } from "./hooks/useCurrentFace";
import { useCurrentSide } from "./hooks/useCurrentSide";

export const AbilityButton = React.memo(({
    cardId,
}) => { 
    const playerN = usePlayerN();
    const currentSide = useCurrentSide(cardId);
    const cardCurrentFace = useCurrentFace(cardId);
    const zIndex = useCardZIndex(cardId);
    const isActive = useSelector(state => {return state?.playerUi?.activeCardId === cardId});
    const ability = cardCurrentFace?.ability;
    const hasAbility = cardCurrentFace?.ability !== undefined && cardCurrentFace?.ability !== null;
    const doActionList = useDoActionList();
    // Find the item in the list of dragnHotkeys that has actionList === "triggerAutomationAbility"
    const abilityHotkey = dragnHotkeys.find(hotkey => hotkey.actionList === "triggerAutomationAbility");
    const abilityHotkeyKey = abilityHotkey?.key;

    const handleAbilityClick = () => {
        doActionList(dragnActionLists.triggerAutomationAbility(ability, cardId, currentSide))
    }

    if (!playerN) return null;

    if (isActive && hasAbility) {
        return (
            <div 
                className="absolute flex rounded-3xl bg-gray-600 border hover:bg-red-700 text-gray-300 justify-center items-center"
                style={{
                    width: "3.5dvh",
                    height: "3.5dvh",
                    fontSize: "2dvh",
                    top: "0%",
                    right: "0%",
                    zIndex:zIndex+1,
                    transform: "translate(30%, 0%)"
                }}
                onClick={() => handleAbilityClick()}
                title={abilityHotkeyKey}
            >
                <div><FontAwesomeIcon icon={faBolt}/></div>
            </div>
        )
    }
    return null;
})

// style={{
//     top: "50%",
//     right: "0%",
//     zIndex:zIndex+1, 
//     writingMode: "vertical-rl",
//     transform: "translate(0%, -50%)"
// }}
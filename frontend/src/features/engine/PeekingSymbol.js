import { faEye } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react"
import { useSelector } from "react-redux";
import { usePlayerN } from "./hooks/usePlayerN";
import { useVisibleSide } from "./hooks/useVisibleSide";
import { useCardProp } from "./hooks/useCardProp";
import { useGroupProp } from "./hooks/useGroupProp";

export const PeekingSymbol = React.memo(({
    cardId,
}) => { 
    const cardCurrentSide = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.currentSide);
    const cardVisibleSide = useVisibleSide(cardId);
    const playerN = usePlayerN();
    const groupId = useCardProp(cardId, "groupId");
    const defaultPeeking = useGroupProp(groupId, "onCardEnter")?.peeking?.[playerN];

    return (
        (cardCurrentSide === "B" && cardVisibleSide === "A" && !defaultPeeking) ? 
        <div className="absolute top-0 right-0 flex justify-center items-center bg-red-700 text-white opacity-60 rounded-lg" style={{"width": "3dvh", "height": "3dvh"}}>
            <FontAwesomeIcon className="m-2" icon={faEye}/> 
        </div>
        : null
    )
})
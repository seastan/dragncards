import React from "react"
import { useSelector } from "react-redux";

export const MultiSelectOverlay = React.memo(({
    cardId,
}) => { 
    const isMultiSelected = useSelector(state => state.playerUi.multiSelect.cardIds?.includes(cardId));
    if (!isMultiSelected) {
        return null; // If the card is not selected, don't render the overlay
    }
    return (
        <div className="absolute bg-yellow-300 w-full h-full opacity-50" style={{borderRadius: '0.6dvh'}}/>
    )
})
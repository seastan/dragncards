import React from "react"
import { useSelector } from "react-redux";
import store from "../../store";

export const MultiSelectOverlay = React.memo(({
    cardId,
}) => { 
    const isMultiSelected = useSelector(state => state.playerUi.multiSelect.cardIds?.includes(cardId));
    if (!isMultiSelected) {
        return null; // If the card is not selected, don't render the overlay
    }
    const multiSlectCardIds = store.getState().playerUi.multiSelect.cardIds;
    const index = multiSlectCardIds.indexOf(cardId);
    return (
        <div className="absolute bg-yellow-300 w-full h-full opacity-50" style={{borderRadius: '0.6dvh'}}>
            <div className="absolute font-black"
                style={{
                    left: "50%",
                    top: "50%",
                    textShadow: "rgb(255, 255, 255) 2px 0px 0px, rgb(255, 255, 255) 1.75517px 0.958851px 0px, rgb(255, 255, 255) 1.0806px 1.68294px 0px, rgb(255, 255, 255) 0.141474px 1.99499px 0px, rgb(255, 255, 255) -0.832294px 1.81859px 0px, rgb(255, 255, 255) -1.60229px 1.19694px 0px, rgb(255, 255, 255) -1.97999px 0.28224px 0px, rgb(255, 255, 255) -1.87291px -0.701566px 0px, rgb(255, 255, 255) -1.30729px -1.51361px 0px, rgb(255, 255, 255) -0.421592px -1.95506px 0px, rgb(255, 255, 255) 0.567324px -1.91785px 0px, rgb(255, 255, 255) 1.41734px -1.41108px 0px, rgb(255, 255, 255) 1.92034px -0.558831px 0px",
                    transform: "translate(-50%, -50%)",
                    fontSize: "5dvh",
                }}>
                {index+1}
            </div>
        </div>
    )
})
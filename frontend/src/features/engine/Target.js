import React from "react";
import { useSelector } from 'react-redux';
import { useCardScaleFactor } from "./hooks/useCardScaleFactor";

export const Target = React.memo(({
    cardId,
}) => {
    const targeting = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.targeting);
    const cardScaleFactor = useCardScaleFactor();
    if (!targeting) return null;
    var targetString = "";
    if (targeting.player1) targetString += "1";
    if (targeting.player2) targetString += "2";
    if (targeting.player3) targetString += "3";
    if (targeting.player4) targetString += "4";
    if (targetString === "") return null;

    return (
        <div className="absolute"
            style={{
                width: `${cardScaleFactor}dvh`,
                height: `${cardScaleFactor}dvh`,
                opacity: "60%",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
            }}>
            <div className="absolute font-black"
                style={{
                    left: "50%",
                    top: "50%",
                    textShadow: "rgb(255, 255, 255) 2px 0px 0px, rgb(255, 255, 255) 1.75517px 0.958851px 0px, rgb(255, 255, 255) 1.0806px 1.68294px 0px, rgb(255, 255, 255) 0.141474px 1.99499px 0px, rgb(255, 255, 255) -0.832294px 1.81859px 0px, rgb(255, 255, 255) -1.60229px 1.19694px 0px, rgb(255, 255, 255) -1.97999px 0.28224px 0px, rgb(255, 255, 255) -1.87291px -0.701566px 0px, rgb(255, 255, 255) -1.30729px -1.51361px 0px, rgb(255, 255, 255) -0.421592px -1.95506px 0px, rgb(255, 255, 255) 0.567324px -1.91785px 0px, rgb(255, 255, 255) 1.41734px -1.41108px 0px, rgb(255, 255, 255) 1.92034px -0.558831px 0px",
                    transform: "translate(-50%, -50%)",
                    fontSize: "4dvh",
                }}>
                {targetString}
            </div>
            <img 
                className="absolute h-full w-full"
                style={{
                    animation: "spin 3s infinite linear",
                }}
                src={process.env.PUBLIC_URL + '/images/other/target.png'}/>
        </div>
    )
})
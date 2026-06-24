import React, { useState, useEffect, useContext } from "react";
import { useSelector } from 'react-redux';
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import Draggable from "react-draggable";

var delayBroadcast;

export const Token = React.memo(({
    cardId,
    tokenType,
    showButtons,
    zIndex,
    aspectRatio,
    extrudeFilter = null,
}) => {

    const doActionList = useDoActionList();
    const rotation = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.rotation);
    const tokenValue = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.tokens?.[tokenType]) || 0;
    const [buttonDownVisible, setButtonDownVisible] = useState(false);
    const [buttonUpVisible, setButtonUpVisible] = useState(false);
    const [amount, setAmount] = useState(tokenValue);
    const gameDef = useGameDefinition();
    const tokenDef = gameDef?.tokens?.[tokenType];

    useEffect(() => {
        if (tokenValue !== amount) setAmount(tokenValue);
    }, [tokenValue]);

    if (!tokenDef) return;

    var label = amount;
    if (tokenDef.modifier) {
        label = "+" + amount;
    }
    if (amount === 1 && tokenDef.hideLabel1) {
        label = "";
    }

    if (tokenValue === null) return null;

    function clickArrow(event,delta) {
        event.stopPropagation();
        var newAmount = 0;
        if (!gameDef?.tokens[tokenType]?.canBeNegative && (amount+delta < 0)) {
            newAmount = 0;
        } else {
            newAmount = amount+delta;
        }
        setAmount(newAmount);
        // Determine total number of tokens added or removed since last broadcast
        const totalDelta = newAmount-tokenValue;
        // Set up a delayed broadcast to update the game state that interupts itself if the button is clicked again shortly after.
        if (delayBroadcast) clearTimeout(delayBroadcast);
        delayBroadcast = setTimeout(function() {
            if (totalDelta === 0) return;
            //const state = store.getState();
            const listOfActions = [
                ["LOG", "$ALIAS_N", totalDelta >= 0 ? " added " : " removed ", Math.abs(totalDelta), " ", tokenDef.label, " token",
                       Math.abs(totalDelta) > 1 ? "s" : "", totalDelta >= 0 ? " to " : " from ", `$GAME.cardById.${cardId}.currentFace.name`, "."],
                ["SET", `/cardById/${cardId}/tokens/${tokenType}`, newAmount]
            ]
            doActionList(listOfActions, `Used arrow button to change token ${tokenType} on card ${cardId} by ${totalDelta}`);
        }, 500);
    }
    // Prevent doubleclick from interfering with 2 clicks
    function handleDoubleClick(event) {
        event.stopPropagation();
    }
    
    return(
        <Draggable>
        <div
            style={{
                position: "absolute",
                left: tokenDef.left,
                top: tokenDef.top,
                height: tokenDef.height,
                width: tokenDef.width,
                //height: `${22*(1-0.6*(0.7-aspectRatio))}%`,
                zIndex: showButtons ? zIndex + 1 : "",
                isolation: extrudeFilter ? "isolate" : undefined,
                // dnc3d: the token host (liftEl child) is pointer-events:none so the
                // card stays hoverable/clickable through it; re-enable hit-testing on
                // this small token box so its +/- arrows and drag still work.
                pointerEvents: extrudeFilter ? "auto" : undefined,
                // dnc3d: the token box isn't a descendant of cardEl, so it can't
                // inherit the card's `cursor: grab`. A token grab still drags the
                // card (pointerdown bubbles to liftEl), so match the card's cursor
                // — otherwise hovering a token (incl. one overlapping a parent
                // card in a stack) flips the cursor back to the default arrow.
                cursor: extrudeFilter ? "grab" : undefined,
                // dnc3d: shrink tokens 20% in place (origin defaults to center).
                transform: extrudeFilter ? "scale(0.8)" : undefined,
                display: showButtons || (amount!==0 && amount!==null && amount!==undefined) ? "block" : "none"}}>
            <div
                className="flex absolute text-white text-center w-full h-full items-center justify-center"
                style={{
                    transform: `rotate(${-rotation}deg)`,
                    textShadow: "rgb(0, 0, 0) 2px 0px 0px, rgb(0, 0, 0) 1.75517px 0.958851px 0px, rgb(0, 0, 0) 1.0806px 1.68294px 0px, rgb(0, 0, 0) 0.141474px 1.99499px 0px, rgb(0, 0, 0) -0.832294px 1.81859px 0px, rgb(0, 0, 0) -1.60229px 1.19694px 0px, rgb(0, 0, 0) -1.97999px 0.28224px 0px, rgb(0, 0, 0) -1.87291px -0.701566px 0px, rgb(0, 0, 0) -1.30729px -1.51361px 0px, rgb(0, 0, 0) -0.421592px -1.95506px 0px, rgb(0, 0, 0) 0.567324px -1.91785px 0px, rgb(0, 0, 0) 1.41734px -1.41108px 0px, rgb(0, 0, 0) 1.92034px -0.558831px 0px",
                }}>
                {label}
            </div>

            <div
                className="text-center"
                style={{
                    position: "absolute",
                    height: "50%",
                    width: "100%",
                    top: "50%",
                    backgroundColor: "black",
                    opacity: buttonDownVisible ? "65%" : "0%",
                    display: showButtons ? "block" : "none",
                    zIndex: zIndex + 2,
                    cursor: extrudeFilter ? "pointer" : undefined,
                }}
                onMouseOver={() => setButtonDownVisible(true)}
                onMouseLeave={() => setButtonDownVisible(false)}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(event) => clickArrow(event,-1)}
                onDoubleClick={(event) => handleDoubleClick(event)}>
                <FontAwesomeIcon 
                    className="text-white" 
                    style={{
                        position:"absolute", 
                        top:"15%", 
                        left:"30%",
                    }}  
                    icon={faChevronDown}/>
            </div>

            <div
                className="text-center"
                style={{
                    position: "absolute",
                    height: "50%",
                    width: "100%",
                    backgroundColor: "black",
                    opacity: buttonUpVisible ? "65%" : "0%",
                    display: showButtons ? "block" : "none",
                    zIndex: zIndex + 2,
                    cursor: extrudeFilter ? "pointer" : undefined,
                }}
                onMouseOver={() => setButtonUpVisible(true)}
                onMouseLeave={() => setButtonUpVisible(false)}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(event) => clickArrow(event,1)}
                onDoubleClick={(event) => handleDoubleClick(event)}>
                <FontAwesomeIcon 
                    className="text-white" 
                    style={{
                        position:"absolute", 
                        top:"15%", 
                        left:"30%",
                    }} 
                    icon={faChevronUp}
                />
            </div>
            {/* Token art. With extrudeFilter set the <img> establishes its own
                stacking context, which would otherwise paint over the label
                (it's the last child). The isolated wrapper + negative z-index
                pushes it behind the number/buttons without disturbing their
                static-position layout.

                The counter-rotation keeps the extrusion wall pointing
                screen-down on rotated (e.g. exhausted) cards: CSS applies the
                `filter` in the img's LOCAL space, then its `transform`. The
                card face rotates the token by +rotation, so rotating the img by
                -rotation cancels it — the wall's fixed downward offset lands
                screen-down again. (Round token art is unchanged by the spin.) */}
            <img
                className="block h-full"
                style={extrudeFilter
                    ? { filter: extrudeFilter, overflow: "visible", position: "relative", zIndex: -1,
                        transform: `rotate(${-(rotation || 0)}deg)` }
                    : undefined}
                src={tokenDef.imageUrl}/>
        </div>
        </Draggable>
    )
})
import React from "react";
import { useDispatch, useSelector } from 'react-redux';
import { Tokens } from './Tokens';
import { CardMouseRegion } from "./CardMouseRegion";
import { Target } from "./Target";
import { setActiveCardId } from "../store/playerUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useVisibleFace } from "./hooks/useVisibleFace";
import { CardArrows } from "./CardArrows";
import { CardImage } from "./CardImage";
import { DefaultActionLabel } from "./DefaultActionLabel";
import { useCardStyle } from "./hooks/useCardStyle";
import { PeekingSymbol } from "./PeekingSymbol";
import { AbilityButton } from "./AbilityButton";

export const Card = React.memo(({
    cardId,
    cardIndexFromGui,
    offset,
    isDragging,
    hideArrows,
}) => { 
    const dispatch = useDispatch();
    const gameDef = useGameDefinition();
    const cardCurrentSide = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.currentSide);
    const currentFace = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.sides?.[cardCurrentSide]);
    const dropdownMenuVisible = useSelector(state => state?.playerUi?.dropdownMenu?.visible);
    const cardVisibleFace = useVisibleFace(cardId);
    const cardStyle = useCardStyle(cardId, cardIndexFromGui, isDragging, offset);
    const isActive = useSelector(state => {return state?.playerUi?.activeCardId === cardId});

    if (!cardCurrentSide) return;

    console.log('Rendering Card ',currentFace.name);

    const handleMouseLeave = (_event) => {
        if (!dropdownMenuVisible) dispatch(setActiveCardId(null))
    }

    var [height, width] = [cardVisibleFace.height, cardVisibleFace.width];
    if (!height || !width) {
        height = gameDef?.cardBacks?.[cardVisibleFace.name]?.height;
        width = gameDef?.cardBacks?.[cardVisibleFace.name]?.width;
    }
    // FIXME: display error if height and width still not defined?

    return (
            <div 
                id={cardId}
                className={isActive ? "shadow-yellow" : null}
                key={cardId}
                style={cardStyle}
                onMouseLeave={event => handleMouseLeave(event)}
            >
                <CardImage cardId={cardId}/>

                <DefaultActionLabel cardId={cardId}/>

                <PeekingSymbol cardId={cardId}/>

                <Target
                    cardId={cardId}/>
                <CardMouseRegion 
                    topOrBottom={"top"}
                    cardId={cardId}
                    isActive={isActive}/>
                <CardMouseRegion 
                    topOrBottom={"bottom"}
                    cardId={cardId}
                    isActive={isActive}/>
                <Tokens
                    cardId={cardId}
                    isActive={isActive}
                    aspectRatio={width/height}/>

                <CardArrows cardId={cardId} hideArrows={hideArrows}/>

                <AbilityButton cardId={cardId}/>
                
            </div>
    )
})
import { useSelector } from 'react-redux';
import { useRef } from 'react';
import { useCardScaleFactor } from './useCardScaleFactor';
import { Z_INDEX } from '../functions/common';
import { useGameDefinition } from './useGameDefinition';
import { useVisibleFace } from './useVisibleFace';
import { useCardRotation } from './useCardRotation';

export const useCardStyle = (cardId, cardIndexFromGui, isDragging, offset) => {
    const gameDef = useGameDefinition();
    const rawRotation = useCardRotation(cardId);
    const displayRotationRef = useRef(rawRotation);
    // Compute shortest-path delta so CSS transitions don't go the long way around
    let delta = ((rawRotation - displayRotationRef.current) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    const cardRotation = displayRotationRef.current + delta;
    displayRotationRef.current = cardRotation;
    const cardIndex = cardIndexFromGui || 0;
    const cardScaleFactor = useCardScaleFactor();
    const cardVisibleFace = useVisibleFace(cardId);
    const zIndex = Z_INDEX.Card - cardIndex;
    const cardBorderColor = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.borderColor);

    var [height, width] = [cardVisibleFace?.height, cardVisibleFace?.width];
    if (!height || !width) {
        height = gameDef?.cardBacks?.[cardVisibleFace.name]?.height;
        width = gameDef?.cardBacks?.[cardVisibleFace.name]?.width;
    }

    console.log({width, height});
    console.log("Rendering CardFace ",cardVisibleFace);
    console.log("Rendering CardFace {cardScaleFactor, width, height}",{cardScaleFactor, width, height});

    const style = {
        position: "absolute",
        height: `${cardScaleFactor*height}dvh`,
        width: `${cardScaleFactor*width}dvh`,
        left: `${offset.left}dvh`,
        top: `${offset.top}dvh`,
        borderRadius: '0.6dvh',
        transform: `rotate(${cardRotation}deg)`,
        zIndex: zIndex,
        cursor: "default",
        WebkitTransitionDuration: "0.1s",
        MozTransitionDuration: "0.1s",
        OTransitionDuration: "0.1s",
        transitionDuration: "0.1s",
        WebkitTransitionProperty: "-webkit-transform",
        MozTransitionProperty: "-moz-transform",
        OTransitionProperty: "-o-transform",
        transitionProperty: "transform",
        MozBoxShadow: isDragging ? '10px 10px 30px 20px rgba(0, 0, 0, 0.3)' : null,
        WebkitBoxShadow: isDragging ? '10px 10px 30px 20px rgba(0, 0, 0, 0.3)': null,
        '--tw-shadow': cardBorderColor ? `0 0 10px ${cardBorderColor}` : null,
        boxShadow: cardBorderColor ? 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)' : null,
        //opacity: 0.3
      
    }
    return style;
}
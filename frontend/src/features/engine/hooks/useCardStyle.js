import { useSelector } from 'react-redux';
import { useCardScaleFactor } from './useCardScaleFactor';
import { ATTACHMENT_OFFSET, DEFAULT_CARD_Z_INDEX } from '../functions/common';
import { useCardProp } from './useCardProp';
import { useCardZIndex } from './useCardZIndex';
import { useGameDefinition } from './useGameDefinition';
import { useVisibleFace } from './useVisibleFace';

export const useCardStyle = (cardId, cardIndexFromGui, isDragging, offset) => {
    const gameDef = useGameDefinition();
    const cardRotation = useCardProp(cardId, "rotation");
    const cardIndex = cardIndexFromGui || 0;
    const cardScaleFactor = useCardScaleFactor();
    const cardVisibleFace = useVisibleFace(cardId);
    console.log("zIndex card", DEFAULT_CARD_Z_INDEX, cardIndex);
    const zIndex = DEFAULT_CARD_Z_INDEX - cardIndex;
    const isActive = useSelector(state => {return state?.playerUi?.activeCardId === cardId});
    const cardBorderColor = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.borderColor);

    var [height, width] = [cardVisibleFace?.height, cardVisibleFace?.width];
    if (!height || !width) {
        height = gameDef?.cardBacks?.[cardVisibleFace.name]?.height;
        width = gameDef?.cardBacks?.[cardVisibleFace.name]?.width;
    }

    console.log({width, height});
    console.log("Rendering CardFace ",cardVisibleFace);

    const style = {
        position: "absolute",
        height: `${cardScaleFactor*height}vh`,
        width: `${cardScaleFactor*width}vh`,
        left: `${offset.left}vh`,
        top: `${offset.top}vh`,
        borderRadius: '0.6vh',
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
        boxShadow: isDragging ? '10px 10px 30px 20px rgba(0, 0, 0, 0.3)': null,  
        '--tw-shadow': cardBorderColor ? `0 0 10px ${cardBorderColor}` : null,
        boxShadow: cardBorderColor ? 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)' : null,
      
    }
    return style;
}
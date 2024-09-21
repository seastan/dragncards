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
        boxShadow: isDragging ? '10px 10px 30px 20px rgba(0, 0, 0, 0.3)': null,  
        '--tw-shadow': cardBorderColor ? `0 0 10px ${cardBorderColor}` : null,
        boxShadow: cardBorderColor ? 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)' : null,
        //opacity: 0.3
      
    }
    return style;
}
import React, { useEffect } from "react";
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
import { FadeTextCard } from "./FadeTextCard";

import styled, { keyframes, css } from "styled-components";
import { MultiSelectOverlay } from "./MultiSelectOverlay";

// Define the vibration keyframes that respect existing rotation
const vibrate = (baseRotation = "0deg") => keyframes`
  0% { transform: rotate(calc(${baseRotation} + 0deg)); box-shadow: 0 0 5px rgba(0, 123, 255, 0.8)}
  8% { transform: rotate(calc(${baseRotation} + 3deg)); }
  24% { transform: rotate(calc(${baseRotation} + -3deg)); }
  40% { transform: rotate(calc(${baseRotation} + 3deg)); box-shadow: 0 0 20px rgba(0, 123, 255, 0.9)}
  56% { transform: rotate(calc(${baseRotation} + -3deg)); }
  72% { transform: rotate(calc(${baseRotation} + 3deg)); }
  88% { transform: rotate(calc(${baseRotation} + -3deg)); box-shadow: 0 0 30px rgba(0, 123, 255, 0)}
`;

// Define the Styled Card Component
const StyledCard = styled.div`
  border-radius: 10px;
  ${(props) =>
    props.isGlowing &&
    css`
      animation: ${vibrate(props.baseRotation)} 0.75s infinite alternate;
    `}
`;

const getRotationFromTransform = (transform) => {
    const match = transform?.match(/rotate\(([^)]+)\)/);
    return match ? match[1] : "0deg";
  };

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
    const cardRotation = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.rotation);
    const isActive = useSelector(state => {return state?.playerUi?.activeCardId === cardId});
    const triggeredTimestamp = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.triggeredTimestamp);
    const shouldGlow = triggeredTimestamp !== undefined && triggeredTimestamp !== null;
    const [isGlowing, setIsGlowing] = React.useState(false);

    useEffect(() => {
        if (shouldGlow) {
            setIsGlowing(true);
            setTimeout(() => {
                setIsGlowing(false); 
            }, 750);
        }
    }, [triggeredTimestamp]);

    if (!cardCurrentSide) return;

    console.log('Rendering Card ',currentFace.name, shouldGlow);

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
        // <div 
        //     id={cardId}
        //     className={`card-container ${isActive ? "shadow-yellow" : ""} ${isGlowing ? "glowing-vibrating" : ""}`}
        //     key={cardId}
        //     style={cardStyle}
        //     onMouseLeave={event => handleMouseLeave(event)}
        // >
        <StyledCard
            id={cardId}
            className={`card-container ${isActive ? "shadow-yellow" : ""}`}
            key={cardId}
            baseRotation={`${cardRotation}deg`}
            isGlowing={isGlowing}
            style={cardStyle}
            onMouseLeave={handleMouseLeave}
        >
            <CardImage cardId={cardId}/>
            <DefaultActionLabel cardId={cardId}/>
            <PeekingSymbol cardId={cardId}/>
            <Target cardId={cardId}/>
            <CardMouseRegion topOrBottom={"top"} cardId={cardId} isActive={isActive}/>
            <CardMouseRegion topOrBottom={"bottom"} cardId={cardId} isActive={isActive}/>
            <Tokens cardId={cardId} isActive={isActive} aspectRatio={width/height}/>
            <CardArrows cardId={cardId} hideArrows={hideArrows}/>
            <AbilityButton cardId={cardId}/>
            <MultiSelectOverlay cardId={cardId} />
            <FadeTextCard cardId={cardId} />
        </StyledCard>
    );
   
})
import React from "react";
import { useSelector } from 'react-redux';
import { Token } from "./Token";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useCardZIndex } from "./hooks/useCardZIndex";

export const Tokens = React.memo(({
    cardId,
    isActive,
    aspectRatio,
    extrudeFilter = null,
 }) => {
    const spacePressed = useSelector(state => Boolean(state?.playerUi?.keypress?.Space));
    const showButtons = isActive && spacePressed;
    const gameDef = useGameDefinition();
    const sideAType = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.sides?.A?.type);
    const tokenTypes = gameDef.cardTypes?.[sideAType]?.tokens || [];
    const zIndex = useCardZIndex(cardId);
    return(
        // dnc3d (extrudeFilter set): pointer-events:none so this full-card layer
        // doesn't swallow the card's hover/click — the individual token boxes
        // re-enable hit-testing for their own (small) area.
        <div className="absolute" style={{width:'100%', height:'100%', pointerEvents: extrudeFilter ? 'none' : undefined}}>
            {tokenTypes.map((tokenType, tokenIndex) => {
                return (
                    <Token
                        key={tokenIndex}
                        cardId={cardId}
                        tokenType={tokenType}
                        showButtons={showButtons}
                        zIndex={zIndex+tokenIndex}
                        aspectRatio={aspectRatio}
                        extrudeFilter={extrudeFilter}
                    />
                )
            })}
         </div>
    )
});
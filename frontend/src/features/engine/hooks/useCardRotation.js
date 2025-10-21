import { useSelector } from 'react-redux';
import { usePlayerN } from './usePlayerN';

export const useCardRotation = (cardId) => {
    const playerN = usePlayerN();
    const cardRotation = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.rotation);
    const rotationByPlayer = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.rotationByPlayer);
    if (cardId === "8ae4a4d1-a9c9-4a66-9533-0ca0aed74076") {
        console.log("useCardRotation", cardId, playerN, cardRotation, rotationByPlayer);
    }
    if(rotationByPlayer && rotationByPlayer[playerN] !== undefined) {
        if (cardId === "8ae4a4d1-a9c9-4a66-9533-0ca0aed74076") {
            console.log("useCardRotation returning", rotationByPlayer[playerN]);
        }
        return rotationByPlayer[playerN];
    }
    return cardRotation || 0;

}
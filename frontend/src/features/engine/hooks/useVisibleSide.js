import { useSelector } from "react-redux";
import { usePlayerN } from "./usePlayerN";

export const useVisibleSide = (cardId) => {
    const playerN = usePlayerN();
    const currentSide = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.currentSide);
    const peekingPlayerN = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.peeking?.[playerN]);
    const peekingAll = useSelector(state => state?.playerUi?.spectatorMode?.peekingAll);
    return (peekingPlayerN || peekingAll) ? "A" : currentSide;
}
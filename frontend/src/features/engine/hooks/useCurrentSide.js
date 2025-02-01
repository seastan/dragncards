import { useSelector } from "react-redux";

export const useCurrentSide = (cardId) => {
    return useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.currentSide);
}
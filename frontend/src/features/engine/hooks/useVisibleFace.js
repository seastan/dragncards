import { useSelector } from "react-redux";
import { useVisibleSide } from "./useVisibleSide";

export const useVisibleFace = (cardId) => {
    const visibleSide = useVisibleSide(cardId);
    return useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.sides?.[visibleSide]);
}
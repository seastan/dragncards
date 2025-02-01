import { useSelector } from "react-redux";
import { useCurrentSide } from "./useCurrentSide";

export const useCurrentFace = (cardId) => {
    const currentSide = useCurrentSide(cardId);
    return useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.sides?.[currentSide]);
}
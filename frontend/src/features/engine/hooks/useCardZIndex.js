import { useSelector } from "react-redux"
import { DEFAULT_CARD_Z_INDEX } from "../functions/common";

export const useCardZIndex = (cardId) => {
    return DEFAULT_CARD_Z_INDEX - useSelector(state => state?.gameUi?.game?.cardById[cardId]?.cardIndex) - useSelector(state => state?.gameUi?.game?.cardById[cardId]?.stackIndex);
}
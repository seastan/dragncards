import { useSelector } from 'react-redux';

export const useCardProp = (cardId, propName) => {
    return useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.[propName]);
}
import { useSelector } from 'react-redux';
import { useActiveCardId } from './useActiveCardId';

export const useActiveCard = () => {
    const activeCardId = useActiveCardId();

    const cardFromState = useSelector(state => state?.gameUi?.game?.cardById?.[activeCardId]);
    // useEffect(() => {
    //     if (cardFromState?.groupId && previousActiveCardId) {
    //         dispatch(setActiveCardId(null));
    //     }
    //     setPreviousActiveCardId(cardFromState?.groupId);
    // }, [cardFromState?.groupId, cardFromState?.stackIndex, cardFromState?.cardIndex]);

    return cardFromState;
};




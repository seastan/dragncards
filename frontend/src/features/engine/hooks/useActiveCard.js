import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveCardId } from '../../store/playerUiSlice';
import { useActiveCardId } from './useActiveCardId';

export const useActiveCard = () => {
    const activeCardId = useActiveCardId();
    const dispatch = useDispatch();
    const [previousActiveCardId, setPreviousActiveCardId] = useState(null);

    const cardFromState = useSelector(state => state?.gameUi?.game?.cardById?.[activeCardId]);
    // useEffect(() => {
    //     if (cardFromState?.groupId && previousActiveCardId) {
    //         dispatch(setActiveCardId(null));
    //     }
    //     setPreviousActiveCardId(cardFromState?.groupId);
    // }, [cardFromState?.groupId, cardFromState?.stackIndex, cardFromState?.cardIndex]);

    return cardFromState;
};




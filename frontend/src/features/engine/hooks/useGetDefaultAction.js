import { useSelector } from 'react-redux';
import { evaluate } from './evaluate';
import { useGameDefinition } from './useGameDefinition';
import store from '../../../store';

// Card-agnostic form: returns a function that resolves the default action for
// ANY card. useGetDefaultAction below binds to a single cardId through
// useSelector, which is unusable from an event callback that is handed whichever
// card the user just touched (the dnc3d renderer's onCardClick).
export const useGetDefaultActionForCard = () => {
  const gameDef = useGameDefinition();
  const defaultActions = gameDef?.defaultActions;
  return ((card) => {
    if (!defaultActions || !card) return null;
    for (var defaultAction of defaultActions) {
      const state = store.getState();
      if (evaluate(state, card, defaultAction.condition)) return defaultAction;
    }
    return null;
  })
}

export const useGetDefaultAction = (cardId) => {
  const getDefaultActionForCard = useGetDefaultActionForCard();
  const card = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]);
  return (() => getDefaultActionForCard(card))
}

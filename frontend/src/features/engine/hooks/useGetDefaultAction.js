import { useSelector } from 'react-redux';
import { evaluate } from './evaluate';
import { useGameDefinition } from './useGameDefinition';
import store from '../../../store';

export const useGetDefaultAction = (cardId) => {
  const gameDef = useGameDefinition();
  const defaultActions = gameDef?.defaultActions;
  const card = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]);
  if (!defaultActions) return () => null;
  return (() => {
    for (var defaultAction of defaultActions) {
      const state = store.getState();
      console.log("equal condition", defaultAction.condition, evaluate(state, card, defaultAction.condition))
      if (evaluate(state, card, defaultAction.condition)) return defaultAction; 
    }
    return null;
  })
}

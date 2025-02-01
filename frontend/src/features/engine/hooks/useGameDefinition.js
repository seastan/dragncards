import { useSelector } from 'react-redux';
import { usePlugin } from './usePlugin';

export const useGameDefinition = () => {
    const plugin = usePlugin();
    return plugin?.game_def; //useSelector(state => state?.gameUi?.game?.gameDef);
}
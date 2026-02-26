import { usePlugin } from './usePlugin';

export const useCardDb = () => {
    const plugin = usePlugin();
    return plugin?.card_db; 
}
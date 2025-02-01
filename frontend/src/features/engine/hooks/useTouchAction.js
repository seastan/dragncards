import { useSelector } from "react-redux";
import { usePlayerN } from "./usePlayerN";

export const useTouchAction = () => {
    const playerN = usePlayerN();
    return useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.touchAction);
}
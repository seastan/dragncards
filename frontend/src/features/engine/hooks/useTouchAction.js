import { useSelector } from "react-redux";
import { usePlayerN } from "./usePlayerN";
import { useMobileUIActive } from "./useMobileUI";

// The armed touch action. In the mobile UI it lives on this device
// (playerUi.mobileTouchAction); otherwise in the game, as touch mode keeps it.
export const useTouchAction = () => {
    const playerN = usePlayerN();
    const mobileUIActive = useMobileUIActive();
    const gameTouchAction = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.touchAction);
    const mobileTouchAction = useSelector(state => state?.playerUi?.mobileTouchAction);
    return mobileUIActive ? mobileTouchAction : gameTouchAction;
}

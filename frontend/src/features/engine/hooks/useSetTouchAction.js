import { useDispatch } from "react-redux";
import { usePlayerN } from "./usePlayerN";
import { useDoActionList } from "./useDoActionList";
import { useMobileUIActive } from "./useMobileUI";
import { setMobileTouchAction } from "../../store/playerUiSlice";

export const useSetTouchAction = () => {
    const playerN = usePlayerN();
    const doActionList = useDoActionList();
    const dispatch = useDispatch();
    const mobileUIActive = useMobileUIActive();
    // Mobile UI: arming is local to this device, not a game action — so it
    // doesn't log, and undo can't re-arm a hotkey the player put away.
    if (mobileUIActive) return (touchAction) => dispatch(setMobileTouchAction(touchAction));
    return (touchAction) => doActionList([
        ["LOG", `{{$ALIAS_N}} ${touchAction === null? "deselected" : "selected"} an action.`],
        ["SET", `/playerData/${playerN}/touchAction`, touchAction]
      ], `Toggled touch action ${touchAction?.id}`);

}

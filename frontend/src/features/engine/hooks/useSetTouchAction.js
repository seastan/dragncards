import { usePlayerN } from "./usePlayerN";
import { useDoActionList } from "./useDoActionList";

export const useSetTouchAction = () => {
    const playerN = usePlayerN();
    const doActionList = useDoActionList();
    return (touchAction) => doActionList([
        ["LOG", `{{$ALIAS_N}} ${touchAction === null? "deselected" : "selected"} an action.`],
        ["SET", `/playerData/${playerN}/touchAction`, touchAction]
      ], `Toggled touch action ${touchAction?.id}`);

}
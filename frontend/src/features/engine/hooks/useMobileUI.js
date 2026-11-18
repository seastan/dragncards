import { useDispatch, useSelector } from "react-redux";
import { setMobileUI } from "../../store/playerUiSlice";
import { writeMobileUIPref } from "../functions/mobileLayout";
import { useGameDefinition } from "./useGameDefinition";

// Whether the user has mobile UI switched on for this device.
export const useMobileUIEnabled = () => useSelector(state => !!state?.playerUi?.mobileUI);

// Whether the table is actually rendering in mobile UI: switched on AND the
// plugin provides a mobileLayout to render.
export const useMobileUIActive = () => {
    const enabled = useMobileUIEnabled();
    const gameDef = useGameDefinition();
    return enabled && !!gameDef?.mobileLayout;
};

export const useSetMobileUI = () => {
    const dispatch = useDispatch();
    return (value) => {
        writeMobileUIPref(value);
        dispatch(setMobileUI(value));
    };
};

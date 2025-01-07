import { useSelector } from "react-redux";

export const useLayout = () => {
    const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
    return useSelector(state => (observingPlayerN ? state?.gameUi?.game?.playerData?.[observingPlayerN]?.layout : state?.gameUi?.game?.layout));
}

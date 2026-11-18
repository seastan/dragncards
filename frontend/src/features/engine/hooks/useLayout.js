import { useSelector } from "react-redux";
import { useGameDefinition } from "./useGameDefinition";
import { selectLayout } from "../functions/mobileLayout";

// The layout the table renders: the room's live layout, or — with mobile UI on
// and a plugin that defines one — the plugin's mobile layout.
export const useLayout = () => {
    const gameDef = useGameDefinition();
    return useSelector(state => selectLayout(state, gameDef));
}

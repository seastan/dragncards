import { useGameDefinition } from "./useGameDefinition";
import useProfile from "../../../hooks/useProfile";

export const useGameL10n = () => {
    const user = useProfile();
    const gameDef = useGameDefinition();
    const language = user?.language || "English";
    return (label) => {
        if (typeof label !== "string") {
            // Stringify the label if it's not a string
            return JSON.stringify(label);
        } else if (label.startsWith("id:")) {
            const labelId = label.substring(3);
            return gameDef?.labels?.[labelId]?.[language] || gameDef?.labels?.[labelId]?.English;
        }
        else return label;
    }
}
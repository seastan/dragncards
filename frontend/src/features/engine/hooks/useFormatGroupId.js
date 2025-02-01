import { useSelector } from "react-redux";
import { playerIToPlayerIndex } from "../functions/common";

export const useFormatGroupId = () => {
    const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
    const numPlayers = useSelector(state => state?.gameUi?.game?.numPlayers);
    const observingPlayerIndex = playerIToPlayerIndex(observingPlayerN);
    return (groupId) => {
        // If the groupId contains "{playerN+X}", replace it with "playerY", where Y is ((observingPlayerIndex + X) % numPlayers) + 1
        var pattern = /{playerN([+-]\d+)}/g;
        if (pattern.test(groupId)) {
            return groupId.replace(pattern, (_, offset) => {
                const offsetInt = parseInt(offset);
                return `player${((observingPlayerIndex + offsetInt) % numPlayers) + 1}`;
            });
        }
        pattern = /playerN([+-]\d+)/g;
        if (pattern.test(groupId)) {
            return groupId.replace(pattern, (_, offset) => {
                const offsetInt = parseInt(offset);
                return `player${((observingPlayerIndex + offsetInt) % numPlayers) + 1}`;
            });
        }
        groupId = groupId.replace(/{playerN}/g, observingPlayerN);
        groupId = groupId.replace(/playerN/g, observingPlayerN);
        return groupId;
    }
}
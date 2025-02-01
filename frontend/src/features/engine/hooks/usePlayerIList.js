import { useSelector } from "react-redux";

export const usePlayerIList = () => {
    const numPlayers = useSelector(state => state?.gameUi?.game?.numPlayers);
    const list = [];
    for (var i=1; i<= numPlayers; i++) {
        list.push("player"+i)
    }
    return list;
}
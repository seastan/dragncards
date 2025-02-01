import { useSelector } from "react-redux";

export const useActiveCardId = () => {
    return useSelector(state => state?.playerUi?.activeCardId);
}

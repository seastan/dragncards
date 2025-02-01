import { useSelector } from "react-redux";

export const usePlayerN = () => {
    return useSelector(state => state?.playerUi?.playerN);
}

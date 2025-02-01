import { useSelector } from "react-redux";
import useProfile from "../../../hooks/useProfile";

export const useIsHost = () => {
    const myUser = useProfile();
    const myUserID = myUser?.id;
    const createdBy = useSelector(state => state.gameUi?.createdBy);
    return myUserID === createdBy;  
}

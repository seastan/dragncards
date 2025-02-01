import { useSelector } from "react-redux";
import useProfile from "../../../hooks/useProfile";

export const useIsPluginAuthor = () => {
    const myUser = useProfile();
    const myUserID = myUser?.id;
    const pluginAuthorId = useSelector(state => state.gameUi?.pluginAuthorId);
    return myUserID === pluginAuthorId;
}

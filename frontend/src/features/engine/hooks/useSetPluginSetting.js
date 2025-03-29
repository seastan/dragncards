import { useSelector } from "react-redux";
import useProfile from "../../../hooks/useProfile";
import { useGameDefinition } from "./useGameDefinition";
import { usePlugin } from "./usePlugin";
import { useAuthOptions } from "../../../hooks/useAuthOptions";
import Axios from "axios";
import { useSiteL10n } from "../../../hooks/useSiteL10n";

export const useSetPluginSetting = () => {
    const user = useProfile();
    const plugin = usePlugin();
    const gameDef = useGameDefinition();
    const authOptions = useAuthOptions();
    const siteL10n = useSiteL10n();

    return async (scope, keyVals) => {

    // Update the database
    const newDatabasePluginSettings = {
        [plugin.id]: {
            [scope]: keyVals
        }
    };
      
      // If any settings are being updated, update the database
      const res = await Axios.post("/be/api/v1/profile/update_plugin_user_settings", newDatabasePluginSettings, authOptions);
  
      if (res.status !== 200) {
        alert(siteL10n("settingUpdateError")); 
      } else {
        user.doFetchHash(Date.now());
      }
    }
}
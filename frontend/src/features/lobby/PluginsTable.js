import React, { useEffect, useState } from "react";
import { RotatingLines } from "react-loader-spinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarO } from "@fortawesome/free-regular-svg-icons";
import { faChevronRight, faStar as faStarS } from "@fortawesome/free-solid-svg-icons";
import moment from "moment";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { useHistory } from "react-router-dom";
import useProfile from "../../hooks/useProfile";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import Axios from "axios";

export const PluginsTable = ({ plugins }) => {
  const siteL10n = useSiteL10n();
  const history = useHistory();
  const user = useProfile();
  const authOptions = useAuthOptions();

  const [favorites, setFavorites] = useState(
    () => user?.plugin_settings?.lobby?.favoritePlugins || {}
  );

  // Sync favorites when user profile loads or updates (e.g. after page refresh)
  useEffect(() => {
    const loaded = user?.plugin_settings?.lobby?.favoritePlugins;
    if (loaded) {
      setFavorites(loaded);
    }
  }, [user?.plugin_settings?.lobby?.favoritePlugins]);

  const toggleFavorite = async (pluginId) => {
    const newFavorites = {...favorites};
    if (newFavorites[pluginId]) {
      delete newFavorites[pluginId];
    } else {
      newFavorites[pluginId] = true;
    }
    setFavorites(newFavorites);

    const settingsUpdate = { favoritePlugins: newFavorites };
    const newDatabasePluginSettings = { lobby: settingsUpdate };
    await Axios.post("/be/api/v1/profile/update_plugin_user_settings", newDatabasePluginSettings, authOptions);

    const pluginSettings = user.plugin_settings || {};
    pluginSettings.lobby = {
      ...pluginSettings.lobby,
      ...settingsUpdate,
    };
    user.setData({
      user_profile: {
        ...user,
        plugin_settings: pluginSettings,
      }
    });
  };

  // Check if plugin is less than a week old
  const isNewPlugin = (createdAt) => {
    if (!createdAt) return false;
    const weekAgo = moment().subtract(7, 'days');
    return moment(createdAt).isAfter(weekAgo);
  };

  // Sort plugins so favorites appear first, preserving relative order within each group
  const sortedPlugins = plugins ? [...plugins].sort((a, b) => {
    const aFav = favorites[a.id] ? 1 : 0;
    const bFav = favorites[b.id] ? 1 : 0;
    return bFav - aFav;
  }) : plugins;

  const trClass = "relative mb-2 h-full w-full flex items-center text-white no-underline select-none rounded-lg w-full bg-gray-600-30 hover:bg-red-600-30"

  return (
        <div className="w-full">
          {plugins == null ?      
            <div className="flex justify-center">
              <RotatingLines
                height={100}
                width={100}
                strokeColor="white"/>
            </div> 
            :
            <table className="w-full">
            {sortedPlugins?.map((plugin) => {
              const isFavorite = !!favorites[plugin.id];
              return(
                <tr key={plugin.id} className={trClass} onClick={() => history.push("/plugin/"+plugin.id)}>
                  {/* New plugin badge */}
                  {isNewPlugin(plugin.inserted_at) && (
                    <div className="absolute left-0 top-0 bg-red-600 text-white text-xs font-bold px-2 rounded-br-lg rounded-tl-lg shadow-lg z-10">
                       New
                    </div>
                  )}
                  <div className="relative m-4">
                    <div className="text-xl inline">
                      {user && <FontAwesomeIcon
                        className="cursor-pointer mr-2"
                        icon={isFavorite ? faStarS : faStarO}
                        style={{color: isFavorite ? "#f59e0b" : "#6b7280"}}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(plugin.id);
                        }}
                      />}
                      {plugin.name}
                    </div>
                    <div className="text-xs">{siteL10n("Last update:") + " " + moment.utc(plugin.updated_at).local().format("YYYY-MM-DD HH:mm:ss")}</div>
                    <div className="text-xs">{siteL10n("Author:") + " " + plugin.author_alias}</div>
                    <div className="text-xs">{siteL10n("Games in 24hr/30d:") + " " + plugin.count_24hr + "/" + plugin.count_30d}</div>
                  </div>
                  <div className="absolute right-0 flex items-center p-4">
                    <a className="text-white" target="_blank" onClick={() => {}}>
                      <FontAwesomeIcon size="2x" icon={faChevronRight}/>
                    </a>
                  </div>

                </tr>
              )
            })}
            </table>
          }
          <div>
        </div>
      </div>
  );
};
export default PluginsTable;

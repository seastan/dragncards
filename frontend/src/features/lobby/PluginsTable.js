import React, { useState } from "react";
import Button from "../../components/basic/Button";
import { RotatingLines } from "react-loader-spinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarO } from "@fortawesome/free-regular-svg-icons";
import { faChevronRight, faStar as faStarS } from "@fortawesome/free-solid-svg-icons";
import moment from "moment";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { useHistory } from "react-router-dom";
import useDataApi from "../../hooks/useDataApi";

export const PluginsTable = ({ plugins }) => {
  const siteL10n = useSiteL10n();
  const history = useHistory();
  const [starHoverIndex, setStarHoverIndex] = useState(null);
  console.log("plugins 1", plugins)
  const toggleFavorite = () => null;
  const numPlugins = plugins?.length || 0;

  // const { isLoading, isError, data, setData } = useDataApi(
  //   "/be/api/rooms",
  //   null
  // );

  // // Get the number of rooms for each plugin
  // const rooms = data?.data != null ? data.data : [];
  // var roomsByPlugin = {};
  // for (var i=0; i<rooms.length; i++) {
  //   const room = rooms[i];
  //   if (roomsByPlugin[room.plugin_id] == null) {
  //     roomsByPlugin[room.plugin_id] = 1;
  //   } else {
  //     roomsByPlugin[room.plugin_id] = roomsByPlugin[room.plugin_id] + 1;
  //   }
  // }

  for (var i=0; i<numPlugins; i++) {
    const pluginTemp = {...plugins[i]};
    plugins[i]["options"] =  <div>
      <Button onClick={() => toggleFavorite(pluginTemp.plugin_id)} isPrimary className="mx-2 mt-2">Favorite</Button>
      
      <Button onClick={() => history.push("/plugin/"+pluginTemp.plugin_id)} isPrimary className="mx-2 mt-2">Play</Button>
    </div>
  }

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
            {plugins?.map((plugin, pluginIndex) => {
              return(
                <tr className={trClass} onClick={() => history.push("/plugin/"+plugin.id)}>
                  <div className="relative m-4">
                    <div className="text-xl inline">{plugin.name}</div>
                    {/* <a 
                      className={"text-white text-lg pl-2"} 
                      target="_blank">
                      <FontAwesomeIcon 
                        className="cursor-pointer"
                        icon={starHoverIndex === pluginIndex ? faStarS : faStarO}
                        onMouseEnter={() => {setStarHoverIndex(pluginIndex)}}
                        onMouseLeave={() => {setStarHoverIndex(null)}}/>
                    </a>
                    <div className="inline">({plugin.num_favorites})</div> */}
                    <div className="text-xs">{siteL10n("Last update:") + " " + moment.utc(plugin.updated_at).local().format("YYYY-MM-DD HH:mm:ss")}</div>
                    <div className="text-xs">{siteL10n("Author:") + " " + plugin.author_alias}</div>
                    <div className="text-xs">{siteL10n("Games in 24hr/30d:") + " " + plugin.count_24hr + "/" + plugin.count_30d}</div>
                    {/* <div className="text-xs">{siteL10n("Games in Progress:") + " " + (roomsByPlugin[plugin.id] || 0)}</div> */}
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

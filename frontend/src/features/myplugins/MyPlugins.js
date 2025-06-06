import React, { useEffect, useMemo, useReducer, useState } from "react";
import { useHistory } from "react-router-dom";
import useProfile from "../../hooks/useProfile";
import useDataApi from "../../hooks/useDataApi";
import { parseISO, format, formatDistanceToNow, set } from "date-fns";
import axios from "axios";
import { EditPluginModal } from "./editplugin/EditPluginModal";
import * as moment from 'moment';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faShare, faTrash, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { NewPluginModal } from "./NewPluginModal";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import useAuth from "../../hooks/useAuth";
import { LobbyButton } from "../../components/basic/LobbyButton";
import SharePluginModal from "./editplugin/SharePluginModal";

//const lobbyButtonClass = 
const iconButtonClass = "cursor-pointer hover:bg-white hover:text-black h-full w-full m-2 rounded flex items-center justify-center text-white no-underline select-none"

const MyPluginEntry = ({plugin, setSelectedPlugin, setShowEditModal, setShowShareModal, doFetchHash, index}) => {
  const siteL10n = useSiteL10n();
  const { authToken, renewToken, setAuthAndRenewToken } = useAuth();
  const authOptions = useMemo(
    () => ({
      headers: {
        Authorization: authToken,
      },
    }),
    [authToken]
  );

  const handleEditClick = () => {
    setSelectedPlugin(plugin);
    setShowEditModal(true);
  }
  const handleShareClick = () => {
    setSelectedPlugin(plugin);
    setShowShareModal(true);
  }
  const handleDeleteClick = async () => {
    const conf = window.confirm(siteL10n(`This will delete ${plugin.name} and all decks built by users for this plugin. Are you sure?`));
    if (conf) {
      const res = await axios.delete("/be/api/myplugins/"+plugin.id, authOptions);

      if (res.status === 200) {
        doFetchHash((new Date()).toISOString());
      }
    }
    
  }
  return(
    <div className={"relative w-full p-4 my-2 rounded-lg text-white "+((index % 2 === 0) ? "bg-gray-700" : "bg-gray-800")}>
      <h1>{plugin.name}</h1>
      <div className="text-xs">Last update: {moment.utc(plugin.updated_at).local().format("YYYY-MM-DD HH:mm:ss")}</div>
      <div className={plugin.public ? "text-xs text-green-500" : "text-xs text-red-500" }>{plugin.public ? "Public" : "Private"}</div>
      <div className="absolute top-0" style={{height: "30px", width: "30px", right: "75px"}}>
        <a className={iconButtonClass} target="_blank" onClick={() => handleEditClick()}>
          <FontAwesomeIcon className="" icon={faEdit}/>
        </a>
      </div>
      <div className="absolute top-0" style={{height: "30px", width: "30px", right: "45px"}}>
        <a className={iconButtonClass} target="_blank" onClick={() => handleShareClick()}>
          <FontAwesomeIcon className="" icon={faUserPlus}/>
        </a>
      </div>
      <div className="absolute top-0" style={{height: "30px", width: "30px", right: "15px"}}>
        <a className={iconButtonClass} target="_blank" onClick={() => handleDeleteClick()}>
          <FontAwesomeIcon className="" icon={faTrash}/>
        </a>
      </div>
      
    </div>
  )
}

export const MyPlugins = () => {
  const user = useProfile();
  const history = useHistory();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [deletedIndices, setDeletedIndices] = useState([]); 
  const [_, forceUpdate] = useReducer((x) => x + 1, 0);

  var [wins, losses, incompletes] = [0, 0, 0];
  const { data, isLoading, isError, doFetchUrl, doFetchHash, setData } = useDataApi(
    "/be/api/myplugins/"+user?.id,
    null
  );
  console.log('Rendering MyPlugins', data);
  useEffect(() => {
    if (user?.id) doFetchUrl("/be/api/myplugins/"+user.id);
  }, [user]);
  if (user == null) {
    return null;
  }
  const insertedDate = parseISO(user.inserted_at);
  const insertedAbsolute = format(insertedDate, "yyyy-MM-dd hh:mm bb");
  const insertedRelative = formatDistanceToNow(insertedDate, {
    addSuffix: true,
  });
  const handleNewClick = () => {
    setSelectedPlugin(null);
    setShowEditModal(true);
  }
  const handleLayoutGeneratorClick = () => {
    history.push("/layout-generator");
  }

  return (
    <div className="mt-4 mx-auto w-full p-2 overflow-y-scroll" style={{maxWidth: "600px"}}>
      <div className="w-full p-2" style={{height: "80px"}}>
        <LobbyButton className="p-2 my-2" onClick={() => handleNewClick()}>
          New Plugin
        </LobbyButton>
      </div>
      <div className="w-full p-2" style={{height: "50px"}}>
        <LobbyButton  className="p-1" onClick={() => handleLayoutGeneratorClick()}>
          Layout Generator Tool
        </LobbyButton>
      </div>
      {data?.my_plugins.map((plugin, index) => {
        return(
          <MyPluginEntry 
            key={index}
            plugin={plugin}
            setSelectedPlugin={setSelectedPlugin}
            setShowEditModal={setShowEditModal}
            setShowShareModal={setShowShareModal}
            doFetchHash={doFetchHash}
            index={index}
          />)
      })}
      {showEditModal ? 
        selectedPlugin ?
          <EditPluginModal
            plugin={selectedPlugin}
            closeModal={() => {setShowEditModal(false); setSelectedPlugin(null)}}
            doFetchHash={doFetchHash}
          />
          :
          <EditPluginModal
            plugin={null}
            closeModal={() => {setShowEditModal(false); setSelectedPlugin(null)}}
            doFetchHash={doFetchHash}
          />
        : null
      }
      {showShareModal ?
          <SharePluginModal
            plugin={selectedPlugin}
            closeModal={() => {setShowShareModal(false); setSelectedPlugin(null)}}
          />
        : null
      }
    </div>
  );
};
export default MyPlugins;

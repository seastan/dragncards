import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import CreateRoomModal from "./CreateRoomModal";
import LobbyTable from "./LobbyTable";
import useProfile from "../../hooks/useProfile";
import useIsLoggedIn from "../../hooks/useIsLoggedIn";
import { Announcements } from "./Announcements";
import { LobbyButton } from "../../components/basic/LobbyButton";
import LobbyContainer from "./LobbyContainer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import LfgSection from "./LfgSection";


export const PluginLobby = () => {
  const isLoggedIn = useIsLoggedIn();
  const user = useProfile();
  const history = useHistory();
  const [plugin, setPlugin] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [replayUuid, setReplayUuid] = useState(null);
  const [externalData, setExternalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const url = window.location.href;
  const splitUrl = url.split( '/' );
  const pluginIndex = splitUrl.findIndex((e) => e === "plugin")
  const pluginStr = splitUrl[pluginIndex + 1];
  const pluginId = parseInt(pluginStr);

  const getPlugin = async () => {
    console.log("PluginLobby 0")
    try {
      const res = await axios.get(`/be/api/plugins/visible/${pluginId}/${user?.id ? user.id : 0}`);
      console.log("PluginLobby res", res);
      setPlugin(res.data.data);
    } catch (err) {
      console.log("PluginLobby err", err);
    }
    setIsLoading(false);

  }

  // If user.id changes, reset plugins list
  useEffect(() => {
    getPlugin();
  }, [user]);

  console.log("Rendering PluginLobby", plugin)
  useEffect(() => {
    const url = window.location.href;
    if (url.includes("/load/")) {
      const loadIndex = splitUrl.findIndex((e) => e === "load")
      setReplayUuid(splitUrl[loadIndex + 1]);
      setShowModal("createRoom");
    }
    if (url.includes("/external/")) {
      const externalIndex = splitUrl.findIndex((e) => e === "external")
      const externalDomain = splitUrl[externalIndex + 1];
      const externalType = splitUrl[externalIndex + 2];
      const externalId = splitUrl[externalIndex + 3];
      setExternalData({domain: externalDomain, type: externalType, id: externalId})
      setShowModal("createRoom");
    }
  }, []);

  if (isLoading) return null;
  if (!isLoading && !plugin) return <div className="text-white">Plugin either does not exist or you do not have the necessary permissions to view it.</div>;

  const handleCreateRoomClick = () => {
    if (isLoggedIn) {
      if (user?.email_confirmed_at) setShowModal("createRoom");
      else alert("You must confirm your email before you can start a game.")
    } else {
      history.push("/login")
    }
  }

  return (
    <LobbyContainer maxWidth="1100px">

      {/* Header: back button + plugin name */}
      <div className="flex items-center text-white text-xl mb-4">
        <div className="mr-2" style={{width: "50px", height: "50px"}}>
          <LobbyButton onClick={()=>history.push("/lobby")}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </LobbyButton>
        </div>
        <div>
          {plugin?.name}
          <div className="text-xs">by {plugin?.author_alias}</div>
        </div>
      </div>

      {/* Two-column layout: rooms table (left/main), sidebar (right) */}
      <div className="flex gap-8" style={{flexWrap: "wrap"}}>
        {/* Main column: action buttons + rooms table */}
        <div className="flex-1" style={{minWidth: "320px"}}>
          <div className="flex gap-2 mb-3">
            {plugin?.tutorial_url && (
              <button
                onClick={() => window.open(plugin?.tutorial_url, '_blank')}
                className="bg-gray-600-30 hover:bg-red-600-30 text-white rounded-lg text-lg flex-1 py-4"
              >
                Tutorial
              </button>
            )}
            <button
              onClick={() => handleCreateRoomClick()}
              className="bg-gray-600-30 hover:bg-red-600-30 text-white rounded-lg text-lg flex-1 py-4"
            >
              {isLoggedIn ? "Create Room" : "Log in to create a room"}
            </button>
          </div>
          <Announcements plugin={plugin}/>
          <div className="mt-3">
            <LobbyTable plugin={plugin}/>
          </div>
        </div>

        {/* Vertical separator */}
        <div style={{width: "1px", backgroundColor: "rgba(255,255,255,0.15)"}} className="hidden md:block" />

        {/* Sidebar: LFG */}
        <div className="lfg-sidebar">
          <LfgSection plugin={plugin}/>
        </div>
      </div>
      <style>{`
        .lfg-sidebar {
          width: 100%;
          min-width: 320px;
        }
        @media (min-width: 768px) {
          .lfg-sidebar {
            width: 450px;
            max-width: 450px;
            flex-shrink: 0;
          }
        }
      `}</style>

      <CreateRoomModal
        isOpen={showModal === "createRoom"}
        isLoggedIn={isLoggedIn}
        closeModal={() => setShowModal(null)}
        replayUuid={replayUuid}
        externalData={externalData}
        plugin={plugin}
      />
    </LobbyContainer>
  );
};
export default PluginLobby;

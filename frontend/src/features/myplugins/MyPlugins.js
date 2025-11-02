import React, { useEffect, useMemo, useReducer, useState } from "react";
import { Redirect, useHistory, useLocation } from "react-router-dom";
import useProfile from "../../hooks/useProfile";
import useDataApi from "../../hooks/useDataApi";
import axios from "axios";
import { EditPluginModal } from "./editplugin/EditPluginModal";
import * as moment from 'moment';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faEdit, faShare, faTrash, faUserPlus, faUpload, faWrench, faThLarge, faPlay } from "@fortawesome/free-solid-svg-icons";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import useAuth from "../../hooks/useAuth";
import { LobbyButton } from "../../components/basic/LobbyButton";
import SharePluginModal from "./editplugin/SharePluginModal";
import { downloadGameDefinitionAsZip } from "./pluginbuilder/DownloadPlugin";
import Joyride from "react-joyride";

const iconButtonClass = "cursor-pointer hover:bg-white hover:text-black h-full w-full m-2 rounded flex items-center justify-center text-white no-underline select-none"

const MyPluginEntry = ({plugin, setSelectedPlugin, setShowEditModal, setShowShareModal, doFetchHash, index, createRoom}) => {
  const siteL10n = useSiteL10n();
  const { authToken } = useAuth();
  const authOptions = useMemo(() => ({ headers: { Authorization: authToken }}), [authToken]);

  const handleDownloadClick = async () => {
    const res = await axios.get(`/be/api/plugins/raw/${plugin.id}`, authOptions);
    downloadGameDefinitionAsZip(res.data.game_def);
  };

  const handleEditClick = () => setShowEditModal(true) || setSelectedPlugin(plugin);
  const handleShareClick = () => setShowShareModal(true) || setSelectedPlugin(plugin);
  const handleDeleteClick = async () => {
    const conf = window.confirm(siteL10n(`This will delete ${plugin.name} and all decks built by users for this plugin. Are you sure?`));
    if (conf) {
      const res = await axios.delete("/be/api/myplugins/"+plugin.id, authOptions);
      if (res.status === 200) doFetchHash((new Date()).toISOString());
    }
  };

  const handleCreateRoomClick = async () => {
    await createRoom(plugin.id, plugin.name, plugin.version);
  };

  return(
    <div className={"relative w-full p-4 my-2 rounded-lg text-white "+((index % 2 === 0) ? "bg-gray-700" : "bg-gray-800")}> 
      <h1>{plugin.name}</h1>
      <div className="text-xs">Last update: {moment.utc(plugin.updated_at).local().format("YYYY-MM-DD HH:mm:ss")}</div>
      <div className={plugin.public ? "text-xs text-green-500" : "text-xs text-red-500" }>{plugin.public ? "Public" : "Private"}</div>

      <div className="absolute top-0" style={{height: "30px", width: "30px", right: "105px"}}>
        <a className={"download-btn " + iconButtonClass} onClick={handleDownloadClick}>
          <FontAwesomeIcon icon={faDownload}/>
        </a>
      </div>
      <div className="absolute top-0" style={{height: "30px", width: "30px", right: "75px"}}>
        <a className={"edit-btn " + iconButtonClass} onClick={handleEditClick}>
          <FontAwesomeIcon icon={faEdit}/>
        </a>
      </div>
      <div className="absolute top-0" style={{height: "30px", width: "30px", right: "45px"}}>
        <a className={"share-btn " + iconButtonClass} onClick={handleShareClick}>
          <FontAwesomeIcon icon={faUserPlus}/>
        </a>
      </div>
      <div className="absolute top-0" style={{height: "30px", width: "30px", right: "15px"}}>
        <a className={"delete-btn text-red-500" + iconButtonClass} onClick={handleDeleteClick}>
          <FontAwesomeIcon className="text-red-500" icon={faTrash}/>
        </a>
      </div>

      <div className="absolute" style={{ bottom: "10px", right: "15px", width: "40px", height: "40px" }}>
        <a
          className={"play-btn " + iconButtonClass} 
          onClick={handleCreateRoomClick}
        >
          <FontAwesomeIcon icon={faPlay} className="text-2xl" />
        </a>
      </div>
    </div>
  );
};

export const MyPlugins = () => {
  const user = useProfile();
  const history = useHistory();
  const location = useLocation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [_, forceUpdate] = useReducer((x) => x + 1, 0);
  const [roomSlugCreated, setRoomSlugCreated] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const showTutorial = queryParams.get("showTutorial") === "true";
  const [runTutorial, setRunTutorial] = useState(false);

  const { data, isLoading, isError, doFetchUrl, doFetchHash } = useDataApi(
    "/be/api/myplugins/"+user?.id,
    null
  );

  const createRoom = async (pluginId, pluginName, pluginVersion) => {
    const data = { 
      room: { 
        name: "", 
        user: user?.id, 
        privacy_type: 'private',
      },
      game_options: {
        plugin_id: pluginId,
        plugin_version: pluginVersion,
        plugin_name: pluginName,
        replay_uuid: null,
        external_data: null
      }
    };
    try {
      const res = await axios.post("/be/api/v1/games", data);
      if (res.status !== 201) {
        throw new Error("Room not created");
      }
      const room = res.data.success.room;
      setRoomSlugCreated(room.slug);
    } catch (err) {
      console.log("Error creating room", err)
    }
  };
  
  useEffect(() => {
    if (showTutorial && data?.my_plugins?.length > 0) {
      setRunTutorial(true);
    }
  }, [showTutorial, data]);


  useEffect(() => {
    if (user?.id) doFetchUrl("/be/api/myplugins/"+user.id);
  }, [user]);

  const tutorialSteps = [
    { target: ".download-btn", content: "Download your game definition JSON files to further develop your plugin.", disableBeacon: true},
    { target: ".edit-btn", content: "Upload your edited game definition or card database here. You can also update your plugin's privacy setting (starts as private)." },
    { target: ".share-btn", content: "If your plugin is private, you can share it with other users by entering their usernames here. It will appear to them under the 'Private Plugin' tab on the home page." },
    { target: ".delete-btn", content: "Delete the plugin permanently." },
    { target: ".play-btn", content: "Create a private room with this plugin. You can also create a room from the home page." },

  ];

  const handleUploadClick = () => {
    setSelectedPlugin(null);
    setShowEditModal(true);
  };
  const handleLayoutGeneratorClick = () => history.push("/layout-generator");
  const handlePluginBuilderClick = () => history.push("/plugin-builder");

  const handleJoyrideCallback = (data) => {
    console.log("Joyride callback", data);
  };

  if (!user) return null;

  if (roomSlugCreated != null) {
    return <Redirect push to={`/room/${roomSlugCreated}`} />;
  }

  return (
    <div className="mt-4 mx-auto w-full max-w-[600px] p-2 overflow-y-auto">
      <Joyride
        steps={tutorialSteps}
        run={runTutorial}
        continuous
        scrollToFirstStep
        showSkipButton
        showProgress
        callback={handleJoyrideCallback}
        styles={{ options: { zIndex: 10000 } }}
        scrollOffset={300} 
      />

      <div className="flex justify-between gap-2 mb-4">
        <LobbyButton className="flex-1 aspect-square p-4 flex flex-col items-center justify-center" onClick={handlePluginBuilderClick}>
          <FontAwesomeIcon icon={faWrench} className="text-xl mb-1" />
          <span className="text-xs text-center">Builder</span>
        </LobbyButton>
        <LobbyButton className="flex-1 aspect-square p-4 flex flex-col items-center justify-center" onClick={handleUploadClick}>
          <FontAwesomeIcon icon={faUpload} className="text-xl mb-1" />
          <span className="text-xs text-center">Upload</span>
        </LobbyButton>
        <LobbyButton className="flex-1 aspect-square p-4 flex flex-col items-center justify-center" onClick={handleLayoutGeneratorClick}>
          <FontAwesomeIcon icon={faThLarge} className="text-xl mb-1" />
          <span className="text-xs text-center">Layout</span>
        </LobbyButton>
      </div>

      {data?.my_plugins.map((plugin, index) => (
        <MyPluginEntry
          key={index}
          plugin={plugin}
          setSelectedPlugin={setSelectedPlugin}
          setShowEditModal={setShowEditModal}
          setShowShareModal={setShowShareModal}
          doFetchHash={doFetchHash}
          index={index}
          createRoom={createRoom}
        />
      ))}

      {showEditModal && (
        <EditPluginModal
          plugin={selectedPlugin}
          closeModal={() => {
            setShowEditModal(false);
            setSelectedPlugin(null);
          }}
          doFetchHash={doFetchHash}
        />
      )}

      {showShareModal && (
        <SharePluginModal
          plugin={selectedPlugin}
          closeModal={() => {
            setShowShareModal(false);
            setSelectedPlugin(null);
          }}
        />
      )}
    </div>
  );
};

export default MyPlugins;

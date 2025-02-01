import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import CreateRoomModal from "./CreateRoomModal";
import LobbyTable from "./LobbyTable";
import useDataApi from "../../hooks/useDataApi";
import useProfile from "../../hooks/useProfile";
import useIsLoggedIn from "../../hooks/useIsLoggedIn";
import { Announcements } from "./Announcements";
import { LobbyButton } from "../../components/basic/LobbyButton";
import LobbyContainer from "./LobbyContainer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { set } from "date-fns";
import axios from "axios";


export const PluginLobby = () => {
  const isLoggedIn = useIsLoggedIn();
  const user = useProfile();
  const history = useHistory();
  const [plugin, setPlugin] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [replayUuid, setReplayUuid] = useState(null);
  const [externalData, setExternalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ringsDbInfo, setRingsDbInfo] = useState([null,null,null,null]);

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



    //   if (url.includes("ringsdb") || url.includes("test")) {
    //     var splitUrl = url.split( '/' );
    //     const newroomIndex = splitUrl.findIndex((e) => e === "newroom")
    //     const ringsDbDomain = splitUrl[newroomIndex + 1]
    //     const newRingsDbInfo = [null, null, null, null];
    //     var deckIndex = 0;
    //     for (var i = newroomIndex + 2; i<splitUrl.length-1; i += 2 ) {
    //       const ringsDbType = splitUrl[i];
    //       const ringsDbId = splitUrl[i+1];
    //       newRingsDbInfo[deckIndex] = {id: ringsDbId, type: ringsDbType, domain: ringsDbDomain};
    //       deckIndex = deckIndex + 1;
    //     }
    //     setRingsDbInfo(newRingsDbInfo);
    //   }
    //   if (url.includes("replay")) {
    //     var splitUrl = url.split( '/' );
    //     const newroomIndex = splitUrl.findIndex((e) => e === "newroom")
    //   }
    //   setShowModal("createRoom");
    // }

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
    <LobbyContainer>

      <div className="flex items-center text-white text-xl">
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


      <div className="flex justify-center w-full" style={{maxWidth: "600px"}}>
        <div className="w-full h-24 py-2 text-3xl">
          <LobbyButton disabled={!plugin?.tutorial_url} onClick={() => window.open(plugin?.tutorial_url, '_blank')}>
            Tutorial
          </LobbyButton>
        </div>
      </div>
      
      <div className="flex justify-center w-full" style={{maxWidth: "600px"}}>
        <div className="w-full h-24 py-2 text-3xl">
          <LobbyButton onClick={() => handleCreateRoomClick()}>
            {isLoggedIn ? "Create Room" : "Log in to create a room"}
          </LobbyButton>
        </div>
      </div>
      
      <Announcements plugin={plugin}/>
      
      <div className="mb-6 w-full">
        <div className="mb-4 w-full">
          <LobbyTable plugin={plugin}/>
        </div>
      </div>

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



// import React, { useEffect, useState } from "react";
// import { useHistory } from "react-router-dom";
// import CreateRoomModal from "./CreateRoomModal";
// import LobbyTable from "./LobbyTable";
// import useProfile from "../../hooks/useProfile";
// import useIsLoggedIn from "../../hooks/useIsLoggedIn";
// import { Announcements } from "./Announcements";
// import { LobbyButton } from "../../components/basic/LobbyButton";
// import useDataApi from "../../hooks/useDataApi";
// import axios from "axios";

// export const PluginLobby = () => {
//   const isLoggedIn = useIsLoggedIn();
//   const myUser = useProfile();
//   const history = useHistory();
//   const [showModal, setShowModal] = useState(null);
//   const [plugin, setPlugin] = useState(null);

//   const url = window.location.href;
//   var splitUrl = url.split( '/' );
//   const pluginIndex = splitUrl.findIndex((e) => e === "plugin")
//   const pluginStr = splitUrl[pluginIndex + 1];
//   const pluginId = parseInt(pluginStr);

//   const apiPlugins = useDataApi(
//     "/be/api/plugin/" + pluginId,
//     null
//   );

//   // useEffect(() => {
//   //   console.log("apiPlugin", apiPlugins);
//   //   if (apiPlugins) {
//   //     setPlugin(apiPlugins);
//   //   }
//   // }, [apiPlugins]);

//   const plugins = apiPlugins?.data?.data ? apiPlugins.data.data : null;
//   console.log("pluginslist 1",plugins);

//   if (!apiPlugins) return (
//     <div></div>
//   );
//   else {
//     console.log("plugin", plugin);
//   }

    
//   //   if (url.includes("newroom")) {
//   //     if (url.includes("ringsdb") || url.includes("test")) {
//   //       var splitUrl = url.split( '/' );
//   //       const newroomIndex = splitUrl.findIndex((e) => e === "newroom")
//   //       const ringsDbDomain = splitUrl[newroomIndex + 1]
//   //       const newRingsDbInfo = [null, null, null, null];
//   //       var deckIndex = 0;
//   //       for (var i = newroomIndex + 2; i<splitUrl.length-1; i += 2 ) {
//   //         const ringsDbType = splitUrl[i];
//   //         const ringsDbId = splitUrl[i+1];
//   //         newRingsDbInfo[deckIndex] = {id: ringsDbId, type: ringsDbType, domain: ringsDbDomain};
//   //         deckIndex = deckIndex + 1;
//   //       }
//   //       setRingsDbInfo(newRingsDbInfo);
//   //     }
//   //     if (url.includes("replay")) {
//   //       var splitUrl = url.split( '/' );
//   //       const newroomIndex = splitUrl.findIndex((e) => e === "newroom")
//   //       setReplayId(splitUrl[newroomIndex + 2]);
//   //     }
//   //     setShowModal("createRoom");
//   //   }
//   // }, []);

//   const handleCreateRoomClick = () => {
//     if (isLoggedIn) {
//       if (myUser?.email_confirmed_at) setShowModal("createRoom");
//       else alert("You must confirm your email before you can start a game.")
//     } else {
//       history.push("/login")
//     }
//   }

//   return (
//     <>
//       <div className="text-white text-xl">
//         {plugin.plugin_name}
//       </div>
//       <div className="flex justify-center w-full" style={{maxWidth: "600px"}}>
//         <div className="w-full h-24 py-2 text-3xl">
//           <LobbyButton disabled={!plugin?.tutorialUrl} onClick={() => window.open(plugin?.tutorialUrl, '_blank')}>
//             Tutorial
//           </LobbyButton>
//         </div>
//       </div>
      
//       <div className="flex justify-center w-full" style={{maxWidth: "600px"}}>
//         <div className="w-full h-24 py-2 text-3xl">
//           <LobbyButton onClick={() => handleCreateRoomClick()}>
//             {isLoggedIn ? "Create Room" : "Log in to create a room"}
//           </LobbyButton>
//         </div>
//       </div>
      
//       <Announcements plugin={plugin}/>
      
//       <div className="mb-6 w-full">
//         <div className="mb-4 w-full">
//           <LobbyTable plugin={plugin}/>
//         </div>
//       </div>

//       <CreateRoomModal
//         isOpen={showModal === "createRoom"}
//         isLoggedIn={isLoggedIn}
//         closeModal={() => setShowModal(null)}
//         plugin={plugin}
//       />
//     </>
//   );
// };

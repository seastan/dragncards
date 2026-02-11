import React, { useState, useEffect } from "react";
import useDataApi from "../../hooks/useDataApi";
import { PluginsTable } from "./PluginsTable";
import LobbyContainer from "./LobbyContainer";
import useProfile from "../../hooks/useProfile";
import { WhatsNewModal, WHATS_NEW_VERSION } from "./WhatsNewModal";

export const Lobby = () => {
  const user = useProfile();
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    if (user?.id && (user.whats_new_dismissed || 0) < WHATS_NEW_VERSION) {
      setShowWhatsNew(true);
    }
  }, [user?.id]);
  const [replayId, setReplayId] = useState("");
  const [ringsDbInfo, setRingsDbInfo] = useState([null,null,null,null]);
  const [pluginsType, setPluginsType] = useState("public");
  const apiPlugins = useDataApi(
    "/be/api/plugins/visible/" + (user?.id ? user.id : 0),
    null
  );

  // If user.id changes, reset plugins list
  useEffect(() => {
    if (user?.id) apiPlugins.doFetchUrl("/be/api/plugins/visible/" + user.id);
  }, [user]);

  console.log("Rendering Lobby", ringsDbInfo)
  // useEffect(() => {
  //   const url = window.location.href;
  //   if (url.includes("newroom")) {
  //     if (url.includes("ringsdb") || url.includes("test")) {
  //       var splitUrl = url.split( '/' );
  //       const newroomIndex = splitUrl.findIndex((e) => e === "newroom")
  //       const ringsDbDomain = splitUrl[newroomIndex + 1]
  //       const newRingsDbInfo = [null, null, null, null];
  //       var deckIndex = 0;
  //       for (var i = newroomIndex + 2; i<splitUrl.length-1; i += 2 ) {
  //         const ringsDbType = splitUrl[i];
  //         const ringsDbId = splitUrl[i+1];
  //         newRingsDbInfo[deckIndex] = {id: ringsDbId, type: ringsDbType, domain: ringsDbDomain};
  //         deckIndex = deckIndex + 1;
  //       }
  //       setRingsDbInfo(newRingsDbInfo);
  //     }
  //     if (url.includes("replay")) {
  //       var splitUrl = url.split( '/' );
  //       const newroomIndex = splitUrl.findIndex((e) => e === "newroom")
  //       setReplayId(splitUrl[newroomIndex + 2]);
  //     }
  //     setShowModal("createRoom");
  //   }
  // }, []);

  const allPlugins = apiPlugins?.data?.data ? apiPlugins.data.data : null;
  const publicPlugins = allPlugins?.filter((plugin) => plugin.public);
  const privatePlugins = allPlugins?.filter((plugin) => !plugin.public);

  // Helper function to toggle pluginsType
  const togglePluginsType = (newType) => {
    setPluginsType(newType);
  };

  return (
    <LobbyContainer>
      <WhatsNewModal isOpen={showWhatsNew} closeModal={() => setShowWhatsNew(false)} user={user} />
      <div className="w-full" style={{minHeight: "600px"}}>
        {/* <div className="bg-red-600-30 p-4 rounded-lg mb-4 text-white text-sm">A recent DragnCards update has impacted the performance of some plugins</div> */}
        <div className="text-center text-white text-2xl mb-2">
          {/* Adding the style and onClick event */}
          <span 
            className="mx-4 p-2 rounded-lg hover:bg-gray-600-30 cursor-pointer"
            onClick={() => togglePluginsType("public")}
          >
            <span style={{ 
              borderBottom: pluginsType === "public" ? "3px solid rgba(153, 27, 27, 0.7)" : "none"
            }}>
            Public Plugins
            </span>
          </span>
          <span 
            className="mx-4 p-2 rounded-lg hover:bg-gray-600-30 cursor-pointer"
            onClick={() => togglePluginsType("private")}
          >
            <span style={{ 
              borderBottom: pluginsType === "private" ? "3px solid rgba(153, 27, 27, 0.7)" : "none"
            }}>
            Private Plugins
            </span>
          </span>
        </div>
        {pluginsType === "public" && <PluginsTable plugins={publicPlugins}/>}
        {pluginsType === "private" && <PluginsTable plugins={privatePlugins}/>}
      </div>
    </LobbyContainer>
  );
};
export default Lobby;

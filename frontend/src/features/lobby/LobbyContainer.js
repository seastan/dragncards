import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import CreateRoomModal from "./CreateRoomModal";
import LobbyTable from "./LobbyTable";
import useDataApi from "../../hooks/useDataApi";
import useProfile from "../../hooks/useProfile";
import useIsLoggedIn from "../../hooks/useIsLoggedIn";
import { Announcements } from "./Announcements";
import { PluginsTable } from "./PluginsTable";
import { PatreonModal } from "../store/support/PatreonModal";
import { LobbyButton } from "../../components/basic/LobbyButton";
import { TermsOfServiceModal } from "./TermsOfServiceModal";
import { PluginLobby } from "./PluginLobby";
import { Footer } from "./Footer";

export const LobbyContainer = ({ children, maxWidth = "600px" }) => {
  const isLoggedIn = useIsLoggedIn();
  const [showModal, setShowModal] = useState(null);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [replayId, setReplayId] = useState("");
  const [ringsDbInfo, setRingsDbInfo] = useState([null,null,null,null]);
  const [loadShuffle, setLoadShuffle] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const apiPlugins = useDataApi(
    "/be/api/plugins",
    null
  );
  console.log("Rendering Lobby", ringsDbInfo)
  useEffect(() => {
    const url = window.location.href;
    if (url.includes("newroom")) {
      if (url.includes("ringsdb") || url.includes("test")) {
        var splitUrl = url.split( '/' );
        const newroomIndex = splitUrl.findIndex((e) => e === "newroom")
        const ringsDbDomain = splitUrl[newroomIndex + 1]
        const newRingsDbInfo = [null, null, null, null];
        var deckIndex = 0;
        for (var i = newroomIndex + 2; i<splitUrl.length-1; i += 2 ) {
          const ringsDbType = splitUrl[i];
          const ringsDbId = splitUrl[i+1];
          newRingsDbInfo[deckIndex] = {id: ringsDbId, type: ringsDbType, domain: ringsDbDomain};
          deckIndex = deckIndex + 1;
        }
        setRingsDbInfo(newRingsDbInfo);
      }
      if (url.includes("replay")) {
        var splitUrl = url.split( '/' );
        const newroomIndex = splitUrl.findIndex((e) => e === "newroom")
        setReplayId(splitUrl[newroomIndex + 2]);
      }
      setShowModal("createRoom");
    }
  }, []);

  const plugins = apiPlugins?.data?.data ? apiPlugins.data.data : null;
  console.log("pluginslist",plugins);

  return (
      <div 
        className="w-full overflow-y-scroll overflow-x-hidden" 
        style={{fontFamily:"Roboto", height: "97dvh", 
        // background: `url(${process.env.PUBLIC_URL + '/images/other/background.jpg'}) no-repeat center center fixed`,
        background: `url("https://dragncards-shared.s3.amazonaws.com/backgrounds/Sharable_Tristan_Delgado_A_Wizards_Ire.jpg") no-repeat center center fixed`,
        backgroundSize: 'cover',
        WebkitBackgroundSize: 'cover',
        MozBackgroundSize: 'cover',
        OBackgroundSize: 'cover',
        backgroundColor: `rgba(50,50,50,0.95)`,
        backgroundBlendMode: 'overlay'
      }}>
        <div className="mt-4 mx-auto w-full p-2" style={{maxWidth: "600px"}}>
          <div style={{height: "200px"}}>
            <div className="w-1/2 h-full float-left">
              <div className="w-full h-full flex items-center justify-center">
                <img 
                  className="" 
                  style={{height: "200px"}} 
                  src={process.env.PUBLIC_URL + '/logosvg.svg'}/>
              </div>
            </div>
            <div className="w-1/2 h-full float-right">
              <div className="w-full h-1/3 p-2">
                <LobbyButton onClick={() => setShowModal("patreon")}>
                  Patreon
                </LobbyButton>
              </div>
              <div className="w-full h-1/3 p-2">
                <LobbyButton onClick={() => window.open('https://discord.gg/7BQv5ethUm', '_blank')}>
                  Discord
                </LobbyButton>
              </div>
              <div className="w-full h-1/3 p-2">
                <LobbyButton onClick={() => window.open('https://github.com/seastan/DragnCards', '_blank')}>
                  GitHub
                </LobbyButton>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full p-2" style={{maxWidth}}>
            {children}
        </div>

        <Footer setShowTermsOfService={setShowTermsOfService}/>

        <TermsOfServiceModal
          isOpen={showTermsOfService}
          closeModal={() => setShowTermsOfService(false)}
        />
        
        <PatreonModal
          isOpen={showModal === "patreon"}
          isLoggedIn={isLoggedIn}
          closeModal={() => setShowModal(null)}
        />
      </div>
  );
};
export default LobbyContainer;

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import RoomGame from "./RoomGame";
import useProfile from "../../hooks/useProfile";
import { setObservingPlayerN, setPlayerN, setUserSettings } from "../store/playerUiSlice";
import BroadcastContext from "../../contexts/BroadcastContext";
import { usePlugin } from "./hooks/usePlugin";
import { useGameDefinition } from "./hooks/useGameDefinition";



const getPlayerN = (playerInfo, id) => {
  if (!playerInfo) return null;
  if (!id || id <= 0) return null;
  var playerN = null;
  Object.keys(playerInfo).forEach(playerI => {
    if (playerInfo[playerI]?.id === id) playerN = playerI;
  })
  return playerN;
}

export const RoomProviders = ({ gameBroadcast, chatBroadcast }) => {
  console.log("Rendering RoomProviders");
  const dispatch = useDispatch();
  const playerInfo = useSelector(state => state?.gameUi?.playerInfo);
  const userSettings = useSelector(state => state?.playerUi?.userSettings);
  const myUser = useProfile();
  const playerN = getPlayerN(playerInfo, myUser?.id);
  const gameDef = useGameDefinition();
  const pluginId = usePlugin()?.id;
  const [playerNSet, setPlayerNSet] = useState(true);

  useEffect(() => {
    dispatch(setPlayerN(playerN));
    if (playerN) dispatch(setObservingPlayerN(playerN)); // For a spectator (where playerN is null), leave as the default value
    setPlayerNSet(true);

  }, [playerN, myUser])

  useEffect(() => {

    const databaseUiSettings = myUser?.plugin_settings?.[pluginId]?.ui;
    if (databaseUiSettings) {
      console.log("Setting user settings from database", userSettings, databaseUiSettings)
      const mergedSettings = {...userSettings, ...databaseUiSettings};
      dispatch(setUserSettings(mergedSettings));
    }
  }, [])

  const gameBackgroundUrl = gameDef?.backgroundUrl;
  const playerUiBackgroundUrl = useSelector(state => state?.playerUi?.userSettings?.backgroundUrl);
  //const userBackgroundUrl = myUser?.plugin_settings?.[pluginId]?.ui?.backgroundUrl;

  var backgroundUrl = null;
  if (playerUiBackgroundUrl && playerUiBackgroundUrl !== "") backgroundUrl = playerUiBackgroundUrl;
  //else if (userBackgroundUrl && userBackgroundUrl !== "") backgroundUrl = userBackgroundUrl;
  else backgroundUrl = gameBackgroundUrl;

  console.log("Rendering RoomProviders h");

  return (
    
      <div 
        key={backgroundUrl}
        className="background"
        style={{
          height: "97dvh",
          background: backgroundUrl ? `url(${backgroundUrl})` : "",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPositionY: "50%",
        }}>
        <BroadcastContext.Provider value={{gameBroadcast, chatBroadcast}}>
          {playerNSet && <RoomGame/>}
        </BroadcastContext.Provider>
      </div>
  );
};
export default RoomProviders;

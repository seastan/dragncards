import React, { useEffect, useRef } from "react";
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
  const currentPlayerN = useSelector(state => state?.playerUi?.playerN);
  const myUser = useProfile();
  const playerN = getPlayerN(playerInfo, myUser?.id);
  const gameDef = useGameDefinition();
  const pluginId = usePlugin()?.id;
  const roomSlug = useSelector(state => state?.gameUi?.roomSlug);
  const playerNSet = playerInfo !== undefined && currentPlayerN === playerN;
  // Gate the first mount on playerN being in sync (so nothing runs against a
  // stale seat during initialization), but latch it afterwards: a later seat
  // change makes currentPlayerN briefly stale, and unmounting RoomGame for that
  // one render tore down and rebuilt the entire table - black flash, every
  // mount-time effect re-run, shuffle animations replayed. The latch is scoped
  // to the room so entering a different room gates again.
  const mountedForSlugRef = useRef(null);
  if (playerNSet) mountedForSlugRef.current = roomSlug;
  const showRoomGame = playerNSet || (mountedForSlugRef.current != null && mountedForSlugRef.current === roomSlug);

  useEffect(() => {
    dispatch(setPlayerN(playerN));
    if (playerN) dispatch(setObservingPlayerN(playerN)); // For a spectator (where playerN is null), leave as the default value

  }, [dispatch, playerN])

  useEffect(() => {
    const databaseUiSettings = myUser?.plugin_settings?.[pluginId]?.ui;
    if (databaseUiSettings) {
      console.log("Setting user settings from database", userSettings, databaseUiSettings)
      const mergedSettings = {...userSettings, ...databaseUiSettings};
      dispatch(setUserSettings(mergedSettings));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUser?.id, pluginId])

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
          {showRoomGame && <RoomGame/>}
        </BroadcastContext.Provider>
      </div>
  );
};
export default RoomProviders;

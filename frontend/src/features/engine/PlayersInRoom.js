import React, { useContext } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { faEye, faLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Draggable from 'react-draggable';
import UserName from "../user/UserName";
import { setShowPlayersInRoom } from "../store/playerUiSlice";
import { MessageBoxButton } from "../messages/MessageBoxButton";
import { useIsHost } from "./hooks/useIsHost";
import BroadcastContext from "../../contexts/BroadcastContext";

const windowClass = "insert-auto overflow-auto bg-gray-700 border max-w-lg rounded-lg outline-none text-white";
const windowStyle = {
  position:"absolute",
  zIndex: 1e7,
  right: "30px",
  top: "200px",
  width:"300px",
  opacity: "50%",
}
const col1Class = "w-1/ 3";
const col2Class = "w-2/3";

export const PlayersInRoom = React.memo(({}) => {
  const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
  const isHost = useIsHost();
  const sockets = useSelector(state => state?.gameUi?.sockets);
  const spectators = useSelector(state => state?.gameUi?.spectators);
  const handleSpectatorClick = (user_id, value) => {
    gameBroadcast("set_spectator", {user_id: user_id, value: value});
  }
  // Sort sockets so that those with is_logged_in are first
  const sortedSocketKeys = Object.keys(sockets).sort((a, b) => {
    if (sockets[a]["is_logged_in"] === sockets[b]["is_logged_in"]) return 0;
    if (sockets[a]["is_logged_in"]) return -1;
    return 1;
  })
  const sortedSockets = {};
  sortedSocketKeys.forEach(key => {
    sortedSockets[key] = sockets[key];
  })
  console.log("Rendering PlayersInRoom", sortedSockets, spectators);
  return(
    Object.keys(sortedSockets).map((pid, index) => {
      const socket = sortedSockets[pid];
      const isLoggedIn = socket["is_logged_in"];
      if (!isLoggedIn) return null;
      const showSpectatorButton = isHost && isLoggedIn;
      const isSpectator = spectators?.[socket['user_id']] === true;
      const backgroundColor = index % 2 === 0 ? "bg-gray-800" : "bg-gray-900";
      return(
        <div key={index} className={`flex items-center text-white ${backgroundColor}`}>
          {showSpectatorButton &&
            <MessageBoxButton
              selected={isSpectator}
              clickCallback={() => handleSpectatorClick(socket['user_id'], !isSpectator)}
              icon={faEye}
            />
          }
          <div className="pl-1">{socket["alias"]}</div>
        </div>
      )
    })
  )
})

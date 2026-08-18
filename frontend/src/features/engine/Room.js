import React, { useCallback, useState, useEffect, useRef, useContext } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from "react-router-dom";
import SocketContext from "../../contexts/SocketContext";
import RoomProviders from "./RoomProviders";
import {useSetMessages} from '../../contexts/MessagesContext';
import useChannel from "../../hooks/useChannel";
import { applyDeltaRedo, appendDelta, setGameUi, setPlayerInfo, setSockets, setDeltas, setSpectators } from "../store/gameUiSlice";
import useProfile from "../../hooks/useProfile";
import { resetPlayerUi, setAlert, setPluginRepoUpdateGameDef, setReplayStep, setPlayerUiValues, overridePlayerUiValues, setRoomNotFound } from "../store/playerUiSlice";
import { PluginProvider } from "../../contexts/PluginContext";
import store from "../../store";
import { mergeObjects } from "../myplugins/uploadPluginFunctions";
import { getGameDefSchema } from "../myplugins/validate/getGameDefSchema";
import { useSendLocalMessage } from "./hooks/useSendLocalMessage";
import { validateSchema } from "../myplugins/validate/validateGameDef";
import { useIsPluginAuthor } from "./hooks/isPluginAuthor";
import { usePlayerN } from "./hooks/usePlayerN";

export const Room = ({ slug }) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const roomSlug = useSelector(state => state.gameUi.roomSlug);
  const setMessages = useSetMessages();
  const myUser = useProfile();
  const playerN = usePlayerN();
  const sendLocalMessage = useSendLocalMessage();
  const [outOfSync, setOutOfSync] = useState(false);
  const roomNotFound = useSelector(state => state.playerUi.roomNotFound);
  const myUserId = myUser?.id;
  const isPluginAuthor = useIsPluginAuthor();
  //const plugin = usePlugin();

  const socket = useContext(SocketContext);
  const [joinRetryKey, setJoinRetryKey] = useState(0);
  // Tracks which room slug we've already retried for, so we only retry once per room.
  const retriedForSlugRef = useRef(null);

  // Which failure we are showing: "auth_failed" (our session died) or
  // "missing_server_state" (the backend really has no such room).
  const [unavailableReason, setUnavailableReason] = useState(null);

  // Entering a room clears any failure left over from the previous one.
  // roomNotFound lives in the redux store and is otherwise only reset by the
  // two buttons on the modal below, so leaving a dead room any other way (back
  // button, logo, a pasted URL) used to carry the modal into the next room.
  // This runs before useChannel's join effect - hooks fire in declaration
  // order - so it can never clear a flag the current room just set.
  useEffect(() => {
    retriedForSlugRef.current = null;
    setUnavailableReason(null);
    dispatch(setRoomNotFound(false));
  }, [slug, dispatch]);

  // The app's socket is long-lived and can stay pinned to a backend instance that
  // no longer knows about this room (e.g. it was created on a different instance
  // during a blue-green deploy). Before declaring the room truly unreachable, force
  // a fresh socket connection - which nginx will route to the current backend - and
  // retry the join once.
  const handleRoomUnavailable = useCallback((reason) => {
    setUnavailableReason(reason || null);
    if (socket != null && retriedForSlugRef.current !== slug) {
      retriedForSlugRef.current = slug;
      socket.disconnect(() => {
        socket.connect();
        setJoinRetryKey((k) => k + 1);
      });
    } else {
      dispatch(setRoomNotFound(true));
    }
  }, [socket, slug, dispatch]);

  const onChannelMessage = useCallback((event, payload) => {
    console.log("onChannelMessage: Got new payload: ", event, payload);
    if (event === "state_update" && payload.delta !== null) {
      // Update store with my own delta
      const newDelta = payload.delta;
      const playerUiReplayStep = store.getState().playerUi.replayStep;
      const oldReplayStep = payload.oldReplayStep;
      const newReplayStep = payload.newReplayStep;
      //const gameUi = store.getState().gameUi;
      console.log("onChannelMessage playerUiReplayStep", playerUiReplayStep, "oldReplayStep", oldReplayStep, "newReplayStep", newReplayStep, newDelta)
      if (oldReplayStep === playerUiReplayStep) {
        dispatch(applyDeltaRedo(newDelta));
        dispatch(setReplayStep(newReplayStep));
        const numDeltas = store.getState().gameUi.deltas.length;
        if (newReplayStep === numDeltas) {
          dispatch(appendDelta(newDelta));
        } else if (newReplayStep < numDeltas) {
          const deltas = store.getState().gameUi.deltas;
          const newDeltas = deltas.slice(0, newReplayStep);
          newDeltas.push(newDelta);
          dispatch(setDeltas(newDeltas));
        }
      } else {
        setOutOfSync(true);
      }
    } else if (event === "go_to_replay_step") {
      const newDelta = payload.delta;
      const playerUiReplayStep = store.getState().playerUi.replayStep;
      const oldReplayStep = payload.oldReplayStep;
      const newReplayStep = payload.newReplayStep;
      if (oldReplayStep === playerUiReplayStep) {
        dispatch(applyDeltaRedo(newDelta));
        dispatch(setReplayStep(newReplayStep));
      } else {
        setOutOfSync(true);
      }
    } else if (event === "current_state" && payload !== null) {
      const game_ui = payload;
      if (roomSlug !== game_ui.roomSlug) { // Entered a new room
        // Reset player UI
        dispatch(resetPlayerUi())
      }
      // Simulate high ping/lag;
      //delayBroadcast = setTimeout(function() {
      console.log("onChannelMessage: dispatching to game", game_ui)
      dispatch(setGameUi(game_ui));
      
      //setMessages(game_ui.logMessages);
      dispatch(setReplayStep(game_ui.replayStep));

      // // If the active card's group has changed due to a hotkey, reset the active card id
      // const state = store.getState();
      // const activeCardId = state?.playerUi?.activeCardId;
      // const preHotkeyActiveCardGroupId = state?.playerUi?.preHotkeyActiveCardGroupId;
      // const activeCardGroupId = state?.gameUi?.game?.cardById[activeCardId]?.groupId;
      // if (preHotkeyActiveCardGroupId !== null && preHotkeyActiveCardGroupId !== activeCardGroupId) {
      //   dispatch(setActiveCardId(null));
      //   dispatch(setPreHotkeyActiveCardGroupId(null));
      // }
    } else if (event === "send_alert" && payload !== null) {
      dispatch(setAlert({
        ...payload,
        timestamp: Date.now()
      }));
    } else if (event === "spectators_changed" && payload !== null) {
      dispatch(setSpectators(payload));
    } else if (event === "seats_changed" && payload !== null) {
      dispatch(setPlayerInfo(payload));
    } else if (event === "users_changed" && payload !== null) {
      dispatch(setSockets(payload));
    } else if (event === "unable_to_get_state_on_join" || event === "room_unavailable") {
      handleRoomUnavailable(payload?.reason);
    } else if (event === "bad_game_state" && payload !== null) {
      const errors = payload.errors;
      console.error("Bad game state received:", errors);
      dispatch(setAlert({
        level: "error",
        text: "Game state is out of sync. Resynchronizing...",
        timestamp: Date.now()
      }));
      setOutOfSync(true);
    } else if (event === "unable_to_get_state_on_request") {
      handleRoomUnavailable(payload?.reason);
    } else if (event === "phx_error") {
      dispatch(setAlert({
        level: "crash",
        text: "Unknown error. \
          If this issue persists, please go to the Menu and download the game state file. \
          Then, create a new room and upload that file to continue where you left off.",
        timestamp: Date.now()
      }));
      //setRoomClosed(true);
    } else if (event === "plugin_repo_update" && payload !== null) {
      const parsedFiles = payload.files;
      var mergedJSONs;
      try {
        mergedJSONs = mergeObjects(parsedFiles);
        console.log("mergedJSONs", mergedJSONs)
  
        const errors = []
        validateSchema(mergedJSONs, "gameDef", mergedJSONs, getGameDefSchema(mergedJSONs), errors);
        
        if (errors.length === 0) {
          sendLocalMessage(`Detected plugin repository update with valid JSON files. Press Ctrl+Shift+L to update the plugin and start a new game.`, "info", false);
          dispatch(setPluginRepoUpdateGameDef(mergedJSONs));

        } else {
          sendLocalMessage(`Invalid JSON file(s): ${errors.join("\n\n")}`, "crash", false);
        }
      } catch (error) {
        sendLocalMessage(`Invalid JSON file(s): ${error.message}`, "crash", false);
      }
    } else if (event === "gui_update" && payload !== null) {
      // Handle GUI updates sent specifically to this player
      if (playerN != null && playerN != undefined && playerN == payload.targetPlayerN) {
        dispatch(overridePlayerUiValues(payload.updates));
      }
    } else if (event === "gui_update_all" && payload !== null) {
      // Broadcast GUI updates (e.g. shuffle animation) sent to the whole room.
      // Same per-player payload shape as "gui_update"; each client keeps the
      // entry matching its own player.
      if (playerN != null && playerN != undefined && playerN == payload.targetPlayerN) {
        dispatch(overridePlayerUiValues(payload.updates));
      }
    }

  }, [dispatch, history, playerN, roomSlug, sendLocalMessage, handleRoomUnavailable]);

  const onChatMessage = useCallback((event, payload) => {
    if (
      event === "phx_reply" &&
      payload?.response
    ) {      
      console.log("phxmessage new", payload.response)
      const incomingMessage = payload.response.new_message;
      if (!incomingMessage) return;
      console.log("phxmessage", incomingMessage)
      console.log("setmessages3", incomingMessage)
      setMessages([incomingMessage])
    }
  }, []);

  const gameBroadcast = useChannel(`room:${slug}`, onChannelMessage, myUserId, joinRetryKey);
  console.log("gameb render room", gameBroadcast)

  const chatBroadcast = useChannel(`chat:${slug}`, onChatMessage, myUserId, joinRetryKey);

  // If game goes out of sync, send a "request_state" message to the server
  useEffect(() => {
    if (outOfSync) {
      gameBroadcast("request_state", {});
      setOutOfSync(false);
    }
  }, [outOfSync, gameBroadcast]);

  console.log('Rendering Room',{myUserId, roomNotFound, roomSlug, slug});
  // console.log("plugin room",plugin)
  //if (plugin === null) return (<div className="text-white m-4">Loading...</div>);

  // An expired session and a genuinely missing room both surface here, but they
  // need different advice: the room is normally still running in the first case,
  // and pointing the player at saved games sends them the wrong way.
  const sessionExpired = unavailableReason === "auth_failed";
  if (roomNotFound) return (
    <div className="text-white flex flex-col items-center justify-center h-screen p-4">
      <div className="bg-gray-700 rounded-lg p-6 max-w-md text-center">
        <h2 className="text-xl font-bold mb-3">
          {sessionExpired ? "Session expired" : "Room no longer accessible"}
        </h2>
        {sessionExpired ? (
          <p className="text-gray-300 mb-4">
            Your login session expired, so this browser can no longer join the room. Log in again and you can rejoin - the room is still running.
          </p>
        ) : (
          <>
            <p className="text-gray-300 mb-4">
              This room can no longer be reached from this browser session. It may have closed, timed out, or stayed on an older server during a deployment.
            </p>
            <p className="text-gray-300 mb-4">
              If the game was saved, continue from your saved games in your profile.
            </p>
          </>
        )}
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-2"
          onClick={() => { dispatch(setRoomNotFound(false)); history.push(sessionExpired || !myUser ? "/login" : "/profile"); }}
        >
          {sessionExpired || !myUser ? "Log in" : "Go to profile"}
        </button>
        <button
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          onClick={() => { dispatch(setRoomNotFound(false)); history.push("/lobby"); }}
        >
          Go to lobby
        </button>
      </div>
    </div>
  );
  if (roomSlug !== slug) return (<div></div>);
  else {
    return (
      <PluginProvider>
        <RoomProviders 
          gameBroadcast={gameBroadcast} 
          chatBroadcast={chatBroadcast}/>
      </PluginProvider>
    );
  }
};
export default Room;

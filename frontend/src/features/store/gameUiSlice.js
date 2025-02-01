import { createSlice } from "@reduxjs/toolkit";
import { deepUpdate, updateByDelta, updateValues } from "./updateValues";
//const isEqual = require("react-fast-compare");

const initialState = {};

const gameUiSlice = createSlice({
  name: "gameUi",
  initialState,
  reducers: {
    setGameUi: (state, { payload }) => {
      console.log("setting gameui", state, payload)
      if (!state) {
        state = payload;
      } else {
        deepUpdate(state, payload);
      }
      // Object.keys(payload).forEach((key) => {
      //   if (key !== "game") state[key] = payload[key];
      // })
    },
    applyDeltaRedo: (state, { payload }) => {
      console.log("setting gameui delta", state, payload)
      if (!state?.game) {
        return;
      } else {
        console.log("setting gameui delta update", JSON.parse(JSON.stringify(state.game)))
        setGame(updateByDelta(state.game, payload, "redo"));
      }
    },
    applyDeltaUndo: (state, { payload }) => {
      console.log("setting gameui delta", state, payload)
      if (!state?.game) {
        return;
      } else {
        console.log("setting gameui delta update", JSON.parse(JSON.stringify(state.game)))
        setGame(updateByDelta(state.game, payload), "undo");
      }
    },
    setGame: (state, { payload }) => {
      if (!state.game) {
        state.game = payload;
      } else {
        deepUpdate(state.game, payload);
      }
    },
    setRoomSlug: (state, { payload }) => {
      state.roomSlug = payload;
    },
    setPlayerInfo: (state, { payload }) => {
      state.playerInfo = payload;
    },
    setSockets: (state, { payload }) => {
      state.sockets = payload;
    },
    setSpectators: (state, { payload }) => {
      state.spectators = payload;
    },
    setGroupById: (state, { payload }) => {
      state.game.groupById = payload;
    },
    setStackIds: (state, { payload }) => {
      state.game.groupById[payload.id].stackIds = payload.stackIds;
    },
    setCardIds: (state, { payload }) => {
      state.game.stackById[payload.id].cardIds = payload.cardIds;
    },
    setValues: (state, { payload }) => {
      console.log("setValues", JSON.parse(JSON.stringify(state)), payload)
      updateValues(state, payload.updates);
    },
    setReplayStep: (state, { payload }) => {
      state.replayStep = payload;
    },
    setDeltas: (state, { payload }) => {
      state.deltas = payload;
    },
    appendDelta: (state, { payload }) => {
      state.deltas.push(payload);
    },
    setPromptVisible: (state, { payload }) => {
      const { playerI, promptUuid, visible } = payload;
      
      // Ensure playerData and prompts exist
      if (!state?.game?.playerData?.[playerI]?.prompts?.[promptUuid]) {
        return;
      }
      state.game.playerData[playerI].prompts[promptUuid].visible = visible;
    }
  }
});

export const { setGameUi, applyDeltaRedo, applyDeltaUndo, setGame, setRoomSlug, setPlayerInfo, setSockets, setSpectators, setGroupById, setStackIds, setCardIds, setValues, setDeltas, appendDelta, setPromptVisible } = gameUiSlice.actions;
export default gameUiSlice.reducer;

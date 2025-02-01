import { combineReducers } from "@reduxjs/toolkit";
import users from "./features/user/usersSlice";
import gameUi from "./features/store/gameUiSlice";
import playerUi from "./features/store/playerUiSlice"

const rootReducer = combineReducers({
  users, gameUi, playerUi
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;

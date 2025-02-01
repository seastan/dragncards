import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import getUser from "../../api/getUser";
import { AppThunk } from "../../store";
import { AuthContextType } from "../../contexts/AuthContext";
import { User } from "elixir-backend";

interface UsersState {
  usersById: Record<number, User>;
}

const initialState: UsersState = {
  usersById: {},
};

interface SetUserPayload {
  userId: number;
  user: User;
}

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUser(state, { payload }: PayloadAction<SetUserPayload>) {
      const { userId, user } = payload;
      state.usersById[userId] = user;
    },
  },
});

export const { setUser } = usersSlice.actions;
export default usersSlice.reducer;

//////////////
/// THUNKS ///
//////////////

export const fetchUser = (
  userId: number,
  authCtx: AuthContextType
): AppThunk => async (dispatch, getState) => {

  try {
    const { users } = getState();
    if (isUserExist(users, userId)) {
      // Already have info for this user, not fetching
      return;
    }
    console.log("userTrace fetchUser 1", userId)
    const user = await getUser(userId, authCtx);
    console.log("userTrace fetchUser 2", user)
    dispatch(setUser({ userId, user }));
  } catch (err) {
    console.log("Error loading user: ", err);
  }
};

const isUserExist = (users: UsersState, userId: number) =>
  users.usersById[userId] != null;

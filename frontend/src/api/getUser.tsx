import apiGet from "./apiGet";
import { AuthContextType } from "../contexts/AuthContext";
import { User } from "elixir-backend";

const getUser = async (userId: number, authCtx: AuthContextType) => {

  const url = "/be/api/v1/profile/" + userId;
  console.log("userTrace getUser 1",url)
  const result = await apiGet(url, authCtx);
  console.log("userTrace getUser 2",url)
  const user: User = result.data.user_profile;
  console.log("userTrace getUser 3", user)
  return user;
};
export default getUser;

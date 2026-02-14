import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchUser } from "./usersSlice";
import useAuth from "../../hooks/useAuth";
import { RootState } from "../../rootReducer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown } from "@fortawesome/free-solid-svg-icons";

export const SupporterBadge: React.FC<{ level: number | null | undefined }> = ({ level }) => {
  return getSupporterBadge(level);
};

const getSupporterBadge = (level: number | null | undefined) => {
  if (!level || level < 3) return null;
  let color: string;
  let title: string;
  if (level >= 10) {
    color = "#FFD700"; // gold
    title = "Gold Supporter";
  } else if (level >= 5) {
    color = "#C0C0C0"; // silver
    title = "Silver Supporter";
  } else {
    color = "#CD7F32"; // bronze
    title = "Bronze Supporter";
  }
  return (
    <FontAwesomeIcon
      icon={faCrown}
      style={{ color, fontSize: "0.75em", marginRight: 3, verticalAlign: "0.0em" }}
      title={title}
    />
  );
};

interface Props {
  userID: number | null;
  defaultName?: String | null;
}

export const UserName: React.FC<Props> = ({ userID, defaultName }) => {
  const dispatch = useDispatch();
  const authContext = useAuth();
  useEffect(() => {
    if (userID == null) {
      return;
    }
    console.log("userTrace UserName 1", userID)
    dispatch(fetchUser(userID, authContext));
    console.log("userTrace UserName 2", userID)
  }, [authContext, dispatch, userID]);

  const user = useSelector(
    (state: RootState) => state.users.usersById[userID || 0]
  );
  console.log("userTrace UserName Render 1", user)

  if (userID === null || userID === undefined) {
    return <span className="text-gray-400">{defaultName ? defaultName : "anonymous"}</span>;
  }
  if (userID < 0) {
    return null;
  }
  if (user != null) {
    const badge = getSupporterBadge(user.supporter_level);
    return <span>{badge}{user.alias}</span>;
  }
  return <div>user #{userID}</div>;
};
export default UserName;

import React from "react";
import { Link } from "react-router-dom";
import cx from "classnames";
import useProfile from "../../hooks/useProfile";
import { IconContext } from "react-icons";
import { GoPerson } from "react-icons/go";
import { SupporterBadge } from "../user/UserName";

interface Props {
  className?: string;
}

export const ProfileLink: React.FC<Props> = ({ className }) => {
  const user = useProfile();
  if (user == null) {
    return null;
  }
  console.log("userTrace ProfileLink", user)
  const { alias } = user;
  const hasBadge = user.supporter_level != null && user.supporter_level >= 3;
  return (
    <Link to="/profile" className={cx(className)}>
      {!hasBadge && (
        <IconContext.Provider value={{ className: "inline-block align-middle" }}>
          <GoPerson />
        </IconContext.Provider>
      )}
      <span className={hasBadge ? "" : "ml-1"}><SupporterBadge level={user.supporter_level} />{alias}</span>
    </Link>
  );
};
export default ProfileLink;

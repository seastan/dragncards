import React from "react";
import { Link } from "react-router-dom";
import cx from "classnames";
import useProfile from "../../hooks/useProfile";
import { IconContext } from "react-icons";
import { GoPerson } from "react-icons/go";

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
  return (
    <Link to="/profile" className={cx(className)}>
      <IconContext.Provider value={{ className: "inline-block align-middle" }}>
        <GoPerson />
      </IconContext.Provider>
      <span className="ml-1">{alias}</span>
    </Link>
  );
};
export default ProfileLink;

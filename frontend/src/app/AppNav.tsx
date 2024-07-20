import React, { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import cx from "classnames";
import useAuth from "../hooks/useAuth";
import ProfileLink from "../features/auth/ProfileLink";
import useWindowDimensions from "../hooks/useWindowDimensions";
import useProfile from "../hooks/useProfile";

interface Props {}

export const AppNav: React.FC<Props> = () => {
  const { authToken, logOut } = useAuth();
  const history = useHistory();
  const user = useProfile();
  //const { height, width } = useWindowDimensions();
  const headerLinkClass =
    "mt-1 sm:mt-0 sm:ml-2 block px-2 py-1 text-white font-light hover:font-normal rounded no-underline";
  // if (height < 500) return null;
  // const aspectRatio = width/height;
  // alert(aspectRatio)
  // if (aspectRatio > 2) return null;
  return (
    <header className="bg-gray-700 flex justify-between items-center px-4" style={{height:"3dvh",fontFamily:"Roboto", fontSize: "2dvh"}}>
      <div className="flex items-center justify-between p-0 h-full">
        <div className="h-full flex text-white justify-center cursor-pointer" onClick={() => history.push("/")}>
            {/*
            <img
              className="h-8 rounded"
              src="https://placekitten.com/650/150"
              alt="Logo "
            />
                */}
            Dragn <img className="mt-0.5 mx-0.5" style={{display:"inline", height: "2dvh"}} src={process.env.PUBLIC_URL + '/logosvg.svg'}/> Cards
        </div>
      </div>
      <div
        className="flex"
      >
        {authToken && (
          <Link to={"/myplugins/"+user?.id} className={headerLinkClass}>
            <span className="ml-1">My Plugins</span>
          </Link>
        )}
        <ProfileLink className={headerLinkClass} />
        {!authToken && (
          <>
            <Link to="/login" className={headerLinkClass}>
              Log In
            </Link>
            <Link to="/signup" className={headerLinkClass}>
              Sign Up
            </Link>
          </>
        )}
        {authToken && (
          <>
            <span
              className={headerLinkClass + " underline cursor-pointer"}
              onClick={() => logOut()}
            >
              Sign out
            </span>
          </>
        )}
      </div>
    </header>
  );
};
export default AppNav;

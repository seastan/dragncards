import React from "react";
import { Link, useHistory } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import ProfileLink from "../features/auth/ProfileLink";
import useProfile from "../hooks/useProfile";

const navLinkClass =
  "px-3 py-1 text-md text-gray-300 font-medium rounded hover:text-white hover:bg-gray-600 no-underline transition-colors duration-150 cursor-pointer";

export const AppNav: React.FC = () => {
  const { authToken, logOut } = useAuth();
  const history = useHistory();
  const user = useProfile();

  return (
    <header
      className="bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 py-1"
      
    >
      {/* Logo */}
      <div
        className="flex items-center text-white font-semibold tracking-wide cursor-pointer select-none"
        style={{ fontSize: "18px" }}
        onClick={() => history.push("/")}
      >
        Dragn
        <img
          className="mx-1"
          style={{ height: "18px" }}
          src={process.env.PUBLIC_URL + "/logosvg.svg"}
          alt="DragnCards logo"
        />
        Cards
      </div>

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        {authToken && user?.admin && (
          <Link to="/admin" className={navLinkClass}>
            Admin
          </Link>
        )}
        {authToken && (
          <Link to={"/myplugins/" + user?.id} className={navLinkClass}>
            My Plugins
          </Link>
        )}
        <ProfileLink className={navLinkClass} />
        {!authToken && (
          <>
            <Link to="/login" className={navLinkClass}>
              Log In
            </Link>
            <Link to="/signup" className={navLinkClass}>
              Sign Up
            </Link>
          </>
        )}
        {authToken && (
          <span className={navLinkClass} onClick={() => logOut()}>
            Sign Out
          </span>
        )}
      </nav>
    </header>
  );
};
export default AppNav;

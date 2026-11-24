import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { Menu, MenuItem } from "../../components/basic/Menu";
import useAuth from "../../hooks/useAuth";
import useProfile from "../../hooks/useProfile";
import { PatreonModal } from "../store/support/PatreonModal";
import { GestureGuideLink } from "./MobileGestureGuide";

// The site navbar (AppNav + ProfileMenu) for the mobile UI, which covers it with
// the full-screen table: at the right end of the ☰ row, the DragnCards logo
// (home) and a profile icon opening the profile menu.
export const MobileSiteMenu = () => {
  const history = useHistory();
  const { authToken, logOut } = useAuth();
  const user = useProfile();
  const [showPatreon, setShowPatreon] = useState(false);
  const go = (path) => history.push(path);

  return (
    <>
      {/* Pushes the two icons to the right end of the row. */}
      <li role="none" style={{ marginLeft: "auto" }}/>
      <GestureGuideLink/>
      <li role="none" className="h-full" style={{ flexShrink: 0 }}>
        <button
          type="button"
          aria-label="DragnCards home"
          title="DragnCards home"
          onClick={() => go("/")}
          className="h-full px-3 flex items-center bg-transparent border-0 cursor-pointer hover:bg-gray-700">
          <img src={process.env.PUBLIC_URL + "/logosvg.svg"} alt="DragnCards" style={{ height: 22 }}/>
        </button>
      </li>
      <Menu label={<FontAwesomeIcon icon={faUserCircle} style={{ fontSize: 22 }} aria-label="Profile"/>}>
        {authToken && user ? (
          <>
            <li role="none" className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-600 mb-1">
              Signed in as <span className="font-semibold text-gray-200">{user.alias}</span>
            </li>
            <MenuItem onClick={() => go("/profile")}>Settings</MenuItem>
            <MenuItem onClick={() => go("/myplugins/" + user.id)}>My Plugins</MenuItem>
            <MenuItem onClick={() => go("/myimages")}>My Images</MenuItem>
            <MenuItem onClick={() => go("/mygames")}>My Saved Games</MenuItem>
            {user.admin && <MenuItem onClick={() => go("/admin")}>Admin</MenuItem>}
            {!user.supporter_level && <MenuItem onClick={() => setShowPatreon(true)}>Support DragnCards</MenuItem>}
            <MenuItem onClick={() => logOut()}>Sign Out</MenuItem>
          </>
        ) : (
          <>
            <MenuItem onClick={() => go("/login")}>Log In</MenuItem>
            <MenuItem onClick={() => go("/signup")}>Sign Up</MenuItem>
          </>
        )}
      </Menu>
      <PatreonModal isOpen={showPatreon} isLoggedIn={!!authToken} closeModal={() => setShowPatreon(false)}/>
    </>
  );
};

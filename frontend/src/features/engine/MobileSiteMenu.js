import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import {
  faHandPointer, faHome, faUserCircle, faCog, faPuzzlePiece, faImages, faSave, faUserShield, faHeart,
  faSignOutAlt, faSignInAlt, faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { Menu, MenuItem, SubMenu } from "../../components/basic/Menu";
import useAuth from "../../hooks/useAuth";
import useProfile from "../../hooks/useProfile";
import { PatreonModal } from "../store/support/PatreonModal";
import { openGestureGuide } from "./MobileGestureGuide";

// The site navbar (AppNav + ProfileMenu) for the mobile UI, which covers it with
// the full-screen table: a "DragnCards" section of the mobile full-screen menu
// (MobileFullMenu) with the Gesture Guide, the home page, and the account pages.
export const MobileSiteMenu = () => {
  const history = useHistory();
  const { authToken, logOut } = useAuth();
  const user = useProfile();
  const [showPatreon, setShowPatreon] = useState(false);
  const go = (path) => history.push(path);
  const signedIn = !!(authToken && user);

  return (
    <>
      <Menu label="DragnCards">
        <MenuItem icon={faHandPointer} onClick={openGestureGuide}>Gesture Guide</MenuItem>
        <MenuItem icon={faHome} onClick={() => go("/")}>Home</MenuItem>
        {signedIn ? (
          <SubMenu icon={faUserCircle} label={user.alias || "Account"}>
            <MenuItem icon={faCog} onClick={() => go("/profile")}>Settings</MenuItem>
            <MenuItem icon={faPuzzlePiece} onClick={() => go("/myplugins/" + user.id)}>My Plugins</MenuItem>
            <MenuItem icon={faImages} onClick={() => go("/myimages")}>My Images</MenuItem>
            <MenuItem icon={faSave} onClick={() => go("/mygames")}>My Saved Games</MenuItem>
            {user.admin && <MenuItem icon={faUserShield} onClick={() => go("/admin")}>Admin</MenuItem>}
            {!user.supporter_level &&
              <MenuItem icon={faHeart} onClick={() => setShowPatreon(true)}>Support DragnCards</MenuItem>}
            <MenuItem icon={faSignOutAlt} onClick={() => logOut()}>Sign Out</MenuItem>
          </SubMenu>
        ) : (
          <>
            <MenuItem icon={faSignInAlt} onClick={() => go("/login")}>Log In</MenuItem>
            <MenuItem icon={faUserPlus} onClick={() => go("/signup")}>Sign Up</MenuItem>
          </>
        )}
      </Menu>
      <PatreonModal isOpen={showPatreon} isLoggedIn={!!authToken} closeModal={() => setShowPatreon(false)}/>
    </>
  );
};

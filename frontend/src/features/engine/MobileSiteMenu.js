import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { Menu, MenuItem } from "../../components/basic/Menu";
import useAuth from "../../hooks/useAuth";
import useProfile from "../../hooks/useProfile";
import { PatreonModal } from "../store/support/PatreonModal";

// The site navbar (AppNav + ProfileMenu) for the mobile UI, which covers it with
// the full-screen table: home, the profile menu's pages, support and sign out,
// as one more menu in the ☰ row beside Menu / View / Builder.
export const MobileSiteMenu = () => {
  const history = useHistory();
  const { authToken, logOut } = useAuth();
  const user = useProfile();
  const [showPatreon, setShowPatreon] = useState(false);
  const go = (path) => history.push(path);

  return (
    <>
      <Menu label="Site">
        <MenuItem onClick={() => go("/")}>DragnCards home</MenuItem>
        {authToken && user ? (
          <>
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

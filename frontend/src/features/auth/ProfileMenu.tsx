import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useProfile from "../../hooks/useProfile";
import { IconContext } from "react-icons";
import { GoFileMedia, GoGear, GoHistory, GoPackage, GoPerson, GoShield, GoSignOut, GoTriangleDown } from "react-icons/go";
import { SupporterBadge } from "../user/UserName";

const iconClass = "mr-2 text-gray-400 flex-shrink-0";

const itemClass =
  "flex items-center w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-600 no-underline cursor-pointer";

export const ProfileMenu: React.FC = () => {
  const user = useProfile();
  const { logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (user == null) {
    return null;
  }
  const { alias } = user;
  const hasBadge = user.supporter_level != null && user.supporter_level >= 3;
  const close = () => setOpen(false);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex items-center px-3 py-1 text-md text-gray-300 font-medium rounded hover:text-white hover:bg-gray-600 transition-colors duration-150 focus:outline-none"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <IconContext.Provider value={{ className: "inline-block align-middle" }}>
          {!hasBadge && <GoPerson />}
          <span className={hasBadge ? "" : "ml-1"}>
            <SupporterBadge level={user.supporter_level} />
            {alias}
          </span>
          <GoTriangleDown className="inline-block align-middle ml-1" />
        </IconContext.Provider>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
        >
          <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-600 mb-1">
            Signed in as <span className="font-semibold text-gray-200">{alias}</span>
          </div>
          <Link to="/profile" className={itemClass} onClick={close}>
            <GoGear className={iconClass} />
            Settings
          </Link>
          <Link to={"/myplugins/" + user.id} className={itemClass} onClick={close}>
            <GoPackage className={iconClass} />
            My Plugins
          </Link>
          <Link to="/myimages" className={itemClass} onClick={close}>
            <GoFileMedia className={iconClass} />
            My Images
          </Link>
          <Link to="/mygames" className={itemClass} onClick={close}>
            <GoHistory className={iconClass} />
            My Saved Games
          </Link>
          {user.admin && (
            <Link to="/admin" className={itemClass} onClick={close}>
              <GoShield className={iconClass} />
              Admin
            </Link>
          )}
          <div className="border-t border-gray-600 my-1" />
          <button type="button" className={itemClass} onClick={() => { close(); logOut(); }}>
            <GoSignOut className={iconClass} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
export default ProfileMenu;

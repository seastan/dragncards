import React, {
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import cx from "classnames";
import { useSelector } from "react-redux";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

/*
 * A small, dependency-free dropdown-menu primitive used by the in-game TopBar.
 * Replaces the old CSS `:hover` nested-<ul> system.
 *
 * Open behavior is hybrid:
 *   - On devices with a fine pointer (mouse), menus open on hover.
 *   - In touch mode they open on tap, with tap-outside / Escape to close.
 * Triggers are real <button>s with aria-haspopup/aria-expanded so the menu is
 * keyboard-focusable and dismissable with Escape.
 */

interface MenuContextValue {
  // Closes the whole top-level menu (called when a leaf item is chosen).
  close: () => void;
}
const MenuContext = React.createContext<MenuContextValue>({ close: () => {} });

const useTouchMode = (): boolean =>
  useSelector((state: any) => !!state?.playerUi?.touchMode);

// Shared styling for any clickable row inside a menu panel.
const itemClasses =
  "w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 rounded text-sm " +
  "text-gray-200 bg-transparent border-0 cursor-pointer transition-colors duration-150";

// Styling shared by both the top-level and nested dropdown panels.
const panelClasses = "py-1 px-1 list-none m-0 bg-gray-800 border border-gray-700 rounded-md shadow-xl";

export const MenuBar: React.FC<{ className?: string; children: ReactNode }> = ({
  className,
  children,
}) => (
  <ul
    role="menubar"
    className={cx("flex h-full items-stretch list-none m-0 p-0", className)}
  >
    {children}
  </ul>
);

interface MenuProps {
  label: ReactNode;
  children: ReactNode;
  /** Min width of the dropdown panel in rem. */
  panelMinWidthRem?: number;
}

export const Menu: React.FC<MenuProps> = ({
  label,
  children,
  panelMinWidthRem = 14,
}) => {
  const touchMode = useTouchMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hoverProps = touchMode
    ? {}
    : {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
      };

  return (
    <li ref={ref} role="none" className="relative h-full" {...hoverProps}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "h-full px-4 flex items-center justify-center select-none font-medium",
          "bg-transparent border-0 cursor-pointer transition-colors duration-150",
          open ? "bg-gray-700 text-white" : "text-gray-200 hover:bg-gray-700 hover:text-white"
        )}
      >
        {label}
      </button>
      {open && (
        <ul
          role="menu"
          className={cx("absolute left-0 mt-px", panelClasses)}
          style={{ zIndex: 10001, minWidth: `${panelMinWidthRem}rem`, top: "100%" }}
        >
          <MenuContext.Provider value={{ close: () => setOpen(false) }}>
            {children}
          </MenuContext.Provider>
        </ul>
      )}
    </li>
  );
};

interface MenuItemProps {
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
  className?: string;
  /** Whether choosing this item closes the whole menu (default true). */
  closeOnClick?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  onClick,
  children,
  className,
  closeOnClick = true,
}) => {
  const { close } = useContext(MenuContext);
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        className={cx(itemClasses, "hover:bg-gray-700 hover:text-white", className)}
        onClick={(e) => {
          onClick?.(e);
          if (closeOnClick) close();
        }}
      >
        {children}
      </button>
    </li>
  );
};

interface SubMenuProps {
  label: ReactNode;
  children: ReactNode;
  /** Min width of the nested panel in rem. */
  panelMinWidthRem?: number;
}

export const SubMenu: React.FC<SubMenuProps> = ({
  label,
  children,
  panelMinWidthRem = 16,
}) => {
  const touchMode = useTouchMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  const hoverProps = touchMode
    ? {}
    : {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
      };

  return (
    <li ref={ref} role="none" className="relative" {...hoverProps}>
      <button
        type="button"
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(itemClasses, open ? "bg-gray-700 text-white" : "hover:bg-gray-700 hover:text-white")}
      >
        <span>{label}</span>
        <FontAwesomeIcon icon={faChevronRight} className="ml-2 opacity-50" />
      </button>
      {open && (
        <ul
          role="menu"
          className={cx("absolute top-0 left-full ml-px overflow-y-auto", panelClasses)}
          style={{ zIndex: 10002, minWidth: `${panelMinWidthRem}rem`, maxHeight: "60dvh" }}
        >
          {children}
        </ul>
      )}
    </li>
  );
};

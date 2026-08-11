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

// The live setting is playerUi.userSettings.touchMode — playerUi.touchMode is a
// vestigial field that is never written, so reading it kept the menus in
// hover-open mode even with touch mode on.
const useTouchMode = (): boolean =>
  useSelector((state: any) => !!state?.playerUi?.userSettings?.touchMode);

// Hover-intent open/close: opening is immediate, but closing is deferred by a
// short delay so that briefly crossing the small gap between a trigger and its
// (absolutely-positioned) panel does not make the menu vanish before the
// pointer reaches it.
const CLOSE_DELAY_MS = 150;

const useHoverIntent = (enabled: boolean) => {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const hoverProps = enabled
    ? {
        onMouseEnter: () => {
          clearTimer();
          setOpen(true);
        },
        onMouseLeave: () => {
          clearTimer();
          timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
        },
      }
    : {};

  return { open, setOpen, hoverProps, clearTimer };
};

// Coordinates a set of sibling menus so that only one is open at a time.
// Opening is immediate (which instantly closes any sibling), while closing on
// mouse-out is deferred by CLOSE_DELAY_MS so the pointer can travel across the
// small gap into the flyout without it disappearing. The same mechanism is used
// at two levels: across the top-level menus in a MenuBar, and across the
// SubMenus that share one panel.
interface MenuGroupValue {
  openId: string | null;
  setOpen: (id: string | null) => void; // immediate
  scheduleClose: (id: string) => void; // deferred; only closes if still this id
  cancelClose: () => void;
}

const useMenuGroupState = (): MenuGroupValue => {
  const [openId, setOpenId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => cancelClose, []);

  const setOpen = (id: string | null) => {
    cancelClose();
    setOpenId(id);
  };
  const scheduleClose = (id: string) => {
    cancelClose();
    timer.current = setTimeout(
      () => setOpenId((cur) => (cur === id ? null : cur)),
      CLOSE_DELAY_MS
    );
  };

  return { openId, setOpen, scheduleClose, cancelClose };
};

// Coordinates the top-level menus that share a MenuBar.
const MenuBarGroupContext = React.createContext<MenuGroupValue | null>(null);
// Coordinates the SubMenus that share one panel.
const SubMenuGroupContext = React.createContext<MenuGroupValue | null>(null);

let menuNodeSeq = 0;
const useMenuNodeId = (): string => {
  const idRef = useRef<string>();
  if (idRef.current === undefined) idRef.current = `menu-node-${menuNodeSeq++}`;
  return idRef.current;
};

const SubMenuGroupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = useMenuGroupState();
  return (
    <SubMenuGroupContext.Provider value={value}>
      {children}
    </SubMenuGroupContext.Provider>
  );
};

// Shared styling for any clickable row inside a menu panel.
const itemClasses =
  "w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 rounded text-sm " +
  "text-gray-200 bg-transparent border-0 cursor-pointer transition-colors duration-150";

// Styling shared by both the top-level and nested dropdown panels.
const panelClasses = "py-1 px-1 list-none m-0 bg-gray-800 border border-gray-700 rounded-md shadow-xl";

export const MenuBar: React.FC<{ className?: string; children: ReactNode }> = ({
  className,
  children,
}) => {
  const group = useMenuGroupState();
  return (
    <MenuBarGroupContext.Provider value={group}>
      <ul
        role="menubar"
        className={cx("flex h-full items-stretch list-none m-0 p-0", className)}
      >
        {children}
      </ul>
    </MenuBarGroupContext.Provider>
  );
};

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
  const ref = useRef<HTMLLIElement>(null);
  const id = useMenuNodeId();
  const group = useContext(MenuBarGroupContext);

  // Fallback for a Menu rendered outside a MenuBar group: keep the previous
  // self-contained hover-intent behavior.
  const fallback = useHoverIntent(!touchMode);

  const open = group ? group.openId === id : fallback.open;

  const close = () => {
    if (group) group.setOpen(null);
    else {
      fallback.clearTimer();
      fallback.setOpen(false);
    }
  };
  const toggle = () => {
    if (group) group.setOpen(group.openId === id ? null : id);
    else fallback.setOpen((o) => !o);
  };

  // Entering a top-level menu immediately makes it the one open menu, instantly
  // closing any sibling. Mouse-out closes are deferred so the pointer can travel
  // into the panel; switching directly to a sibling cancels that and opens it.
  const hoverProps = touchMode
    ? {}
    : group
    ? {
        onMouseEnter: () => group.setOpen(id),
        onMouseLeave: () => group.scheduleClose(id),
      }
    : fallback.hoverProps;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <li ref={ref} role="none" className="relative h-full" {...hoverProps}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
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
          className={cx("absolute left-0", panelClasses)}
          style={{ zIndex: 10001, minWidth: `${panelMinWidthRem}rem`, top: "100%" }}
        >
          <MenuContext.Provider value={{ close }}>
            <SubMenuGroupProvider>{children}</SubMenuGroupProvider>
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
  const ref = useRef<HTMLLIElement>(null);
  const id = useMenuNodeId();
  const group = useContext(SubMenuGroupContext);

  // Fallback for the (unexpected) case of a SubMenu rendered outside a panel
  // group: keep the previous self-contained hover-intent behavior.
  const fallback = useHoverIntent(!touchMode);

  const open = group ? group.openId === id : fallback.open;

  const toggle = () => {
    if (group) group.setOpen(group.openId === id ? null : id);
    else fallback.setOpen((o) => !o);
  };

  const hoverProps = touchMode
    ? {}
    : group
    ? {
        // Entering immediately makes this the one open submenu, instantly
        // closing any sibling that was open.
        onMouseEnter: () => group.setOpen(id),
        onMouseLeave: () => group.scheduleClose(id),
      }
    : fallback.hoverProps;

  return (
    <li ref={ref} role="none" className="relative" {...hoverProps}>
      <button
        type="button"
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
        className={cx(itemClasses, open ? "bg-gray-700 text-white" : "hover:bg-gray-700 hover:text-white")}
      >
        <span>{label}</span>
        <FontAwesomeIcon icon={faChevronRight} className="ml-2 opacity-50" />
      </button>
      {open && (
        <ul
          role="menu"
          className={cx("absolute top-0 left-full overflow-y-auto", panelClasses)}
          style={{ zIndex: 10002, minWidth: `${panelMinWidthRem}rem`, maxHeight: "60dvh" }}
        >
          <SubMenuGroupProvider>{children}</SubMenuGroupProvider>
        </ul>
      )}
    </li>
  );
};

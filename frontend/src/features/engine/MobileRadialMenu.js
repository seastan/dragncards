import React, { useEffect, useRef, useState } from "react";
import { hotkeyId, useHotkeyTabs, useFavoriteHotkeys, useRunHotkey, useHotkeyLabel, useHotkeyToTouchAction, HotkeyLabel } from "./MobileHotkeys";
import { useSetTouchAction } from "./hooks/useSetTouchAction";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { Z_INDEX } from "./functions/common";

// Press and hold on empty table (mobile UI): the favourite hotkeys open in a
// ring around the finger. Drag toward one to highlight it, release to run it
// (token / card hotkeys arm, as from the favourites bar); release near the
// middle to cancel.

const HOLD_MS = 450;
const SLOP_PX = 10;          // moving further before the hold completes cancels it
const DEAD_ZONE = 32;        // release this close to the centre selects nothing
const ITEM = 58;             // item bubble size

// Presses that belong to something else (as for the board swipe).
const IGNORE = ".dnc3d-card-lift, .dnc3d-tilt-overlay, .dnc3d-scroll-arrow, button, [role=menuitem]";

const useFavoriteItems = () => {
  const { token, card, game, dragn } = useHotkeyTabs();
  const { favs } = useFavoriteHotkeys();
  const byId = Object.fromEntries([...token, ...card, ...game, ...dragn].map(item => [hotkeyId(item), item]));
  return favs.map(id => byId[id]).filter(Boolean);
};

export const useRadialMenu = ({ tableRef, enabled }) => {
  const items = useFavoriteItems();
  const runHotkey = useRunHotkey();
  const toTouchAction = useHotkeyToTouchAction();
  const setTouchAction = useSetTouchAction();
  const [menu, setMenu] = useState(null);     // { cx, cy, radius, selected }
  const openRef = useRef(false);              // read by the board swipe
  const live = useRef({});
  live.current = { enabled, items, run: (item) => (item.armable ? setTouchAction(toTouchAction(item)) : runHotkey(item)) };

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    let g = null;   // { id, x0, y0, timer, menu }

    const layout = (x, y, n) => {
      const radius = n > 8 ? 118 : 96;
      const margin = radius + ITEM / 2 + 6;
      return {
        cx: Math.min(Math.max(x, margin), window.innerWidth - margin),
        cy: Math.min(Math.max(y, margin), window.innerHeight - margin),
        radius,
      };
    };
    const pick = (m, x, y, n) => {
      const dx = x - m.cx, dy = y - m.cy;
      if (n === 0 || Math.hypot(dx, dy) < DEAD_ZONE) return -1;
      // Items go clockwise from the top.
      const a = (Math.atan2(dy, dx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
      return Math.round(a / (2 * Math.PI / n)) % n;
    };
    const close = () => {
      if (g?.timer) clearTimeout(g.timer);
      g = null;
      openRef.current = false;
      setMenu(null);
    };

    const onDown = (e) => {
      if (!live.current.enabled || g || (e.button !== undefined && e.button !== 0)) return;
      if (e.target.closest?.(IGNORE)) return;
      const x = e.clientX, y = e.clientY;
      g = { id: e.pointerId, x0: x, y0: y, menu: null };
      g.timer = setTimeout(() => {
        if (!g) return;
        g.timer = null;
        const m = { ...layout(x, y, live.current.items.length), selected: -1 };
        g.menu = m;
        openRef.current = true;
        if (navigator.vibrate) navigator.vibrate(15);
        setMenu(m);
      }, HOLD_MS);
    };
    const onMove = (e) => {
      if (!g || e.pointerId !== g.id) return;
      if (!g.menu) {
        if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > SLOP_PX) close();
        return;
      }
      const selected = pick(g.menu, e.clientX, e.clientY, live.current.items.length);
      if (selected !== g.menu.selected) {
        g.menu = { ...g.menu, selected };
        setMenu(g.menu);
      }
    };
    const onUp = (e) => {
      if (!g || e.pointerId !== g.id) return;
      const m = g.menu;
      const item = m && e.type === "pointerup" ? live.current.items[pick(m, e.clientX, e.clientY, live.current.items.length)] : null;
      close();
      if (!m) return;
      // The click after a long press isn't a tap on the table (which would,
      // among other things, disarm the hotkey just armed).
      const block = (ce) => { ce.stopPropagation(); window.removeEventListener("click", block, true); };
      window.addEventListener("click", block, true);
      setTimeout(() => window.removeEventListener("click", block, true), 400);
      if (item) live.current.run(item);
    };
    // Once the menu is open the finger's moves are ours: keep the browser from
    // turning them into a pan (which would cancel the pointer).
    const onTouchMove = (e) => { if (openRef.current) e.preventDefault(); };
    const onContextMenu = (e) => { if (g) e.preventDefault(); };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("contextmenu", onContextMenu);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("contextmenu", onContextMenu);
      if (g?.timer) clearTimeout(g.timer);
    };
  }, [tableRef]);

  return { menu, items, openRef };
};

const RadialItem = ({ item, x, y, selected }) => {
  const gameDef = useGameDefinition();
  const labelOf = useHotkeyLabel();
  const tokenImage = item.kind === "token" ? gameDef?.tokens?.[item.tokenType]?.imageUrl : null;
  const size = selected ? ITEM + 12 : ITEM;
  return (
    <div style={{
      position: "fixed",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      boxSizing: "border-box",
      padding: 5,
      background: selected ? "#4b5563" : "rgba(31,41,55,0.95)",
      border: `2px solid ${selected ? "#e5e7eb" : "#4b5563"}`,
      boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
      color: "#e5e7eb",
      fontSize: 9.5,
      lineHeight: 1.1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      overflow: "hidden",
      transition: "all 80ms ease-out",
    }}>
      {tokenImage
        ? <img alt="" src={tokenImage} style={{ width: "78%", height: "78%", objectFit: "contain" }}/>
        : <span style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
            <HotkeyLabel text={labelOf(item)} iconSize={16}/>
          </span>}
    </div>
  );
};

export const RadialMenuOverlay = ({ menu, items }) => {
  const labelOf = useHotkeyLabel();
  if (!menu) return null;
  const n = items.length;
  const selected = items[menu.selected];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: Z_INDEX.DropdownMenu, pointerEvents: "none", background: "rgba(0,0,0,0.25)" }}>
      <div style={{
        position: "fixed",
        left: menu.cx - menu.radius,
        top: menu.cy - menu.radius,
        width: menu.radius * 2,
        height: menu.radius * 2,
        borderRadius: menu.radius,
        border: "1px dashed rgba(255,255,255,0.2)",
      }}/>
      {/* Centre: what a release would do. */}
      <div style={{
        position: "fixed",
        left: menu.cx - 30,
        top: menu.cy - 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        background: "rgba(17,17,22,0.92)",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "#9ca3af",
        fontSize: 9.5,
        lineHeight: 1.15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 4,
        boxSizing: "border-box",
        overflow: "hidden",
      }}>
        {n === 0 ? "No favorites yet" : selected ? <HotkeyLabel text={labelOf(selected)} iconSize={14}/> : "Cancel"}
      </div>
      {items.map((item, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return (
          <RadialItem
            key={`${hotkeyId(item)}:${i}`}
            item={item}
            x={menu.cx + menu.radius * Math.cos(a)}
            y={menu.cy + menu.radius * Math.sin(a)}
            selected={i === menu.selected}/>
        );
      })}
    </div>
  );
};

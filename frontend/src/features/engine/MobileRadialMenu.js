import React, { useEffect, useRef, useState } from "react";
import { hotkeyId, FAV_REORDERED_KEY, RADIAL_USES_KEY, useHotkeyTabs, useFavoriteHotkeys, useRunHotkey, useHotkeyLabel, useHotkeyToTouchAction, HotkeyLabel } from "./MobileHotkeys";
import { useSetTouchAction } from "./hooks/useSetTouchAction";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { Z_INDEX } from "./functions/common";

// Press on empty table (mobile UI): the favourite hotkeys open in a ring
// around the finger, straight away. Drag toward one to highlight it, release
// to run it (token / card hotkeys arm, as from the favourites bar); drag and
// come back to the middle to cancel. A press released without moving is an
// ordinary tap on the table (it clears the selection, disarms a hotkey, ...);
// the ring fades in after a moment (MobileRadialMenu CSS), so a tap barely
// shows it. Switching boards is the top bar's player panel's job, so nothing
// here competes for the drag.

const SLOP_PX = 8;           // moving further than this makes it a menu gesture, not a tap
const DEAD_ZONE = 45;        // within this of where the press started, nothing is picked
const ITEM = 58;             // item bubble size

// Presses that belong to something else: cards, the drawer, buttons.
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
  const openRef = useRef(false);              // true while the ring is up
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
    // The item the finger is heading for: the one whose direction from where
    // the press started is closest to the direction the finger has moved.
    // Measured from the press, not the ring's centre — near a screen edge the
    // ring is shifted inward to fit, and the finger then starts off-centre.
    const pick = (m, x, y, n) => {
      const dx = x - m.x0, dy = y - m.y0;
      if (n === 0 || Math.hypot(dx, dy) < DEAD_ZONE) return -1;
      const heading = Math.atan2(dy, dx);
      let best = -1, bestDiff = Infinity;
      for (let i = 0; i < n; i++) {
        // Items go clockwise from the top.
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const ix = m.cx + m.radius * Math.cos(a) - m.x0, iy = m.cy + m.radius * Math.sin(a) - m.y0;
        let diff = Math.abs(Math.atan2(iy, ix) - heading);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < bestDiff) { bestDiff = diff; best = i; }
      }
      return best;
    };
    const close = () => {
      if (g?.timer) clearTimeout(g.timer);
      g = null;
      openRef.current = false;
      setMenu(null);
    };

    const onDown = (e) => {
      // A second finger: that's a two-finger swipe (MobileBoardSwipe), not a
      // pick from the ring.
      if (g && e.pointerId !== g.id) { close(); return; }
      if (!live.current.enabled || g || (e.button !== undefined && e.button !== 0)) return;
      if (e.target.closest?.(IGNORE)) return;
      const x = e.clientX, y = e.clientY;
      const m = { ...layout(x, y, live.current.items.length), x0: x, y0: y, selected: -1 };
      g = { id: e.pointerId, x0: x, y0: y, menu: m, moved: false };
      openRef.current = true;
      setMenu(m);
    };
    const onMove = (e) => {
      if (!g || e.pointerId !== g.id) return;
      if (!g.moved && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > SLOP_PX) g.moved = true;
      const selected = pick(g.menu, e.clientX, e.clientY, live.current.items.length);
      if (selected !== g.menu.selected) {
        g.menu = { ...g.menu, selected };
        setMenu(g.menu);
      }
    };
    const onUp = (e) => {
      if (!g || e.pointerId !== g.id) return;
      const m = g.menu;
      const moved = g.moved;
      // A press released without moving is a tap on the table, never a pick.
      const item = m && moved && e.type === "pointerup" ? live.current.items[pick(m, e.clientX, e.clientY, live.current.items.length)] : null;
      close();
      // Released where it was pressed: a tap on the table; let its click through.
      if (!m || (!moved && !item)) return;
      // Otherwise the click that follows isn't a tap on the table (which would,
      // among other things, disarm the hotkey just armed).
      const block = (ce) => { ce.stopPropagation(); window.removeEventListener("click", block, true); };
      window.addEventListener("click", block, true);
      setTimeout(() => window.removeEventListener("click", block, true), 400);
      if (item) {
        live.current.run(item);
        try {
          const uses = Number(window.localStorage.getItem(RADIAL_USES_KEY)) || 0;
          window.localStorage.setItem(RADIAL_USES_KEY, String(uses + 1));
        } catch (e) { /* fine */ }
      }
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

// Shown with the ring until the player has reordered their favourites, or has
// used the ring a good few times without wanting to.
const HINT_USES = 10;
const showReorderHint = () => {
  try {
    return !window.localStorage.getItem(FAV_REORDERED_KEY)
      && (Number(window.localStorage.getItem(RADIAL_USES_KEY)) || 0) < HINT_USES;
  } catch (e) { return false; }
};

export const RadialMenuOverlay = ({ menu, items }) => {
  const labelOf = useHotkeyLabel();
  const [hint, setHint] = useState(false);
  const isOpen = !!menu;
  useEffect(() => { if (isOpen) setHint(showReorderHint()); }, [isOpen]);
  if (!menu) return null;
  const n = items.length;
  const selected = items[menu.selected];
  return (
    <div className="mobile-radial-in" style={{ position: "fixed", inset: 0, zIndex: Z_INDEX.DropdownMenu, pointerEvents: "none", background: "rgba(0,0,0,0.25)" }}>
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
        left: menu.cx - 45,
        top: menu.cy - 45,
        width: 90,
        height: 90,
        borderRadius: 45,
        background: "rgba(17,17,22,0.92)",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "#9ca3af",
        fontSize: 12,
        lineHeight: 1.15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 6,
        boxSizing: "border-box",
        overflow: "hidden",
      }}>
        {n === 0 ? "No favorites yet" : selected ? <HotkeyLabel text={labelOf(selected)} iconSize={20}/> : "Cancel"}
      </div>
      {hint && items.length > 1 &&
        <div style={{
          position: "fixed",
          left: 16,
          right: 16,
          // Top or bottom, whichever is further from the ring.
          ...(menu.cy > window.innerHeight / 2 ? { top: 150 } : { bottom: 150 }),
          textAlign: "center",
        }}>
          <span style={{
            display: "inline-block",
            padding: "8px 14px",
            borderRadius: 18,
            background: "rgba(17,17,22,0.92)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#e5e7eb",
            fontSize: 13,
            lineHeight: 1.3,
          }}>
            Rearrange your favourites by holding and dragging them in the favourites bar.
          </span>
        </div>}
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

import React, { useState } from "react";
import Draggable from "react-draggable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faGripVertical } from "@fortawesome/free-solid-svg-icons";
import {
  hotkeyId, useHotkeyTabs, useFavoriteHotkeys, useRunHotkey, useHotkeyLabel, useHotkeyToTouchAction,
  HotkeyLabel, MobileHotkeyList,
} from "./MobileHotkeys";
import { useTouchAction } from "./hooks/useTouchAction";
import { useSetTouchAction } from "./hooks/useSetTouchAction";
import { Z_INDEX } from "./functions/common";

// Favourite hotkeys on the regular (desktop) table, the same favourites as the
// mobile UI's bar and radial menu (MobileHotkeys.useFavoriteHotkeys; plugin
// defaults from gameDef.defaultFavorites):
//   - FavoritesPanel: a draggable window (View > Favorite hotkeys). Click a
//     game or engine hotkey to run it; click a token or card hotkey to switch
//     it on — it then applies to every card clicked until the table is clicked.
//     Drag a favourite by its grip to reorder. Edit lists every hotkey with a
//     star.
//   - ArmedHotkeyPill: says what's switched on, wherever it was switched on
//     from (the panel or the radial menu opened by dragging on the table).

const TABS = [["token", "Token"], ["card", "Card"], ["game", "Game"], ["dragn", "Dragn"]];

const KeyHint = ({ keys }) => (
  <span className="flex-shrink-0 rounded border border-gray-600 px-1.5 text-xs text-gray-400" style={{ fontFamily: "monospace" }}>
    {keys}
  </span>
);

// Runs a game / engine hotkey, or switches a token / card hotkey on (or off,
// if it's the one already on).
export const useFavoriteAction = () => {
  const runHotkey = useRunHotkey();
  const toTouchAction = useHotkeyToTouchAction();
  const touchAction = useTouchAction();
  const setTouchAction = useSetTouchAction();
  const isOn = (item) => item.armable && touchAction?.id === toTouchAction(item).id;
  const act = (item) => {
    if (!item.armable) return runHotkey(item);
    setTouchAction(isOn(item) ? null : toTouchAction(item));
  };
  return { act, isOn };
};

export const FavoritesPanel = ({ onClose }) => {
  const tabs = useHotkeyTabs();
  const favorites = useFavoriteHotkeys();
  const labelOf = useHotkeyLabel();
  const touchAction = useTouchAction();
  const { act, isOn } = useFavoriteAction();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("token");
  // Reordering by the grip: the order shown while dragging, saved on drop.
  const [dragOrder, setDragOrder] = useState(null);   // { ids, from }

  const byId = Object.fromEntries([...tabs.token, ...tabs.card, ...tabs.game, ...tabs.dragn].map(item => [hotkeyId(item), item]));
  const shownIds = favorites.favs.filter(id => byId[id]);
  const orderIds = dragOrder ? dragOrder.ids : shownIds;
  const items = orderIds.map(id => byId[id]).filter(Boolean);

  const dragOver = (index) => {
    if (!dragOrder || dragOrder.from === index) return;
    const ids = [...dragOrder.ids];
    const [moved] = ids.splice(dragOrder.from, 1);
    ids.splice(index, 0, moved);
    setDragOrder({ ids, from: index });
  };
  const dragEnd = () => {
    if (!dragOrder) return;
    // Favourites this game doesn't list (e.g. from another plugin version) keep their place at the end.
    const hidden = favorites.favs.filter(id => !byId[id]);
    favorites.reorder([...dragOrder.ids, ...hidden]);
    setDragOrder(null);
  };

  return (
    <Draggable handle=".drag-handle">
      <div
        className="flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 text-white shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", zIndex: Z_INDEX.Hotkeys, right: 30, top: 120, width: 320, maxHeight: "80dvh" }}>
        <div className="drag-handle flex cursor-move items-center gap-2 border-b border-gray-700 bg-gray-900 bg-opacity-50 px-3 py-2">
          <h1 className="flex-1 select-none text-sm font-semibold tracking-wide">Favorite hotkeys</h1>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className={"rounded-md px-2 py-0.5 text-xs " + (editing ? "bg-blue-700 text-white" : "bg-gray-700 text-gray-200 hover:bg-gray-600")}>
            {editing ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-700 hover:text-white">
            <FontAwesomeIcon icon={faTimes}/>
          </button>
        </div>

        {editing ? (
          <>
            <div className="flex border-b border-gray-700">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={"flex-1 py-1.5 text-xs font-semibold " + (tab === id ? "border-b-2 border-gray-200 text-white" : "text-gray-400 hover:text-gray-200")}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-1 py-1 text-sm">
              <div className="px-2 py-1 text-xs text-gray-400">Star the hotkeys you want in your favourites.</div>
              <MobileHotkeyList items={tabs[tab] || []} onRun={act} favorites={favorites}/>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-1">
            {items.length === 0 &&
              <div className="px-3 py-4 text-sm text-gray-400">No favourites yet. Click <b>Edit</b> to star some hotkeys.</div>}
            {items.map((item, i) => (
              <div
                key={hotkeyId(item)}
                onDragOver={(e) => { e.preventDefault(); dragOver(i); }}
                onDrop={(e) => e.preventDefault()}
                className={"flex items-center rounded-md " + (dragOrder?.from === i ? "opacity-50" : "")}>
                <span
                  draggable
                  title="Drag to reorder"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", hotkeyId(item));
                    setDragOrder({ ids: shownIds, from: i });
                  }}
                  onDragEnd={dragEnd}
                  className="flex h-9 w-6 flex-shrink-0 cursor-grab items-center justify-center text-gray-500 hover:text-gray-300">
                  <FontAwesomeIcon icon={faGripVertical}/>
                </span>
                <button
                  type="button"
                  onClick={() => act(item)}
                  className={"flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm " +
                    (isOn(item) ? "bg-blue-700 text-white" : "text-gray-200 hover:bg-gray-700")}>
                  <span className="min-w-0 flex-1"><HotkeyLabel text={labelOf(item)} iconSize={20}/></span>
                  <KeyHint keys={item.key}/>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-700 px-3 py-2 text-xs text-gray-400">
          {touchAction
            ? (touchAction.actionType === "token"
                ? "Click a card's top half to add a token, its bottom half to remove one. Click the table to stop."
                : "Click cards to apply it. Click the table to stop.")
            : "Tip: drag on the table to pick a favourite from a ring."}
        </div>
      </div>
    </Draggable>
  );
};

export const ArmedHotkeyPill = ({ touchAction, onClear }) => (
  <div
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "absolute",
      left: "50%",
      top: 8,
      transform: "translateX(-50%)",
      zIndex: Z_INDEX.Hotkeys - 1,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 6px 6px 14px",
      borderRadius: 999,
      background: "rgba(29, 78, 216, 0.95)",
      boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
      color: "white",
      fontSize: 14,
      whiteSpace: "nowrap",
    }}>
    <b><HotkeyLabel text={touchAction.label || touchAction.id} iconSize={20}/></b>
    <span style={{ opacity: 0.85 }}>
      {touchAction.actionType === "token"
        ? "Top half of a card adds · bottom half removes · click the table to stop"
        : "Click cards to apply · click the table to stop"}
    </span>
    <button
      type="button"
      aria-label="Stop"
      onClick={onClear}
      style={{ width: 26, height: 26, borderRadius: 13, border: "none", background: "rgba(255,255,255,0.2)", color: "white", cursor: "pointer" }}>
      <FontAwesomeIcon icon={faTimes}/>
    </button>
  </div>
);

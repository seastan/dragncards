import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

// Full-screen dialogs for the mobile UI. Desktop modals are fixed-size boxes
// (700px wide, 92vw x 85dvh, ...) that a portrait phone clips or squashes; in
// the mobile UI they fill the screen instead, under a sticky header with a
// close button (a phone has no Escape key, and tapping outside isn't possible
// when nothing is outside).

// ReactModal `style.content` for a full-screen dialog.
export const MOBILE_MODAL_CONTENT = {
  position: "fixed",
  inset: 0,
  width: "100%",
  height: "100%",
  maxHeight: "none",
  margin: 0,
  border: "none",
  borderRadius: 0,
  padding: 0,
  overflowY: "auto",
  paddingTop: "env(safe-area-inset-top)",
  paddingBottom: "env(safe-area-inset-bottom)",
};

export const MobileModalHeader = ({ title, onClose, children }) => (
  <div style={{
    position: "sticky",
    top: 0,
    zIndex: 5,
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 52,
    padding: "0 6px 0 16px",
    background: "#1f2937",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    color: "white",
  }}>
    <div style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {title}
    </div>
    {children}
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      style={{
        flexShrink: 0,
        width: 44,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        color: "#e5e7eb",
        fontSize: 20,
        cursor: "pointer",
        touchAction: "manipulation",
      }}>
      <FontAwesomeIcon icon={faTimes}/>
    </button>
  </div>
);

// A row of tabs under a MobileModalHeader: [[id, label], ...].
export const MobileModalTabs = ({ tabs, current, onSelect }) => (
  <div style={{ position: "sticky", top: 52, zIndex: 4, display: "flex", background: "#1f2937", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
    {tabs.map(([id, label, disabled]) => (
      <div
        key={id}
        onClick={() => !disabled && onSelect(id)}
        style={{
          flex: 1,
          textAlign: "center",
          padding: "11px 0 9px",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: disabled ? "#4b5563" : current === id ? "white" : "#9ca3af",
          borderBottom: `2px solid ${current === id ? "#e5e7eb" : "transparent"}`,
          cursor: disabled ? "default" : "pointer",
          touchAction: "manipulation",
        }}>
        {label}
      </div>
    ))}
  </div>
);

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

/**
 * A small icon action with a real button element: keyboard reachable, exposed
 * to assistive tech via its label, and padded so the hit target is larger than
 * the 12px glyph. Bare icons with onClick handlers were none of those, and were
 * close enough together that a click aimed at rename could land on delete.
 */
export const ActionButton = ({ icon, label, onClick, danger }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    className={"text-gray-300 " + (danger ? "hover:text-red-400" : "hover:text-blue-300")}
    style={{ padding: "5px 6px", lineHeight: 0, background: "transparent", border: 0, cursor: "pointer" }}
  >
    <FontAwesomeIcon icon={icon} className="text-xs" />
  </button>
);

export default ActionButton;

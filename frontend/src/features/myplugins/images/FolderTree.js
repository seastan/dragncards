import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faFolderOpen, faPencilAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
import { ActionButton } from "./ActionButton";

/**
 * Folders are real: they can be empty, and they persist when their last image is
 * deleted. The root ("/") is implicit and cannot be renamed or deleted.
 */
export const FolderTree = ({ dirs, selected, onSelect, onRenameFolder, onDeleteFolder }) => {
  // Hover is tracked in state rather than with group-hover:, which the app's
  // prebuilt Tailwind file does not include.
  const [hovered, setHovered] = useState(null);

  return (
  <div className="text-sm">
    {dirs.map((folder) => {
      const isSelected = folder.path === selected;
      const showActions = hovered === folder.path;
      return (
        <div
          key={folder.path || "/"}
          onMouseEnter={() => setHovered(folder.path)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(folder.path)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHovered(null);
          }}
          className={
            "relative flex items-center gap-1 rounded px-2 py-1 cursor-pointer " +
            (isSelected ? "bg-gray-600 text-white" : "text-gray-300 hover:bg-gray-700")
          }
          style={{ paddingLeft: `${8 + folder.depth * 14}px` }}
          onClick={() => onSelect(folder.path)}
        >
          <FontAwesomeIcon
            icon={isSelected ? faFolderOpen : faFolder}
            className="text-yellow-400 flex-shrink-0"
          />
          <span className="truncate flex-1">{folder.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{folder.count}</span>

          {/* Overlaid on the right rather than laid out inline: hidden buttons
              still took their width, which truncated every folder name. Opacity
              (not visibility) keeps them keyboard-focusable while hidden. The root
              has no actions: it cannot be renamed or deleted. */}
          {folder.path !== "" && (
            <span
              className="absolute flex items-center rounded"
              style={{
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: "rgba(17,24,39,0.9)",
                opacity: showActions ? 1 : 0,
                pointerEvents: showActions ? "auto" : "none",
              }}
            >
              <ActionButton
                icon={faPencilAlt}
                label={`Rename or move folder ${folder.path}`}
                onClick={() => onRenameFolder(folder)}
              />
              <ActionButton
                icon={faTrash}
                label={`Delete folder ${folder.path} and everything in it`}
                danger
                onClick={() => onDeleteFolder(folder)}
              />
            </span>
          )}
        </div>
      );
    })}
  </div>
  );
};

export default FolderTree;

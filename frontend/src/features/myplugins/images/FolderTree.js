import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faFolderOpen, faLink, faTrash } from "@fortawesome/free-solid-svg-icons";
import { formatBytes } from "./formatBytes";
import { ActionButton } from "./ActionButton";

/**
 * Folders are derived from image rows on the backend, so an empty folder cannot
 * exist. There is deliberately no "new folder" action: you create one by
 * uploading into it.
 */
export const FolderTree = ({ dirs, selected, onSelect, onCopyUrl, onDeleteFolder }) => {
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
            "flex items-center gap-1 rounded px-2 py-1 cursor-pointer " +
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

          <span
            className="flex gap-1 flex-shrink-0"
            // See ImageGrid: opacity keeps the buttons focusable while hidden.
            style={{ opacity: showActions ? 1 : 0, pointerEvents: showActions ? "auto" : "none" }}
          >
            <ActionButton
              icon={faLink}
              label={`Copy URL of ${folder.path || "your image root"} (${formatBytes(folder.bytes)})`}
              onClick={() => onCopyUrl(folder)}
            />
            {folder.path !== "" && (
              <ActionButton
                icon={faTrash}
                label={`Delete folder ${folder.path} and everything in it`}
                danger
                onClick={() => onDeleteFolder(folder)}
              />
            )}
          </span>
        </div>
      );
    })}
  </div>
  );
};

export default FolderTree;

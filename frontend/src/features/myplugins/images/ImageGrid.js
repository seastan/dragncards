import React, { useState } from "react";
import { faLink, faPencilAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
import { formatBytes } from "./formatBytes";
import { ActionButton } from "./ActionButton";

/**
 * The served WebP is itself the thumbnail: every stored image is already capped
 * at its profile's dimensions, so there is no separate thumbnail to generate.
 */
export const ImageGrid = ({ images, selected, onToggle, onCopyUrl, onRename, onDelete }) => {
  // See FolderTree: hover lives in state because group-hover: is not in the
  // app's prebuilt stylesheet.
  const [hovered, setHovered] = useState(null);

  if (!images.length) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        This folder is empty.
      </div>
    );
  }

  return (
    <div
      className="grid gap-2 p-2"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}
    >
      {images.map((image) => {
        const isSelected = selected.has(image.id);
        const isHovered = hovered === image.id;
        return (
          <div
            key={image.id}
            className="relative rounded border bg-gray-800"
            style={{
              borderColor: isSelected ? "#60a5fa" : isHovered ? "#6b7280" : "#374151",
            }}
            onMouseEnter={() => setHovered(image.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(image.id)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setHovered(null);
            }}
          >
            <label className="block cursor-pointer">
              <input
                type="checkbox"
                className="absolute z-10 cursor-pointer"
                style={{ top: 4, left: 4 }}
                checked={isSelected}
                onChange={() => onToggle(image.id)}
              />
              <div
                className="flex items-center justify-center overflow-hidden p-1"
                style={{ height: 130 }}
              >
                <img
                  src={image.url}
                  alt={image.filename}
                  loading="lazy"
                  className="object-contain"
                  style={{ maxHeight: "100%", maxWidth: "100%" }}
                />
              </div>
            </label>

            <div className="px-1 pb-1">
              <div className="truncate text-xs text-gray-200" title={image.path}>
                {image.filename}
              </div>
              <div
                className="flex items-center justify-between text-gray-400"
                style={{ fontSize: 10 }}
              >
                <span>
                  {image.width}x{image.height}
                </span>
                <span>{formatBytes(image.bytes)}</span>
              </div>
            </div>

            {/* Real buttons with padded hit targets, and delete set apart from the
                other two: as bare 12px glyphs 8px apart, a click aimed at rename
                could land on delete. */}
            <div
              className="absolute flex items-center rounded"
              style={{
                top: 2,
                right: 2,
                backgroundColor: "rgba(17,24,39,0.85)",
                // Opacity rather than visibility: a visibility:hidden button
                // cannot receive keyboard focus, so it could never be revealed.
                opacity: isHovered ? 1 : 0,
                pointerEvents: isHovered ? "auto" : "none",
              }}
            >
              <ActionButton icon={faLink} label={`Copy URL of ${image.filename}`} onClick={() => onCopyUrl(image)} />
              <ActionButton icon={faPencilAlt} label={`Rename or move ${image.filename}`} onClick={() => onRename(image)} />
              <span style={{ width: 8 }} />
              <ActionButton icon={faTrash} label={`Delete ${image.filename}`} danger onClick={() => onDelete(image)} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ImageGrid;

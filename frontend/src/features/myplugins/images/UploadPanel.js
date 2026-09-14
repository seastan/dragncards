import React, { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faExclamationCircle,
  faFile,
  faFolderOpen,
  faRedo,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { fromFileInput } from "./folderDrop";
import { formatBytes } from "./formatBytes";
import { tones } from "./tones";

export const PROFILES = [
  { value: "cards", label: "Cards", hint: "Card faces and backs. Resized to at most 900px, transparency flattened to white." },
  { value: "backgrounds", label: "Backgrounds", hint: "Table backgrounds. Resized to at most 1920px." },
  { value: "tokens", label: "Tokens", hint: "Tokens and icons. Resized to at most 400px, transparency kept." },
];

const plainButton = {
  background: "#374151",
  border: 0,
  borderRadius: 4,
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 12,
  padding: "4px 10px",
};

const statusIcon = (item) => {
  switch (item.status) {
    case "done":
      return <FontAwesomeIcon icon={faCheck} style={{ color: "#4ade80" }} />;
    case "error":
      return <FontAwesomeIcon icon={faExclamationCircle} style={{ color: "#f87171" }} />;
    case "queued":
      return <FontAwesomeIcon icon={faFile} style={{ color: "#9ca3af" }} />;
    default:
      return <FontAwesomeIcon icon={faSpinner} spin style={{ color: "#93c5fd" }} />;
  }
};

const statusText = (item) => {
  switch (item.status) {
    case "queued":
      return "Waiting";
    case "uploading":
      return `Uploading ${Math.round(item.progress * 100)}%`;
    case "processing":
      // The bytes have all arrived; the server is converting. Without saying so
      // the row sits at 100% and looks stuck.
      return "Processing";
    case "done":
      return formatBytes(item.bytes) + " sent";
    default:
      return "";
  }
};

export const UploadPanel = ({ dir, profile, onProfileChange, queue, onPick, disabledReason }) => {
  const fileInput = useRef(null);
  const folderInput = useRef(null);

  // React does not pass webkitdirectory through reliably, so set it directly.
  useEffect(() => {
    if (folderInput.current) {
      folderInput.current.setAttribute("webkitdirectory", "");
      folderInput.current.setAttribute("directory", "");
    }
  }, []);

  const handleInput = (event) => {
    const picked = fromFileInput(event.target.files);
    // Reset so choosing the same files again still fires a change event.
    event.target.value = "";
    if (picked.length) onPick(picked);
  };

  const { items, skipped, summary, retryableCount, isRunning } = queue;
  const hint = PROFILES.find((p) => p.value === profile)?.hint;
  const destination = dir === "" ? "the top level" : dir;

  return (
    <div className="border-b border-gray-700 px-3 py-2 text-xs text-gray-300">
      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
        <span>
          Upload into <span className="font-semibold text-white">{destination}</span> as
        </span>
        <select
          aria-label="Image type"
          value={profile}
          onChange={(e) => onProfileChange(e.target.value)}
          style={{ ...plainButton, padding: "3px 6px" }}
        >
          {PROFILES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <button type="button" style={plainButton} disabled={!!disabledReason} onClick={() => fileInput.current.click()}>
          <FontAwesomeIcon icon={faFile} className="mr-1" />
          Choose files
        </button>
        <button type="button" style={plainButton} disabled={!!disabledReason} onClick={() => folderInput.current.click()}>
          <FontAwesomeIcon icon={faFolderOpen} className="mr-1" />
          Choose folder
        </button>

        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp"
          style={{ display: "none" }}
          onChange={handleInput}
        />
        <input ref={folderInput} type="file" multiple style={{ display: "none" }} onChange={handleInput} />
      </div>

      <div className="mt-1 text-gray-400">
        {hint} Or drop files and folders onto this panel; subfolders are kept.
      </div>

      {disabledReason && (
        <div className="mt-2 rounded p-2" style={tones.error}>
          {disabledReason}
        </div>
      )}

      {summary.total > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-3">
            <span>
              {summary.done} of {summary.total} uploaded
              {summary.failed > 0 && <span style={{ color: "#f87171" }}>, {summary.failed} failed</span>}
              {skipped.length > 0 && `, ${skipped.length} skipped (not images)`}
            </span>
            <span style={{ marginLeft: "auto" }} className="flex gap-2">
              {retryableCount > 0 && !isRunning && (
                <button type="button" style={plainButton} onClick={queue.retryFailed}>
                  <FontAwesomeIcon icon={faRedo} className="mr-1" />
                  Retry {retryableCount} failed
                </button>
              )}
              {summary.finished && (
                <button type="button" style={plainButton} onClick={queue.clearFinished}>
                  Clear
                </button>
              )}
            </span>
          </div>

          <ul className="mt-2 overflow-y-auto" style={{ maxHeight: 180 }} aria-label="Upload queue">
            {items.map((item) => (
              <li key={item.id} className="py-0.5">
                <div className="flex items-center gap-2">
                  <span style={{ width: 14, textAlign: "center" }}>{statusIcon(item)}</span>
                  <span className="truncate flex-1" title={`${item.relPath} -> ${item.target}`}>
                    {item.relPath}
                  </span>
                  <span className="text-gray-400" style={{ flexShrink: 0 }}>
                    {statusText(item)}
                  </span>
                </div>
                {item.status === "uploading" && (
                  <div className="rounded overflow-hidden" style={{ height: 3, marginLeft: 22, backgroundColor: "#111827" }}>
                    <div style={{ height: "100%", width: `${item.progress * 100}%`, backgroundColor: "#60a5fa" }} />
                  </div>
                )}
                {item.error && (
                  <div style={{ marginLeft: 22, color: "#fca5a5" }}>{item.error}</div>
                )}
              </li>
            ))}
          </ul>

          {skipped.length > 0 && (
            <div className="mt-1 text-gray-500" title={skipped.join("\n")}>
              Skipped: {skipped.slice(0, 5).join(", ")}
              {skipped.length > 5 && ` and ${skipped.length - 5} more`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadPanel;

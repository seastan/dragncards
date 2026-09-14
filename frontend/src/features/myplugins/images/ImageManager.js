import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faTrash, faCheckSquare, faSquare, faFolderPlus, faUpload } from "@fortawesome/free-solid-svg-icons";
import useProfile from "../../../hooks/useProfile";
import { useImageLibrary } from "./useImageLibrary";
import { QuotaBar } from "./QuotaBar";
import { FolderTree } from "./FolderTree";
import { ImageGrid } from "./ImageGrid";
import { tones } from "./tones";
import { UploadPanel } from "./UploadPanel";
import { useUploadQueue } from "./useUploadQueue";
import { captureDroppedEntries, expandDropped } from "./folderDrop";

const toolbarButton = { background: "transparent", border: 0, padding: 0, cursor: "pointer" };

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // clipboard is unavailable outside a secure context; fall back to a prompt
    // so the value is still obtainable rather than silently lost.
    console.log("Clipboard unavailable, falling back", err);
    window.prompt("Copy this URL:", text);
    return false;
  }
};

export const ImageManager = ({ onSupportClick }) => {
  const user = useProfile();
  const {
    tree,
    images,
    quota,
    dir,
    isLoading,
    error,
    selectDir,
    refresh,
    deleteImages,
    deleteFolder,
    moveImage,
    createFolder,
    renameFolder,
    applyQuota,
  } = useImageLibrary();

  const [selected, setSelected] = useState(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [profile, setProfile] = useState("cards");
  const [dragDepth, setDragDepth] = useState(0);

  const upload = useUploadQueue({
    // Each batch response carries fresh usage, so the quota bar moves as files
    // land rather than jumping at the end.
    onBatch: useCallback((data) => data?.quota && applyQuota(data.quota), [applyQuota]),
    onFinished: useCallback(() => refresh(), [refresh]),
  });
  const [notice, setNotice] = useState(null);

  // Success toasts clear themselves; errors stay until dismissed so they are
  // not missed.
  useEffect(() => {
    if (notice?.kind !== "ok") return undefined;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = images.length > 0 && images.every((image) => selected.has(image.id));

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (images.length > 0 && images.every((image) => prev.has(image.id))) return new Set();
      return new Set(images.map((image) => image.id));
    });
  }, [images]);

  const openFolder = useCallback(
    (path) => {
      clearSelection();
      selectDir(path);
    },
    [clearSelection, selectDir]
  );

  const report = (result, successText) => {
    if (result.ok) setNotice({ kind: "ok", text: successText });
    else setNotice({ kind: "error", text: result.message });
  };

  const handleCopyImageUrl = async (image) => {
    await copyToClipboard(image.url);
    setNotice({ kind: "ok", text: `Copied the URL for ${image.filename}.` });
  };

  const handleDeleteOne = async (image) => {
    if (!window.confirm(`Delete ${image.filename}? Anything using its URL will stop loading.`)) return;
    const result = await deleteImages([image.id]);
    clearSelection();
    report(result, `Deleted ${image.filename}.`);
  };

  const handleDeleteSelected = async () => {
    const count = selected.size;
    if (!count) return;
    if (!window.confirm(`Delete ${count} image${count === 1 ? "" : "s"}? Anything using their URLs will stop loading.`)) return;
    const result = await deleteImages(Array.from(selected));
    clearSelection();
    report(result, `Deleted ${count} image${count === 1 ? "" : "s"}.`);
  };

  const handleDeleteFolder = async (folder) => {
    if (
      !window.confirm(
        folder.count === 1
          ? `Delete the folder "${folder.path}" and the image in it?`
          : `Delete the folder "${folder.path}" and all ${folder.count} images in it?`
      )
    )
      return;
    const result = await deleteFolder(folder.path);
    clearSelection();
    report(result, `Deleted ${folder.path}.`);
  };

  const uploadDisabledReason = !quota
    ? null
    : !quota.storage_ready
    ? "Image hosting is not available on this server right now."
    : quota.free_space_low
    ? "The server is low on disk space, so uploads are paused for everyone."
    : quota.over_quota
    ? "You are over your limit. Delete some images to upload more."
    : null;

  const addPicked = (picked) => {
    if (uploadDisabledReason) {
      setNotice({ kind: "error", text: uploadDisabledReason });
      return;
    }
    setShowUpload(true);
    const { added, skipped } = upload.add(picked, { dir, profile });
    if (!added && skipped) setNotice({ kind: "error", text: "None of those files are images (PNG, JPEG, GIF or WebP)." });
  };

  // Only react to drags that carry files, not text or a dragged thumbnail.
  const isFileDrag = (event) => Array.from(event.dataTransfer?.types || []).includes("Files");

  const dropHandlers = {
    onDragEnter: (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      setDragDepth((d) => d + 1);
    },
    onDragOver: (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    // enter/leave fire for every child element crossed, so count depth rather
    // than toggling a boolean, which would flicker.
    onDragLeave: (event) => {
      if (!isFileDrag(event)) return;
      setDragDepth((d) => Math.max(0, d - 1));
    },
    onDrop: async (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      setDragDepth(0);
      // Must be captured synchronously, before any await; see folderDrop.js.
      const captured = captureDroppedEntries(event.dataTransfer);
      const picked = await expandDropped(captured);
      if (picked.length) addPicked(picked);
    },
  };

  const handleNewFolder = async () => {
    const inside = dir === "" ? "the top level" : `"${dir}"`;
    const name = window.prompt(`New folder inside ${inside}. Use / to nest.`, "");
    if (!name || !name.trim()) return;
    const path = dir === "" ? name.trim() : `${dir}/${name.trim()}`;
    const result = await createFolder(path);
    clearSelection();
    report(result, `Created ${result.folder?.path}.`);
  };

  const handleRenameFolder = async (folder) => {
    const next = window.prompt(
      "New path for this folder, relative to your image root. Use / to move it elsewhere.",
      folder.path
    );
    if (!next || !next.trim() || next.trim() === folder.path) return;

    // Renaming changes every image URL inside, which breaks anything already
    // using those URLs. Say so before doing it.
    if (folder.count > 0) {
      const warning =
        (folder.count === 1
          ? `This changes the URL of the image in "${folder.path}".\n\n`
          : `This changes the URL of all ${folder.count} images in "${folder.path}".\n\n`) +
        `Anywhere you already use ${folder.count === 1 ? "its URL" : "their URLs"}, such as your plugin's card data, will stop showing ${folder.count === 1 ? "it" : "them"} until you update it.\n\n` +
        `Rename anyway?`;
      if (!window.confirm(warning)) return;
    }

    const result = await renameFolder(folder.path, next.trim());
    clearSelection();
    if (result.ok) {
      setNotice({ kind: "ok", text: `Renamed to ${result.folder.to}.` });
    } else {
      setNotice({ kind: "error", text: result.message });
    }
  };

  const handleRename = async (image) => {
    const next = window.prompt(
      "New path, relative to your image root. Use / for folders.",
      image.path
    );
    if (!next || next === image.path) return;
    const result = await moveImage(image.id, next);
    clearSelection();
    report(result, `Moved to ${result.image?.path}.`);
  };

  // The root lists only files stored directly at the top level, not everything,
  // so it must not be labelled "All images" next to a tree that says 7.
  const dirLabel = useMemo(() => (dir === "" ? "Top level" : dir), [dir]);

  if (!user) return null;

  return (
    <div className="flex h-full flex-col text-white">
      <QuotaBar quota={quota} onSupportClick={onSupportClick} />

      {/* A floating toast rather than an inline banner: inserting a banner above
          the grid shifted every control down, so a click aimed at one icon
          right after a notice appeared could land on a different one. */}
      {notice && (
        <div
          className="fixed flex items-start gap-3 rounded p-2 text-xs shadow-lg"
          style={{ ...tones[notice.kind === "ok" ? "ok" : "error"], bottom: 20, right: 20, zIndex: 100, maxWidth: 420 }}
          role="status"
        >
          <span>{notice.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            style={{ ...toolbarButton, color: "inherit", opacity: 0.7 }}
            onClick={() => setNotice(null)}
          >
            x
          </button>
        </div>
      )}

      {error && (
        <div className="mb-2 rounded p-2 text-xs" style={tones.error}>
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3">
        <div
          className="flex-shrink-0 overflow-y-auto rounded-lg bg-gray-800 p-2"
          style={{ width: 210 }}
        >
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-xs uppercase tracking-wide text-gray-500">Folders</span>
            <button
              type="button"
              className="text-xs text-gray-300 hover:text-white"
              style={toolbarButton}
              onClick={handleNewFolder}
              title={dir === "" ? "New folder" : `New folder inside ${dir}`}
            >
              <FontAwesomeIcon icon={faFolderPlus} className="mr-1" />
              New
            </button>
          </div>
          <FolderTree
            dirs={tree.dirs}
            selected={dir}
            onSelect={openFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>

        <div
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-gray-800"
          {...dropHandlers}
        >
          {dragDepth > 0 && (
            <div
              className="absolute flex items-center justify-center rounded-lg text-sm text-white"
              style={{
                inset: 0,
                zIndex: 20,
                backgroundColor: "rgba(30,58,138,0.55)",
                border: "2px dashed #93c5fd",
                pointerEvents: "none",
              }}
            >
              Drop to upload into {dir === "" ? "the top level" : dir}
            </div>
          )}
          <div className="flex items-center gap-3 border-b border-gray-700 px-3 py-2 text-sm">
            <span className="truncate font-semibold" title={dirLabel}>
              {dirLabel}
            </span>
            <span className="text-xs text-gray-400">
              {images.length} image{images.length === 1 ? "" : "s"}
            </span>

            <div className="flex items-center gap-3" style={{ marginLeft: "auto" }}>
              <button
                type="button"
                className="text-xs text-gray-300 hover:text-white"
                style={toolbarButton}
                aria-expanded={showUpload}
                onClick={() => setShowUpload((v) => !v)}
              >
                <FontAwesomeIcon icon={faUpload} className="mr-1" />
                {showUpload ? "Hide upload" : "Upload"}
              </button>
              {images.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-gray-300 hover:text-white"
                  style={toolbarButton}
                  onClick={toggleAll}
                >
                  <FontAwesomeIcon icon={allSelected ? faCheckSquare : faSquare} className="mr-1" />
                  {allSelected ? "Clear" : "Select all"}
                </button>
              )}
              {selected.size > 0 && (
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-500"
                  style={toolbarButton}
                  onClick={handleDeleteSelected}
                >
                  <FontAwesomeIcon icon={faTrash} className="mr-1" />
                  Delete {selected.size}
                </button>
              )}
              <button
                type="button"
                title="Refresh"
                aria-label="Refresh"
                className="text-xs text-gray-300 hover:text-white"
                style={{ ...toolbarButton, opacity: isLoading ? 0.5 : 1 }}
                onClick={() => refresh()}
              >
                <FontAwesomeIcon icon={faSync} />
              </button>
            </div>
          </div>

          {(showUpload || upload.summary.total > 0) && (
            <UploadPanel
              dir={dir}
              profile={profile}
              onProfileChange={setProfile}
              queue={upload}
              onPick={addPicked}
              disabledReason={uploadDisabledReason}
            />
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading && !images.length ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
            ) : (
              <ImageGrid
                images={images}
                selected={selected}
                onToggle={toggle}
                onCopyUrl={handleCopyImageUrl}
                onRename={handleRename}
                onDelete={handleDeleteOne}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageManager;

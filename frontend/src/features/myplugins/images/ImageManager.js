import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faTrash, faCheckSquare, faSquare } from "@fortawesome/free-solid-svg-icons";
import useProfile from "../../../hooks/useProfile";
import { useImageLibrary } from "./useImageLibrary";
import { QuotaBar } from "./QuotaBar";
import { FolderTree } from "./FolderTree";
import { ImageGrid } from "./ImageGrid";
import { tones } from "./tones";

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
  } = useImageLibrary();

  const [selected, setSelected] = useState(new Set());
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

  const handleCopyFolderUrl = async (folder) => {
    await copyToClipboard(folder.url);
    setNotice({
      kind: "ok",
      text: `Copied the URL for ${folder.path || "your image root"}. Use it as an imageUrlPrefix.`,
    });
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
          <div className="mb-1 px-2 text-xs uppercase tracking-wide text-gray-500">Folders</div>
          <FolderTree
            dirs={tree.dirs}
            selected={dir}
            onSelect={openFolder}
            onCopyUrl={handleCopyFolderUrl}
            onDeleteFolder={handleDeleteFolder}
          />
          {tree.dirs.length <= 1 && (
            <div className="mt-2 px-2 text-xs text-gray-500">
              Folders appear here once you upload into them.
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-gray-800">
          <div className="flex items-center gap-3 border-b border-gray-700 px-3 py-2 text-sm">
            <span className="truncate font-semibold" title={dirLabel}>
              {dirLabel}
            </span>
            <span className="text-xs text-gray-400">
              {images.length} image{images.length === 1 ? "" : "s"}
            </span>

            <div className="flex items-center gap-3" style={{ marginLeft: "auto" }}>
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

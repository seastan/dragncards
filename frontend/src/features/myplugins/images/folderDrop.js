// Turning a drag-and-drop or a folder picker into a flat list of
// { file, relPath } with subfolder paths preserved.
//
// Two browser traps make naive implementations silently lose files:
//
// 1. DataTransferItemList is only readable during the drop event itself. Once
//    the handler awaits anything, the items are neutered, so the entries must be
//    captured synchronously before any async work starts.
// 2. DirectoryReader.readEntries() returns AT MOST 100 entries per call and must
//    be called repeatedly until it returns an empty batch. Calling it once
//    quietly truncates any folder with more than 100 files.

/** Call synchronously inside the drop handler, before any await. */
export const captureDroppedEntries = (dataTransfer) => {
  const entries = [];
  const items = dataTransfer?.items;
  if (items && items.length && typeof items[0].webkitGetAsEntry === "function") {
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
    // The API can exist yet yield nothing (e.g. items added programmatically);
    // fall through to plain files rather than silently dropping everything.
    if (entries.length) return { entries, files: [] };
  }
  // No entries API: plain files only, no folder structure available.
  return { entries: [], files: Array.from(dataTransfer?.files || []) };
};

export const readAllEntries = async (reader) => {
  const all = [];
  for (;;) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) return all;
    all.push(...batch);
  }
};

const walk = async (entry, prefix, out) => {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    out.push({ file, relPath: prefix + entry.name });
  } else if (entry.isDirectory) {
    const children = await readAllEntries(entry.createReader());
    for (const child of children) {
      await walk(child, `${prefix}${entry.name}/`, out);
    }
  }
};

/** Expands captured entries (files and whole folders) into { file, relPath }. */
export const expandDropped = async ({ entries, files }) => {
  const out = files.map((file) => ({ file, relPath: file.name }));
  for (const entry of entries) {
    await walk(entry, "", out);
  }
  return out;
};

/** From an <input type="file"> change event, with or without webkitdirectory. */
export const fromFileInput = (fileList) =>
  Array.from(fileList || []).map((file) => ({
    file,
    relPath: file.webkitRelativePath || file.name,
  }));

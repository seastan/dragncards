// Pure planning for an upload: what to send, what to skip, and how to batch it.
// Kept free of React and network code so it can be unit-tested.

// Must stay within the server's :max_files_per_request (40), and within the
// nginx client_max_body_size for /be/api/v1/images/ (64M) with headroom for
// multipart overhead.
export const BATCH_MAX_FILES = 20;
export const BATCH_MAX_BYTES = 40 * 1024 * 1024;
// Mirrors the server's :max_source_bytes, so an oversized file fails instantly
// instead of after being uploaded.
export const MAX_SOURCE_BYTES = 20 * 1000 * 1000;

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

const extension = (name) => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
};

const isHiddenPath = (relPath) => relPath.split("/").some((segment) => segment.startsWith("."));

/** Where a file will be stored: its folder, with the extension rewritten to .webp. */
export const targetPath = (root, relPath) => {
  const withRoot = root ? `${root}/${relPath}` : relPath;
  const slash = withRoot.lastIndexOf("/");
  const dir = slash === -1 ? "" : withRoot.slice(0, slash);
  const name = slash === -1 ? withRoot : withRoot.slice(slash + 1);
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return dir ? `${dir}/${stem}.webp` : `${stem}.webp`;
};

let nextId = 1;

/**
 * Turns picked or dropped files into queue items.
 *
 * - Hidden files (.DS_Store and anything under a dot-folder) are dropped
 *   silently: they are never what the author meant to upload.
 * - Non-images are reported as skipped rather than sent to be rejected.
 * - Oversized files fail up front.
 * - Two files that would become the same .webp (a.png and a.jpg, or A.png and
 *   a.png since storage is case-insensitive) conflict: the second is marked as
 *   an error instead of silently overwriting the first on the server.
 */
export const planQueue = (picked, root) => {
  const items = [];
  const skipped = [];
  const seen = new Map();

  for (const { file, relPath } of picked) {
    if (isHiddenPath(relPath)) continue;

    if (!IMAGE_EXTENSIONS.has(extension(relPath))) {
      skipped.push(relPath);
      continue;
    }

    const target = targetPath(root, relPath);
    const key = target.normalize("NFC").toLowerCase();
    const item = {
      id: nextId++,
      file,
      relPath,
      target,
      bytes: file.size,
      status: "queued",
      progress: 0,
      error: null,
      url: null,
      // Planned failures (too big, name clash) would fail identically on retry.
      retryable: true,
    };

    if (file.size > MAX_SOURCE_BYTES) {
      item.status = "error";
      item.error = `File is ${(file.size / 1000000).toFixed(1)} MB; the limit is 20 MB.`;
      item.retryable = false;
    } else if (seen.has(key)) {
      item.status = "error";
      item.error = `Would overwrite ${seen.get(key)} (both become ${target.split("/").pop()}).`;
      item.retryable = false;
    } else {
      seen.set(key, relPath);
    }

    items.push(item);
  }

  return { items, skipped };
};

/**
 * Groups queued items into batches under both the file-count and byte limits.
 * A single file larger than the byte limit still gets a batch of its own.
 */
export const planBatches = (items, maxFiles = BATCH_MAX_FILES, maxBytes = BATCH_MAX_BYTES) => {
  const batches = [];
  let current = [];
  let bytes = 0;

  for (const item of items) {
    if (item.status !== "queued") continue;
    const wouldOverflow = current.length >= maxFiles || (current.length > 0 && bytes + item.bytes > maxBytes);
    if (wouldOverflow) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += item.bytes;
  }

  if (current.length) batches.push(current);
  return batches;
};

export const summarize = (items) => {
  const count = (status) => items.filter((item) => item.status === status).length;
  const done = count("done");
  const failed = count("error");
  const active = items.length - done - failed;
  return { total: items.length, done, failed, active, finished: active === 0 };
};

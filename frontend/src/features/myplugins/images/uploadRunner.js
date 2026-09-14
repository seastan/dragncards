// Sends planned batches with bounded concurrency and reports per-file status.
// The network call is injected so this can be tested without a server.

import { planBatches } from "./uploadPlan";

export const UPLOAD_CONCURRENCY = 2;

/**
 * Builds the multipart body. Indexed field names (file_0/path_0, ...) rather
 * than files[] plus paths[], because ordering across two separate multipart
 * fields is not guaranteed and a file/path mismatch would be silently wrong.
 */
export const buildFormData = (batch, { profile, root }) => {
  const form = new FormData();
  form.append("profile", profile);
  form.append("root", root || "");
  form.append("count", String(batch.length));
  batch.forEach((item, index) => {
    form.append(`file_${index}`, item.file, item.file.name);
    // sendPath carries the destination folder captured when the file was added,
    // so navigating elsewhere mid-upload does not redirect files still queued.
    form.append(`path_${index}`, item.sendPath || item.relPath);
  });
  return form;
};

/**
 * @param items    queue items from planQueue (only "queued" ones are sent)
 * @param post     async (formData, onUploadProgress) => response.data
 * @param update   (id, patch) => void, called for every status change
 * @param onBatch  (responseData) => void, after each successful batch
 * @param describeError  (err) => message for a whole-batch failure
 */
export const runUploads = async ({
  items,
  profile,
  root,
  post,
  update,
  onBatch = () => {},
  describeError = () => "Upload failed.",
  concurrency = UPLOAD_CONCURRENCY,
}) => {
  const batches = planBatches(items);
  let next = 0;

  const sendBatch = async (batch) => {
    batch.forEach((item) => update(item.id, { status: "uploading", progress: 0, error: null }));

    const onUploadProgress = (event) => {
      const ratio = event.total ? event.loaded / event.total : 0;
      // Upload progress reaches 100% before the server has converted anything,
      // so switch to "processing" rather than leaving rows at 100% looking stuck.
      const status = ratio >= 1 ? "processing" : "uploading";
      batch.forEach((item) => update(item.id, { status, progress: ratio }));
    };

    try {
      const data = await post(buildFormData(batch, { profile, root }), onUploadProgress);
      const byIndex = new Map((data.results || []).map((result) => [result.index, result]));

      batch.forEach((item, index) => {
        const result = byIndex.get(index);
        if (result && result.status === "ok") {
          update(item.id, { status: "done", progress: 1, url: result.url, target: result.path, error: null });
        } else {
          update(item.id, {
            status: "error",
            progress: 0,
            error: result?.error || "No result returned for this file.",
          });
        }
      });

      onBatch(data);
    } catch (err) {
      const message = describeError(err);
      batch.forEach((item) => update(item.id, { status: "error", progress: 0, error: message }));
    }
  };

  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next++];
      await sendBatch(batch);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, worker));
  return batches.length;
};

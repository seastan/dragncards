import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { useAuthOptions } from "../../../hooks/useAuthOptions";
import { planQueue, summarize } from "./uploadPlan";
import { runUploads } from "./uploadRunner";
import { errorMessage } from "./useImageLibrary";

const UPLOAD_URL = "/be/api/v1/images/upload";

/**
 * Upload queue state for the image manager.
 *
 * Only one run is active at a time. Files added while a run is in progress are
 * queued and picked up when it finishes, so adding more files mid-upload never
 * multiplies the number of parallel requests hitting the server.
 */
export const useUploadQueue = ({ onBatch, onFinished }) => {
  const authOptions = useAuthOptions();
  const [items, setItems] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const itemsRef = useRef([]);
  const runningRef = useRef(false);

  // The ref is the source of truth and is updated synchronously; state just
  // mirrors it for rendering. Updating the ref inside a setItems updater looks
  // equivalent but is not: inside a React event handler (a Retry click, a file
  // picker's change event) the updater runs later, so drain() would read the
  // stale list, find nothing queued, and exit, leaving rows stuck on "Waiting".
  const commit = useCallback((updater) => {
    const next = updater(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const update = useCallback(
    (id, patch) => commit((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    [commit]
  );

  const post = useCallback(
    (form, onUploadProgress) =>
      axios
        .post(UPLOAD_URL, form, { ...authOptions, onUploadProgress })
        .then((res) => res.data),
    [authOptions]
  );

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);

    try {
      // Keep going while anything is still queued, including files added
      // during the previous pass.
      while (itemsRef.current.some((item) => item.status === "queued")) {
        const pending = itemsRef.current.filter((item) => item.status === "queued");
        // One request carries one profile, so files added with different
        // profiles (cards, then tokens) must go in separate runs; otherwise
        // tokens would be converted as cards and lose their transparency.
        const profiles = [...new Set(pending.map((item) => item.profile))];
        for (const profile of profiles) {
          await runUploads({
            items: pending.filter((item) => item.profile === profile),
            profile,
            root: "",
            post,
            update,
            onBatch,
            describeError: (err) => errorMessage(err, "Upload failed. Check your connection and retry."),
          });
        }
      }
    } finally {
      runningRef.current = false;
      setIsRunning(false);
      onFinished && onFinished();
    }
  }, [post, update, onBatch, onFinished]);

  /** Adds picked or dropped files, destined for `dir`, using `profile`. */
  const add = useCallback(
    (picked, { dir, profile }) => {
      const { items: planned, skipped: skippedNow } = planQueue(picked, dir);
      const withContext = planned.map((item) => ({
        ...item,
        profile,
        sendPath: dir ? `${dir}/${item.relPath}` : item.relPath,
      }));

      commit((prev) => [...prev, ...withContext]);
      if (skippedNow.length) setSkipped((prev) => [...prev, ...skippedNow]);
      if (withContext.some((item) => item.status === "queued")) drain();
      return { added: withContext.length, skipped: skippedNow.length };
    },
    [commit, drain]
  );

  const retryFailed = useCallback(() => {
    commit((prev) =>
      prev.map((item) =>
        item.status === "error" && item.retryable ? { ...item, status: "queued", error: null, progress: 0 } : item
      )
    );
    drain();
  }, [commit, drain]);

  const clearFinished = useCallback(() => {
    commit((prev) => prev.filter((item) => item.status !== "done" && item.status !== "error"));
    setSkipped([]);
  }, [commit]);

  return {
    items,
    skipped,
    isRunning,
    summary: summarize(items),
    retryableCount: items.filter((item) => item.status === "error" && item.retryable).length,
    add,
    retryFailed,
    clearFinished,
  };
};

export default useUploadQueue;

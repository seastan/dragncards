import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuthOptions } from "../../../hooks/useAuthOptions";

const API = "/be/api/v1/images";

// The backend answers per-file problems inside a 200, and whole-request
// refusals with a status plus {error: {message}} or {error: "..."}.
export const errorMessage = (err, fallback) => {
  const data = err?.response?.data;
  const message = data?.error?.message || data?.error;
  if (typeof message === "string") return message;
  if (err?.response?.status === 401) return "You are not signed in.";
  return fallback;
};

// Walks up from `path` to the closest folder present in the tree ("" always is).
export const nearestExisting = (path, dirs) => {
  const present = new Set(dirs.map((d) => d.path));
  let current = path;
  while (current !== "" && !present.has(current)) {
    const slash = current.lastIndexOf("/");
    current = slash === -1 ? "" : current.slice(0, slash);
  }
  return current;
};

/**
 * Everything the image manager needs: the folder tree, the images in the
 * selected folder, quota, and the mutations. Kept in one hook so a delete or a
 * move refreshes the tree, the listing and the quota bar together -- they are
 * three views of the same state and drifting apart would be confusing.
 */
export const useImageLibrary = () => {
  const authOptions = useAuthOptions();

  const [tree, setTree] = useState({ base_url: "", dirs: [] });
  const [images, setImages] = useState([]);
  const [quota, setQuota] = useState(null);
  const [dir, setDir] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTree = useCallback(async () => {
    const res = await axios.get(`${API}/tree`, authOptions);
    setTree(res.data);
    return res.data;
  }, [authOptions]);

  const loadQuota = useCallback(async () => {
    const res = await axios.get(`${API}/quota`, authOptions);
    setQuota(res.data.quota);
    return res.data.quota;
  }, [authOptions]);

  const loadImages = useCallback(
    async (nextDir) => {
      const res = await axios.get(`${API}?dir=${encodeURIComponent(nextDir)}`, authOptions);
      setImages(res.data.images);
      return res.data.images;
    },
    [authOptions]
  );

  const refresh = useCallback(
    async (nextDir = dir) => {
      setIsLoading(true);
      setError(null);
      try {
        // Folders only exist while they hold images, so deleting or moving the
        // last image out of the current folder makes it vanish from the tree.
        // Load the tree first and fall back to the nearest folder that still
        // exists, rather than leaving the view on a folder that is gone.
        const [freshTree] = await Promise.all([loadTree(), loadQuota()]);
        const target = nearestExisting(nextDir, freshTree.dirs);
        if (target !== nextDir) setDir(target);
        await loadImages(target);
      } catch (err) {
        console.log("Error loading image library", err);
        setError(errorMessage(err, "Could not load your images."));
      } finally {
        setIsLoading(false);
      }
    },
    [dir, loadTree, loadQuota, loadImages]
  );

  useEffect(() => {
    refresh("");
    // Intentionally once on mount; selectDir drives every later load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectDir = useCallback(
    async (nextDir) => {
      setDir(nextDir);
      setIsLoading(true);
      setError(null);
      try {
        await loadImages(nextDir);
      } catch (err) {
        console.log("Error listing folder", err);
        setError(errorMessage(err, "Could not open that folder."));
      } finally {
        setIsLoading(false);
      }
    },
    [loadImages]
  );

  const deleteImages = useCallback(
    async (ids) => {
      if (!ids.length) return { ok: true, deleted: 0 };
      try {
        const res = await axios.post(`${API}/delete`, { ids }, authOptions);
        await refresh();
        return { ok: true, deleted: res.data.deleted };
      } catch (err) {
        console.log("Error deleting images", err);
        return { ok: false, message: errorMessage(err, "Could not delete those images.") };
      }
    },
    [authOptions, refresh]
  );

  const deleteFolder = useCallback(
    async (target) => {
      try {
        const res = await axios.post(`${API}/delete`, { dir: target }, authOptions);
        // refresh() steps up to the nearest surviving folder if we were inside it.
        await refresh();
        return { ok: true, deleted: res.data.deleted };
      } catch (err) {
        console.log("Error deleting folder", err);
        return { ok: false, message: errorMessage(err, "Could not delete that folder.") };
      }
    },
    [authOptions, refresh]
  );

  const moveImage = useCallback(
    async (id, path) => {
      try {
        const res = await axios.post(`${API}/move`, { id, path }, authOptions);
        await refresh();
        return { ok: true, image: res.data.image };
      } catch (err) {
        console.log("Error moving image", err);
        return { ok: false, message: errorMessage(err, "Could not rename that image.") };
      }
    },
    [authOptions, refresh]
  );

  return {
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
  };
};

export default useImageLibrary;

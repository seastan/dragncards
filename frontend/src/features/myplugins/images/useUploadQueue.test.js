import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import axios from "axios";
import { useUploadQueue } from "./useUploadQueue";

jest.mock("axios");
jest.mock("../../../hooks/useAuthOptions", () => ({ useAuthOptions: () => ({}) }));

// Renders the hook and exposes its latest return value.
const renderQueue = () => {
  const handle = { current: null };
  const Harness = () => {
    handle.current = useUploadQueue({ onBatch: () => {}, onFinished: () => {} });
    return null;
  };
  const container = document.createElement("div");
  act(() => {
    ReactDOM.render(<Harness />, container);
  });
  return handle;
};

const picked = (names) => names.map((name) => ({ file: new File(["x"], name), relPath: name }));
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const asEvent = (fn) => ReactDOM.unstable_batchedUpdates(fn);

describe("useUploadQueue", () => {
  beforeEach(() => axios.post.mockReset());

  // This app mounts with the legacy ReactDOM.render, where React wraps every
  // event handler (a click, a file input's change event) in batchedUpdates.
  // Calling the hook inside batchedUpdates reproduces that exactly; act() on its
  // own did not, and a version of this test passed with the bug still present.
  // The bug: the queue read its list before React applied the update, found
  // nothing queued, and left every row stuck on "Waiting".
  it("starts uploading when files are added inside a React event", async () => {
    axios.post.mockImplementation(async (url, form) => ({
      data: { results: [{ index: 0, status: "ok", url: "u", path: form.get("path_0") }] },
    }));
    const queue = renderQueue();

    // The first add can succeed by luck: with no pending work React applies
    // the update eagerly. The second add, after a finished upload, is what an
    // author choosing more files actually does, and is where it broke.
    for (const name of ["first.png", "second.png"]) {
      await act(async () => {
        asEvent(() => queue.current.add(picked([name]), { dir: "", profile: "cards" }));
        await flush();
      });
    }

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(queue.current.items.map((item) => item.status)).toEqual(["done", "done"]);
  });

  it("actually re-sends failed files when Retry is clicked", async () => {
    axios.post
      .mockRejectedValueOnce({ response: { status: 507, data: { error: { message: "Low on disk space." } } } })
      .mockResolvedValueOnce({ data: { results: [{ index: 0, status: "ok", url: "u", path: "a.webp" }] } });
    const queue = renderQueue();

    await act(async () => {
      asEvent(() => queue.current.add(picked(["a.png"]), { dir: "", profile: "cards" }));
      await flush();
    });
    expect(queue.current.items[0]).toMatchObject({ status: "error", error: "Low on disk space." });

    await act(async () => {
      asEvent(() => queue.current.retryFailed());
      await flush();
    });

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(queue.current.items[0].status).toBe("done");
  });

  it("sends files added with different profiles in separate requests", async () => {
    axios.post.mockImplementation(async (url, form) => ({
      data: { results: [{ index: 0, status: "ok", url: "u", path: form.get("path_0") }] },
    }));
    const queue = renderQueue();

    await act(async () => {
      asEvent(() => {
        queue.current.add(picked(["card.png"]), { dir: "", profile: "cards" });
        queue.current.add(picked(["token.png"]), { dir: "tokens", profile: "tokens" });
      });
      await flush();
      await flush();
    });

    const sent = axios.post.mock.calls.map(([, form]) => [form.get("profile"), form.get("path_0")]);
    expect(sent).toEqual([
      ["cards", "card.png"],
      ["tokens", "tokens/token.png"],
    ]);
  });
});

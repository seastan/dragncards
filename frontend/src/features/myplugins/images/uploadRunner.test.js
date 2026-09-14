import { runUploads } from "./uploadRunner";
import { planQueue } from "./uploadPlan";

// jsdom provides FormData; record what each request carried.
const fieldsOf = (form) => Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, typeof v === "string" ? v : v.name]));

const queue = (n) =>
  planQueue(
    Array.from({ length: n }, (_, i) => ({ file: new File(["x"], `c${i}.png`), relPath: `English/c${i}.png` })),
    "mygame"
  ).items;

const collect = () => {
  const state = {};
  const history = [];
  return {
    state,
    history,
    update: (id, patch) => {
      state[id] = { ...(state[id] || {}), ...patch };
      history.push([id, patch.status]);
    },
  };
};

describe("runUploads", () => {
  it("sends indexed file/path pairs with the profile and root", async () => {
    const items = queue(2);
    const sent = [];
    const { update } = collect();

    await runUploads({
      items,
      profile: "tokens",
      root: "mygame",
      update,
      post: async (form) => {
        sent.push(fieldsOf(form));
        return { results: [0, 1].map((index) => ({ index, status: "ok", path: "p", url: "u" })) };
      },
    });

    expect(sent).toEqual([
      { profile: "tokens", root: "mygame", count: "2", file_0: "c0.png", path_0: "English/c0.png", file_1: "c1.png", path_1: "English/c1.png" },
    ]);
  });

  it("maps per-file results back by index, so one bad file does not sink the batch", async () => {
    const items = queue(3);
    const { state, update } = collect();

    await runUploads({
      items,
      profile: "cards",
      root: "",
      update,
      post: async () => ({
        results: [
          { index: 0, status: "ok", url: "u0", path: "a" },
          { index: 1, status: "error", error: "Unsupported image format." },
          { index: 2, status: "ok", url: "u2", path: "c" },
        ],
      }),
    });

    expect(items.map((i) => state[i.id].status)).toEqual(["done", "error", "done"]);
    expect(state[items[1].id].error).toBe("Unsupported image format.");
    expect(state[items[2].id].url).toBe("u2");
  });

  it("fails every file in a batch when the whole request fails", async () => {
    const items = queue(2);
    const { state, update } = collect();

    await runUploads({
      items,
      profile: "cards",
      root: "",
      update,
      post: async () => {
        throw new Error("507");
      },
      describeError: () => "The server is low on disk space.",
    });

    expect(items.map((i) => state[i.id])).toEqual([
      expect.objectContaining({ status: "error", error: "The server is low on disk space." }),
      expect.objectContaining({ status: "error", error: "The server is low on disk space." }),
    ]);
  });

  it("switches to processing once the upload bytes are all sent", async () => {
    const items = queue(1);
    const { history, update } = collect();

    await runUploads({
      items,
      profile: "cards",
      root: "",
      update,
      post: async (form, onUploadProgress) => {
        onUploadProgress({ loaded: 50, total: 100 });
        onUploadProgress({ loaded: 100, total: 100 });
        return { results: [{ index: 0, status: "ok", url: "u", path: "p" }] };
      },
    });

    expect(history.map(([, status]) => status)).toEqual(["uploading", "uploading", "processing", "done"]);
  });

  it("never runs more batches at once than the concurrency limit", async () => {
    const items = queue(100); // 5 batches of 20
    const { update } = collect();
    let inFlight = 0;
    let peak = 0;

    const batches = await runUploads({
      items,
      profile: "cards",
      root: "",
      update,
      concurrency: 2,
      post: async (form) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        const count = Number(form.get("count"));
        return { results: Array.from({ length: count }, (_, index) => ({ index, status: "ok" })) };
      },
    });

    expect(batches).toBe(5);
    expect(peak).toBe(2);
  });

  it("skips items that were already errors when planned", async () => {
    const items = queue(2);
    items[1].status = "error";
    const posted = [];
    await runUploads({
      items,
      profile: "cards",
      root: "",
      update: () => {},
      post: async (form) => {
        posted.push(form.get("count"));
        return { results: [{ index: 0, status: "ok" }] };
      },
    });
    expect(posted).toEqual(["1"]);
  });
});

import { planBatches, planQueue, summarize, targetPath, MAX_SOURCE_BYTES } from "./uploadPlan";

const pick = (relPath, size = 1000) => ({ file: { name: relPath.split("/").pop(), size }, relPath });

describe("targetPath", () => {
  it("joins the root and rewrites the extension", () => {
    expect(targetPath("mygame", "English/a.png")).toBe("mygame/English/a.webp");
    expect(targetPath("", "a.JPG")).toBe("a.webp");
    expect(targetPath("", "set.01.card.png")).toBe("set.01.card.webp");
  });
});

describe("planQueue", () => {
  it("queues images and reports non-images as skipped", () => {
    const { items, skipped } = planQueue([pick("a.png"), pick("notes.txt"), pick("b.jpeg")], "");
    expect(items.map((i) => i.relPath)).toEqual(["a.png", "b.jpeg"]);
    expect(skipped).toEqual(["notes.txt"]);
  });

  it("silently drops hidden files and anything in a hidden folder", () => {
    const { items, skipped } = planQueue([pick(".DS_Store"), pick("mygame/.git/x.png"), pick("ok.png")], "");
    expect(items.map((i) => i.relPath)).toEqual(["ok.png"]);
    expect(skipped).toEqual([]);
  });

  it("fails an oversized file up front", () => {
    const { items } = planQueue([pick("huge.png", MAX_SOURCE_BYTES + 1)], "");
    expect(items[0].status).toBe("error");
    expect(items[0].error).toMatch(/limit is 20 MB/);
  });

  it("flags two files that would become the same .webp instead of overwriting", () => {
    const { items } = planQueue([pick("English/a.png"), pick("English/a.jpg"), pick("english/A.webp")], "mygame");
    expect(items.map((i) => i.status)).toEqual(["queued", "error", "error"]);
    expect(items[1].error).toMatch(/Would overwrite English\/a.png/);
    expect(items[1].retryable).toBe(false);
    expect(items[0].retryable).toBe(true);
  });

  it("does not treat the same name in different folders as a conflict", () => {
    const { items } = planQueue([pick("English/a.png"), pick("Spanish/a.png")], "");
    expect(items.every((i) => i.status === "queued")).toBe(true);
  });
});

describe("planBatches", () => {
  const items = (sizes) => sizes.map((size, i) => ({ id: i, bytes: size, status: "queued" }));

  it("splits on the file-count limit", () => {
    const batches = planBatches(items(Array(45).fill(10)), 20, 1e9);
    expect(batches.map((b) => b.length)).toEqual([20, 20, 5]);
  });

  it("splits on the byte limit", () => {
    const batches = planBatches(items([30, 30, 30, 30]), 100, 70);
    expect(batches.map((b) => b.length)).toEqual([2, 2]);
  });

  it("gives a single file larger than the byte limit its own batch", () => {
    const batches = planBatches(items([10, 500, 10]), 100, 100);
    expect(batches.map((b) => b.map((i) => i.bytes))).toEqual([[10], [500], [10]]);
  });

  it("only includes queued items", () => {
    const list = [...items([10, 10]), { id: 99, bytes: 10, status: "error" }];
    expect(planBatches(list, 100, 1e9)[0]).toHaveLength(2);
  });
});

describe("summarize", () => {
  it("counts and knows when everything has finished", () => {
    const s = summarize([{ status: "done" }, { status: "error" }, { status: "uploading" }]);
    expect(s).toEqual({ total: 3, done: 1, failed: 1, active: 1, finished: false });
    expect(summarize([{ status: "done" }]).finished).toBe(true);
  });
});

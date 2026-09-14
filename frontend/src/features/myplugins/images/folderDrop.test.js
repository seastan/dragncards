import { captureDroppedEntries, expandDropped, fromFileInput, readAllEntries } from "./folderDrop";

// Fake FileSystemEntry objects that behave like Chrome's, including handing
// directory contents back in pages of at most 100.
const fileEntry = (name) => ({
  isFile: true,
  isDirectory: false,
  name,
  file: (resolve) => resolve({ name, size: 10 }),
});

const dirEntry = (name, children) => ({
  isFile: false,
  isDirectory: true,
  name,
  createReader: () => {
    let offset = 0;
    return {
      readEntries: (resolve) => {
        const page = children.slice(offset, offset + 100);
        offset += page.length;
        resolve(page);
      },
    };
  },
});

describe("readAllEntries", () => {
  it("keeps reading past the 100-entry page limit", async () => {
    const children = Array.from({ length: 250 }, (_, i) => fileEntry(`c${i}.png`));
    const all = await readAllEntries(dirEntry("big", children).createReader());
    expect(all).toHaveLength(250);
  });
});

describe("expandDropped", () => {
  it("preserves nested folder paths", async () => {
    const tree = dirEntry("mygame", [
      dirEntry("English", [fileEntry("a.png"), fileEntry("b.png")]),
      dirEntry("Spanish", [fileEntry("a.png")]),
      fileEntry("cardback.png"),
    ]);

    const out = await expandDropped({ entries: [tree], files: [] });
    expect(out.map((x) => x.relPath).sort()).toEqual([
      "mygame/English/a.png",
      "mygame/English/b.png",
      "mygame/Spanish/a.png",
      "mygame/cardback.png",
    ]);
  });

  it("does not lose files in a folder of more than 100", async () => {
    const children = Array.from({ length: 150 }, (_, i) => fileEntry(`c${i}.png`));
    const out = await expandDropped({ entries: [dirEntry("cards", children)], files: [] });
    expect(out).toHaveLength(150);
  });

  it("handles loose files dropped alongside folders", async () => {
    const out = await expandDropped({
      entries: [fileEntry("loose.png"), dirEntry("d", [fileEntry("x.png")])],
      files: [],
    });
    expect(out.map((x) => x.relPath).sort()).toEqual(["d/x.png", "loose.png"]);
  });
});

describe("captureDroppedEntries", () => {
  it("captures entries synchronously", () => {
    const entry = fileEntry("a.png");
    const dataTransfer = { items: [{ webkitGetAsEntry: () => entry }], files: [] };
    expect(captureDroppedEntries(dataTransfer)).toEqual({ entries: [entry], files: [] });
  });

  it("falls back to plain files when the entries API yields nothing", () => {
    const file = { name: "a.png" };
    const dataTransfer = { items: [{ webkitGetAsEntry: () => null }], files: [file] };
    expect(captureDroppedEntries(dataTransfer)).toEqual({ entries: [], files: [file] });
  });

  it("falls back to plain files without the entries API", () => {
    const file = { name: "a.png" };
    expect(captureDroppedEntries({ items: [{}], files: [file] })).toEqual({ entries: [], files: [file] });
  });
});

describe("fromFileInput", () => {
  it("uses webkitRelativePath from a folder picker, else the name", () => {
    const out = fromFileInput([
      { name: "a.png", webkitRelativePath: "mygame/English/a.png" },
      { name: "b.png", webkitRelativePath: "" },
    ]);
    expect(out.map((x) => x.relPath)).toEqual(["mygame/English/a.png", "b.png"]);
  });
});

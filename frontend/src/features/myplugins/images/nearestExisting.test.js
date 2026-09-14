import { nearestExisting } from "./useImageLibrary";

const dirs = (...paths) => paths.map((path) => ({ path }));

describe("nearestExisting", () => {
  it("keeps a folder that still exists", () => {
    expect(nearestExisting("mygame/English", dirs("", "mygame", "mygame/English"))).toBe("mygame/English");
  });

  it("steps up to the parent when the folder vanished", () => {
    expect(nearestExisting("mygame/English", dirs("", "mygame", "mygame/Spanish"))).toBe("mygame");
  });

  it("steps up several levels", () => {
    expect(nearestExisting("a/b/c/d", dirs("", "a"))).toBe("a");
  });

  it("falls back to the root when nothing survives", () => {
    expect(nearestExisting("mygame/English", dirs(""))).toBe("");
    expect(nearestExisting("mygame/English", [])).toBe("");
  });

  it("leaves the root alone", () => {
    expect(nearestExisting("", [])).toBe("");
  });
});

import { hasSupportedImageExtension } from "./common";

describe("hasSupportedImageExtension", () => {
  it("accepts every format the uploader produces or accepts", () => {
    for (const url of [
      "https://dragncards.com/uploads/u/42/mygame/English/aragorn.webp",
      "https://example.com/card.png",
      "https://example.com/card.jpg",
      "https://example.com/card.jpeg",
      "https://example.com/card.gif",
      "https://example.com/CARD.WEBP",
    ]) {
      expect(hasSupportedImageExtension(url)).toBe(true);
    }
  });

  it("allows a query string, which external hosts often append", () => {
    expect(hasSupportedImageExtension("https://cdn.example.com/a.jpg?v=2")).toBe(true);
  });

  it("rejects anything that is not an image URL", () => {
    for (const url of ["https://example.com/page.html", "https://example.com/card", "", null, undefined]) {
      expect(hasSupportedImageExtension(url)).toBe(false);
    }
  });
});

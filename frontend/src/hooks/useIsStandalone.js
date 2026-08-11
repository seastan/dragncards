import { useEffect, useState } from "react";

// True when the page is running as an installed app (from the home screen)
// rather than inside browser chrome. This is the reliable signal for "the URL
// bar and toolbar are eating the table" — it needs no permission, no service
// worker, and works on every browser that can install a PWA.
//
// manifest.json declares `display: standalone`, so an installed shortcut reports
// standalone; the fullscreen/minimal-ui arms are there so the check keeps
// working if that ever changes. navigator.standalone is iOS Safari's older
// non-standard equivalent, which is still the only signal there.
const STANDALONE_QUERY =
  "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)";

export const detectStandalone = () => {
  if (typeof window === "undefined") return false;
  if (window.navigator?.standalone === true) return true;
  return window.matchMedia?.(STANDALONE_QUERY)?.matches ?? false;
};

export const useIsStandalone = () => {
  const [standalone, setStandalone] = useState(detectStandalone);

  useEffect(() => {
    const mq = window.matchMedia?.(STANDALONE_QUERY);
    if (!mq) return;
    const onChange = () => setStandalone(detectStandalone());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return standalone;
};

// iPadOS 13+ reports itself as a Mac, so the touch-point count is what separates
// an iPad from a desktop Safari. Only used to pick which set of "add to home
// screen" words to show — iOS hides the gesture behind Share, Android behind the
// overflow menu.
export const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
};

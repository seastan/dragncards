import { useEffect, useState } from "react";

// A device whose PRIMARY input is a touch digitizer. Both halves matter:
// `pointer: coarse` on its own also matches TVs and game controllers, and
// `hover: none` on its own matches nothing on desktop — together they describe
// a phone/tablet. The touch-point count rules out the handful of browsers that
// report coarse without an actual digitizer.
const TOUCH_QUERY = "(pointer: coarse) and (hover: none)";

export const detectTouchDevice = () => {
  if (typeof window === "undefined") return false;
  const hasDigitizer = (navigator.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
  if (!hasDigitizer) return false;
  return window.matchMedia?.(TOUCH_QUERY)?.matches ?? false;
};

// Live subscription rather than a one-shot read: convertibles flip the media
// query when the keyboard is folded back, and plugging in a mouse flips it the
// other way.
export const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(detectTouchDevice);

  useEffect(() => {
    const mq = window.matchMedia?.(TOUCH_QUERY);
    if (!mq) return;
    const onChange = () => setIsTouch(detectTouchDevice());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isTouch;
};

import { useEffect, useState } from "react";

// The browser's own "install this app" offer (Chrome / Edge / Samsung Internet
// on Android; never iOS). It arrives once per page load as a
// `beforeinstallprompt` event, usually well before the user reaches the screen
// that wants to offer it, so it is caught at startup (index.tsx) and kept here
// for any component to use.

let deferred = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());

export const captureInstallPrompt = () => {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();   // we show the offer ourselves, when it's useful
    deferred = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
};

// { canInstall, installed, install }: install() shows the browser's dialog and
// resolves to "accepted" / "dismissed" (or null when there is nothing to show).
export const useInstallPrompt = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick(t => t + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  const install = async () => {
    const evt = deferred;
    if (!evt) return null;
    deferred = null;
    notify();
    evt.prompt();
    const choice = await evt.userChoice.catch(() => null);
    return choice?.outcome || null;
  };
  return { canInstall: !!deferred, installed, install };
};

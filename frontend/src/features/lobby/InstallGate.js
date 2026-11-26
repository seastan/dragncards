import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes, faShareSquare, faPlusSquare, faEllipsisV, faMobileAlt, faCompass, faCopy, faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { isIOS } from "../../hooks/useIsStandalone";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";

// Before creating a room from a phone or tablet in the browser (not the
// installed app): a full-screen step asking to install DragnCards first, since
// the browser's address bar and toolbar take space the table needs. It is a
// strong nudge, not a wall — "Continue in browser" always goes on, because
// some browsers can't install at all (iOS ones other than Safari, and the
// built-in browsers of Discord, Messenger and the like).

const CONTINUE_KEY = "dragncards_install_gate_continue";

// Shown when: a touch device, not running installed, and not already waved
// through this browser session.
export const shouldShowInstallGate = (isTouch, isStandalone) => {
  if (!isTouch || isStandalone) return false;
  try { return window.sessionStorage.getItem(CONTINUE_KEY) !== "true"; } catch (e) { return true; }
};
const rememberContinue = () => {
  try { window.sessionStorage.setItem(CONTINUE_KEY, "true"); } catch (e) { /* asks again next time */ }
};

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent || "");
// Apps that open links in their own browser, which can't install web apps.
const isInAppBrowser = () => /FBAN|FBAV|Instagram|Discord|Line\/|Twitter|Snapchat|MicroMessenger|; wv\)/i.test(ua());
// iOS browsers other than Safari: only Safari can add to the home screen.
const isIOSNotSafari = () => isIOS() && /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(ua());

const Step = ({ icon, children }) => (
  <div className="flex items-center gap-3" style={{ padding: "10px 0" }}>
    <div className="flex items-center justify-center flex-shrink-0 rounded-lg"
      style={{ width: 40, height: 40, background: "#374151", color: "#e5e7eb", fontSize: 18 }}>
      <FontAwesomeIcon icon={icon}/>
    </div>
    <div style={{ fontSize: 15, lineHeight: 1.35 }}>{children}</div>
  </div>
);

export const InstallGate = ({ isOpen, onContinue, onClose }) => {
  const { canInstall, installed, install } = useInstallPrompt();
  const [copied, setCopied] = useState(false);
  const [accepted, setAccepted] = useState(false);
  if (!isOpen) return null;

  const done = installed || accepted;
  const inApp = isInAppBrowser();
  const iosOther = isIOSNotSafari();
  const ios = isIOS();

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); } catch (e) { /* no clipboard */ }
  };
  const doInstall = async () => {
    const outcome = await install();
    if (outcome === "accepted") setAccepted(true);
  };
  const goOn = () => { rememberContinue(); onContinue(); };

  let steps;
  if (done) {
    steps = <Step icon={faMobileAlt}>Installed! Open <b>DragnCards</b> from your home screen, then create your room there.</Step>;
  } else if (inApp) {
    steps = <>
      <Step icon={faCompass}>This page is open inside another app, which can't install DragnCards. Open it in your browser (Safari on iPhone, Chrome on Android): use the app's <b>⋯</b> menu, or copy the link.</Step>
      <button type="button" onClick={copyLink}
        className="w-full rounded-lg text-white" style={{ padding: "12px 0", background: "#374151", fontSize: 15, marginTop: 4 }}>
        <FontAwesomeIcon icon={copied ? faCheck : faCopy} style={{ marginRight: 8 }}/>{copied ? "Link copied" : "Copy link"}
      </button>
    </>;
  } else if (ios && iosOther) {
    steps = <Step icon={faCompass}>On iPhone and iPad only <b>Safari</b> can add DragnCards to the home screen. Open this page in Safari, then tap <b>Share</b> and <b>Add to Home Screen</b>.</Step>;
  } else if (ios) {
    steps = <>
      <Step icon={faShareSquare}>Tap <b>Share</b> in Safari's toolbar.</Step>
      <Step icon={faPlusSquare}>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</Step>
      <Step icon={faMobileAlt}>Open <b>DragnCards</b> from your home screen.</Step>
    </>;
  } else if (canInstall) {
    steps = <button type="button" onClick={doInstall}
      className="w-full rounded-lg text-white font-semibold" style={{ padding: "14px 0", background: "#1d4ed8", fontSize: 16 }}>
      Install DragnCards
    </button>;
  } else {
    steps = <>
      <Step icon={faEllipsisV}>Open your browser's <b>⋮</b> menu.</Step>
      <Step icon={faPlusSquare}>Choose <b>Install app</b> (or <b>Add to Home screen</b>).</Step>
      <Step icon={faMobileAlt}>Open <b>DragnCards</b> from your home screen.</Step>
    </>;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 1e6, background: "#111827", color: "white",
        overflowY: "auto", display: "flex", flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)",
      }}>
      <div className="flex justify-end" style={{ padding: 6 }}>
        <button type="button" aria-label="Close" onClick={onClose}
          style={{ width: 44, height: 44, background: "transparent", border: "none", color: "#e5e7eb", fontSize: 20 }}>
          <FontAwesomeIcon icon={faTimes}/>
        </button>
      </div>
      <div style={{ maxWidth: 440, width: "100%", margin: "0 auto", padding: "0 20px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        <img src={process.env.PUBLIC_URL + "/logosvg.svg"} alt="" style={{ width: 64, height: 64, margin: "8px auto 16px" }}/>
        <div className="text-center font-semibold" style={{ fontSize: 22 }}>Install DragnCards to play</div>
        <div className="text-center" style={{ fontSize: 15, color: "#d1d5db", margin: "8px 0 18px", lineHeight: 1.4 }}>
          On a phone the browser's address bar and toolbar take room the table needs. Installed, DragnCards
          opens full screen like an app.
        </div>
        <div>{steps}</div>
        <div style={{ flex: 1 }}/>
        <button type="button" onClick={goOn}
          style={{ marginTop: 24, background: "transparent", border: "none", color: "#9ca3af", fontSize: 14, textDecoration: "underline" }}>
          Continue in browser
        </button>
      </div>
    </div>
  );
};

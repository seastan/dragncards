import React, { useEffect, useRef, useState } from "react";
import Axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setUserSettings } from "../store/playerUiSlice";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { useIsTouchDevice } from "../../hooks/useIsTouchDevice";
import { useIsStandalone, isIOS } from "../../hooks/useIsStandalone";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import useProfile from "../../hooks/useProfile";
import { usePlugin } from "./hooks/usePlugin";
import { Z_INDEX } from "./functions/common";

// Remembering dismissals locally (rather than on the profile) is deliberate: the
// same account gets used from a phone and a desktop, and "no thanks" only ever
// means "not on this device". The two steps are remembered separately — someone
// who wants touch mode but not a home-screen icon shouldn't be asked twice.
const DISMISS_TOUCH_KEY   = "dragncards_touch_mode_prompt_dismissed";
const DISMISS_INSTALL_KEY = "dragncards_install_prompt_dismissed";

const readFlag = (key) => {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch (e) {
    return false; // Private browsing / storage disabled — just show the prompt.
  }
};

const writeFlag = (key) => {
  try {
    window.localStorage.setItem(key, "true");
  } catch (e) { /* nothing we can do, the prompt reappears next session */ }
};

// Shared chrome for both steps.
const PromptBanner = ({ icon, title, body, actions }) => (
  <div
    // Clicks inside must not reach Table's handleTableClick (which clears the
    // active card / dropdown) — harmless here, but it also lets a stray tap near
    // the buttons fall through to the table underneath.
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "fixed",
      left: "50%",
      bottom: "3dvh",
      transform: "translateX(-50%)",
      display: "flex",
      alignItems: "center",
      gap: "1.6dvh",
      maxWidth: "92vw",
      padding: "1.4dvh 1.8dvh",
      borderRadius: "1dvh",
      background: "rgba(22, 22, 28, 0.97)",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 0.4dvh 2.4dvh rgba(0,0,0,0.85)",
      color: "white",
      zIndex: Z_INDEX.Prompts,
      userSelect: "none",
    }}>
    <div style={{ fontSize: "2.6dvh", lineHeight: 1, flexShrink: 0 }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "1.7dvh", fontWeight: 600, marginBottom: "0.2dvh" }}>{title}</div>
      <div style={{ fontSize: "1.4dvh", color: "rgba(255,255,255,0.65)" }}>{body}</div>
    </div>
    <div style={{ display: "flex", gap: "0.8dvh", flexShrink: 0 }}>{actions}</div>
  </div>
);

const btnBase = {
  padding: "0.9dvh 1.6dvh",
  borderRadius: "0.6dvh",
  fontSize: "1.5dvh",
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid transparent",
  whiteSpace: "nowrap",
  touchAction: "manipulation",
};

const secondaryBtn = { ...btnBase, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" };
const primaryBtn   = { ...btnBase, background: "#1d4ed8", border: "1px solid #3b82f6" };

// Two pieces of touch onboarding, shown at most once per device each:
//   1. Touch mode is off on a touchscreen → offer to turn it on.
//   2. Running in browser chrome rather than from the home screen → point out
//      that installing reclaims the space the URL bar and toolbar take up.
// Step 2 is gated on the display-mode check, NOT on "touch mode was just turned
// on": someone who enabled touch mode months ago is exactly the person still
// fighting the navbar, and re-prompting on every toggle would nag everyone else.
export const TouchModePrompt = React.memo(() => {
  const dispatch      = useDispatch();
  const siteL10n      = useSiteL10n();
  const isTouchDevice = useIsTouchDevice();
  const isStandalone  = useIsStandalone();
  const touchMode     = useSelector(state => state?.playerUi?.userSettings?.touchMode);
  const authOptions   = useAuthOptions();
  const user          = useProfile();
  const plugin        = usePlugin();

  const [touchClosed, setTouchClosed]     = useState(() => readFlag(DISMISS_TOUCH_KEY));
  const [installClosed, setInstallClosed] = useState(() => readFlag(DISMISS_INSTALL_KEY));
  // Android/Chrome fires beforeinstallprompt when the app meets its install
  // criteria, which lets us offer a real one-tap install instead of describing
  // where the menu item lives. It never fires on iOS Safari (and won't fire here
  // at all unless a service worker is registered — see index.tsx), so the
  // written instructions remain the path that always works.
  const deferredInstall = useRef(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferredInstall.current = e;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferredInstall.current = null;
      setCanInstall(false);
      setInstallClosed(true);
      writeFlag(DISMISS_INSTALL_KEY);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!isTouchDevice) return null;

  // ── Step 1: turn on touch mode ──────────────────────────────────────────────
  if (!touchMode && !touchClosed) {
    const handleEnable = () => {
      setTouchClosed(true);
      writeFlag(DISMISS_TOUCH_KEY);
      dispatch(setUserSettings({ touchMode: true }));
      // Persist as the user's default for this plugin so it survives a reload.
      // The backend deep-merges, so a partial `ui` object leaves other settings
      // alone. Best-effort: a logged-out user still gets touch mode this session.
      if (plugin?.id && user?.id) {
        Axios.post(
          "/be/api/v1/profile/update_plugin_user_settings",
          { [plugin.id]: { ui: { touchMode: true } } },
          authOptions
        ).catch(() => { /* the local setting is already applied */ });
      }
    };
    const handleDismiss = () => {
      setTouchClosed(true);
      writeFlag(DISMISS_TOUCH_KEY);
    };

    return (
      <PromptBanner
        icon="👆"
        title={siteL10n("touchModePromptTitle")}
        body={siteL10n("touchModePromptBody")}
        actions={<>
          <div onClick={handleDismiss} style={secondaryBtn}>{siteL10n("touchModePromptDismiss")}</div>
          <div onClick={handleEnable} style={primaryBtn}>{siteL10n("touchModePromptEnable")}</div>
        </>}
      />
    );
  }

  // ── Step 2: add to home screen ──────────────────────────────────────────────
  if (!isStandalone && !installClosed) {
    const handleDismiss = () => {
      setInstallClosed(true);
      writeFlag(DISMISS_INSTALL_KEY);
    };
    const handleInstall = async () => {
      const evt = deferredInstall.current;
      if (!evt) return;
      deferredInstall.current = null;
      setCanInstall(false);
      evt.prompt();
      // Either outcome closes the banner: accepted installs, dismissed means
      // they've now seen the OS dialog and don't need the hint repeated.
      await evt.userChoice.catch(() => {});
      handleDismiss();
    };

    return (
      <PromptBanner
        icon="📲"
        title={siteL10n("addToHomeScreenTitle")}
        body={siteL10n(isIOS() ? "addToHomeScreenBodyIos" : "addToHomeScreenBodyAndroid")}
        actions={<>
          <div onClick={handleDismiss} style={secondaryBtn}>{siteL10n("touchModePromptDismiss")}</div>
          {canInstall &&
            <div onClick={handleInstall} style={primaryBtn}>{siteL10n("addToHomeScreenInstall")}</div>}
        </>}
      />
    );
  }

  return null;
});

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMobileUI, setMobileUIChoice, setMobileUIVersion, setUserSettings } from "../../store/playerUiSlice";
import { writeMobileUIPref, writeMobileUIVersion } from "../functions/mobileLayout";
import { useGameDefinition } from "./useGameDefinition";
import { usePlugin } from "./usePlugin";
import useProfile from "../../../hooks/useProfile";

// Mobile UI, a per-device choice with two versions:
//   v1 — touch mode: the regular table with the touch bar (userSettings.touchMode).
//   v2 — the plugin's mobileLayout: the phone-first table (playerUi.mobileUI).
//
// On/off: this device's choice (localStorage). A device that hasn't chosen
// takes "on" from a profile that had touch mode switched on before (the
// setting mobile UI v1 replaced), and keeps it from then on.
// Version: picked by hand on this device, or automatic — v2 when the plugin
// defines a mobileLayout, v1 otherwise. So a touch mode user moves to v2 by
// themselves once their plugin gets a mobile layout, unless they picked v1.

export const resolveMobileUIVersion = (manualVersion, hasLayout) =>
  hasLayout && manualVersion !== "v1" ? "v2" : "v1";

export const useMobileUISettings = () => {
  const gameDef = useGameDefinition();
  const choice = useSelector(state => state?.playerUi?.mobileUIChoice ?? null);
  const manualVersion = useSelector(state => state?.playerUi?.mobileUIVersion ?? null);
  const hasLayout = !!gameDef?.mobileLayout;
  return {
    on: !!choice,
    manualVersion,
    version: resolveMobileUIVersion(manualVersion, hasLayout),
    hasLayout,
  };
};

// Whether the mobile UI v2 table is on (useMobileUISync keeps this in step).
export const useMobileUIEnabled = () => useSelector(state => !!state?.playerUi?.mobileUI);

// Whether the table is actually rendering the v2 mobile UI: switched on AND the
// plugin provides a mobileLayout to render.
export const useMobileUIActive = () => {
  const enabled = useMobileUIEnabled();
  const gameDef = useGameDefinition();
  return enabled && !!gameDef?.mobileLayout;
};

export const useSetMobileUI = () => {
  const dispatch = useDispatch();
  return (value) => {
    writeMobileUIPref(value);
    dispatch(setMobileUIChoice(!!value));
  };
};

export const useSetMobileUIVersion = () => {
  const dispatch = useDispatch();
  return (version) => {
    writeMobileUIVersion(version);
    dispatch(setMobileUIVersion(version));
  };
};

// Mounted once per room (RoomProviders): turns the choices above into the two
// switches the table reads — playerUi.mobileUI for v2, userSettings.touchMode
// for v1 — and re-applies them whenever the profile's settings load over them.
export const useMobileUISync = () => {
  const dispatch = useDispatch();
  const pluginId = usePlugin()?.id;
  const user = useProfile();
  const userSettings = useSelector(state => state?.playerUi?.userSettings);
  const choice = useSelector(state => state?.playerUi?.mobileUIChoice ?? null);
  const { manualVersion, hasLayout } = useMobileUISettings();
  const legacyTouchMode = !!user?.plugin_settings?.[pluginId]?.ui?.touchMode;
  const touchModeNow = !!userSettings?.touchMode;

  useEffect(() => {
    // A device that hasn't chosen adopts a profile that had touch mode on.
    if (choice === null && legacyTouchMode) {
      writeMobileUIPref(true);
      dispatch(setMobileUIChoice(true));
      return;
    }
    const on = !!choice;
    const version = resolveMobileUIVersion(manualVersion, hasLayout);
    dispatch(setMobileUI(on && version === "v2"));
    const wantTouchMode = on && version === "v1";
    if (touchModeNow !== wantTouchMode) {
      dispatch(setUserSettings({ ...(userSettings || {}), touchMode: wantTouchMode }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, legacyTouchMode, manualVersion, hasLayout, touchModeNow, dispatch]);
};

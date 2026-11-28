import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMobileUI, setMobileUIChoice, setUserSettings } from "../../store/playerUiSlice";
import { writeMobileUIPref } from "../functions/mobileLayout";
import { useGameDefinition } from "./useGameDefinition";
import { usePlugin } from "./usePlugin";
import useProfile from "../../../hooks/useProfile";

// Mobile UI: a single per-device setting (localStorage), available when the
// plugin defines a gameDef.mobileLayout. It replaces touch mode, which is now
// always off (the favourite hotkeys panel and the drag-for-favourites ring cover
// what its touch bar did on the regular table); the touch mode code is left in
// place but nothing switches it on.
//
// A device that has never set Mobile UI takes "on" from a profile that had
// touch mode switched on, and keeps that choice from then on — so touch mode
// users land in the mobile UI wherever their game has a mobile layout.

export const useMobileUISettings = () => {
  const gameDef = useGameDefinition();
  const choice = useSelector(state => state?.playerUi?.mobileUIChoice ?? null);
  return { on: !!choice, hasLayout: !!gameDef?.mobileLayout };
};

// Whether the mobile UI table is on (useMobileUISync keeps this in step).
export const useMobileUIEnabled = () => useSelector(state => !!state?.playerUi?.mobileUI);

// Whether the table is actually rendering the mobile UI: switched on AND the
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

// Mounted once per room (RoomProviders): turns this device's choice into the
// switch the table reads (playerUi.mobileUI), and keeps touch mode off, also
// when the profile's settings load with it on.
export const useMobileUISync = () => {
  const dispatch = useDispatch();
  const pluginId = usePlugin()?.id;
  const user = useProfile();
  const userSettings = useSelector(state => state?.playerUi?.userSettings);
  const choice = useSelector(state => state?.playerUi?.mobileUIChoice ?? null);
  const { hasLayout } = useMobileUISettings();
  const legacyTouchMode = !!user?.plugin_settings?.[pluginId]?.ui?.touchMode;
  const touchModeNow = !!userSettings?.touchMode;

  useEffect(() => {
    if (touchModeNow) dispatch(setUserSettings({ ...(userSettings || {}), touchMode: false }));
    // A device that hasn't chosen adopts a profile that had touch mode on.
    if (choice === null && legacyTouchMode) {
      writeMobileUIPref(true);
      dispatch(setMobileUIChoice(true));
      return;
    }
    dispatch(setMobileUI(!!choice && hasLayout));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, legacyTouchMode, hasLayout, touchModeNow, dispatch]);
};

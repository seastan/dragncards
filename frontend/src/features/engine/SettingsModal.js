import React, {useEffect, useState} from "react";
import { useDispatch, useSelector } from 'react-redux';
import ReactModal from "react-modal";
import { setShowModal, setTyping, setUserSettings } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { usePlugin } from "./hooks/usePlugin";
import useProfile from "../../hooks/useProfile";
import Axios from "axios";
import { deepUpdate } from "../store/updateValues";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import Button from "../../components/basic/Button";
import { useDoActionList } from "./hooks/useDoActionList";
import { usePlayerN } from "./hooks/usePlayerN";
import store from "../../store";
import { useIsHost } from "./hooks/useIsHost";

// Move to another file, use this to set the default falues in playerUiSlice
export const uiSettings = {
  "backgroundUrl": {
    "id": "backgroundUrl",
    "label": "backgroundUrl",
    "type": "string",
    "default": "",
    "supporterLevel": 5
  },
  "zoomPercent": {
    "id": "zoomPercent",
    "label": "zoomPercent",
    "type": "integer",
    "default": 100
  },
  "touchMode": {
    "id": "touchMode",
    "label": "touchMode",
    "type": "boolean",
    "default": false
  }
}

export const SettingsModal = React.memo(({}) => {
    const dispatch = useDispatch();

    return(
      <ReactModal
        closeTimeoutMS={200}
        isOpen={true}
        onRequestClose={() => {
          dispatch(setShowModal(null));
          dispatch(setTyping(false));
        }}
        contentLabel={"Load quest"}
        overlayClassName="fixed inset-0 bg-black-50 z-10000"
        className="insert-auto p-5 bg-gray-700 border max-h-lg mx-auto my-2 rounded-lg outline-none"
        style={{
          content: {
            width: "800px",
            maxHeight: "95vh",
            overflowY: "scroll",
          }
        }}>
        <ModalContent/>
      </ReactModal>  
    )
})

const ModalContent = () => {
  const dispatch = useDispatch();
  const doActionList = useDoActionList();
  const user = useProfile();
  const isHost = useIsHost();
  const authOptions = useAuthOptions();
  const plugin = usePlugin();
  const gameDef = useGameDefinition();
  const stateBackgroundUrl = useSelector(state => state?.playerUi?.userSettings?.backgroundUrl);
  const databasePlayerKeyVals = user?.plugin_settings?.[plugin?.id]?.player;
  const databaseGameKeyVals = user?.plugin_settings?.[plugin?.id]?.game;
  const databaseUiKeyVals = user?.plugin_settings?.[plugin?.id]?.ui;
  const gameDefPlayerProperties = gameDef?.playerProperties;
  const gameDefGameProperties = gameDef?.gameProperties;
  const gameDefPreferences = gameDef?.preferences;
  const playerN = usePlayerN();
  const siteL10n = useSiteL10n();
  const gameL10n = useGameL10n();
  const [currentUiKeyVals, setCurrentUiKeyVals] = useState({});
  const [currentPlayerKeyVals, setCurrentPlayerKeyVals] = useState({});
  const [currentGameKeyVals, setCurrentGameKeyVals] = useState({});
  const [onRenderPlayerKeyVals, setOnRenderPlayerKeyVals] = useState({});
  const [onRenderGameKeyVals, setOnRenderGameKeyVals] = useState({});
  const [defaultUiKeyVals, setDefaultUiKeyVals] = useState({});
  const [defaultPlayerKeyVals, setDefaultPlayerKeyVals] = useState({});
  const [defaultGameKeyVals, setDefaultGameKeyVals] = useState({});

  // Filter out keys in the game definition if their value (which is an object) does not have a showInSettings = true property
  const gameDefPlayerSettings = (gameDefPreferences?.player ?? []).reduce((obj, key) => {
    obj[key] = gameDefPlayerProperties[key];
    obj[key].id = key;
    return obj;
  }, {});

  const gameDefGameSettings = (gameDefPreferences?.game ?? []).reduce((obj, key) => {
    obj[key] = gameDefGameProperties[key];
    obj[key].id = key;
    return obj;
  }, {});

  useEffect(() => {
    dispatch(setTyping(true));
    const state = store.getState();
    const statePlayerKeyVals = state?.gameUi?.game?.playerData?.[playerN];
    const stateGameKeyVals = state?.gameUi?.game;
    const stateUiKeyVals = state?.playerUi?.userSettings;

    // Filter out to just the keys that should be displayed in the settings modal
    const settableStatePlayerKeyVals = Object.keys(gameDefPlayerSettings).reduce((obj, key) => {
      obj[key] = statePlayerKeyVals[key];
      return obj;
    }, {});
    
    const settableStateGameKeyVals = Object.keys(gameDefGameSettings).reduce((obj, key) => {
      obj[key] = stateGameKeyVals[key];
      return obj;
    }
    , {});

    const settableStateUiKeyVals = Object.keys(uiSettings).reduce((obj, key) => {
      obj[key] = stateUiKeyVals[key];
      return obj;
    }
    , {});

    setOnRenderPlayerKeyVals(settableStatePlayerKeyVals);
    setOnRenderGameKeyVals(settableStateGameKeyVals);
    // No need to set onRenderUiSettings because we always apply it even if it's unchanged

    setCurrentPlayerKeyVals(settableStatePlayerKeyVals);
    setCurrentGameKeyVals(settableStateGameKeyVals);
    setCurrentUiKeyVals(settableStateUiKeyVals);

    const settableDefaultPlayerKeyVals = Object.keys(gameDefPlayerSettings).reduce((obj, key) => {
      obj[key] = gameDefPlayerSettings[key].default;
      if (databasePlayerKeyVals && databasePlayerKeyVals[key] !== undefined) {
        obj[key] = databasePlayerKeyVals[key];
      }
      return obj;
    }
    , {});

    const settableDefaultGameKeyVals = Object.keys(gameDefGameSettings).reduce((obj, key) => {
      obj[key] = gameDefGameSettings[key].default;
      if (databaseGameKeyVals && databaseGameKeyVals[key] !== undefined) {
        obj[key] = databaseGameKeyVals[key];
      }
      return obj;
    }
    , {});

    const settableDefaultUiKeyVals = Object.keys(uiSettings).reduce((obj, key) => {
      obj[key] = uiSettings[key].default;
      if (databaseUiKeyVals && databaseUiKeyVals[key] !== undefined) {
        obj[key] = databaseUiKeyVals[key];
      }
      return obj;
    }
    , {});

    setDefaultPlayerKeyVals(settableDefaultPlayerKeyVals);
    setDefaultGameKeyVals(settableDefaultGameKeyVals);
    setDefaultUiKeyVals(settableDefaultUiKeyVals);
    
  }, [playerN, stateBackgroundUrl]);

  const handleSave = async () => {
    var url = currentUiKeyVals["background_url"];
    if (url && !(url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg"))) {
      alert(siteL10n("altArtFormatError"))
      return;
    }
    if (url === "") {
      url = null;
    }

    // Update the database
    const newDatabasePluginSettings = {
      [plugin.id]: {
        player: defaultPlayerKeyVals,
        game: defaultGameKeyVals,
        ui: defaultUiKeyVals
      }
    };
    
    // If any settings are being updated, update the database
    const res = await Axios.post("/be/api/v1/profile/update_plugin_user_settings", newDatabasePluginSettings, authOptions);

    const pluginSettings = user.plugin_settings;
    deepUpdate(pluginSettings, newDatabasePluginSettings);
    const newProfileData = {
      user_profile: {
        ...user,
        plugin_settings: pluginSettings
      }}

    user.setData(newProfileData);
    if (res.status !== 200) {
      alert(siteL10n("settingUpdateError")); 
    }
    //user.doFetchHash(Date.now());
    
    // Update the game
    const actionList = [];
    for (const key of Object.keys(currentPlayerKeyVals)) {
      const label = gameDefPlayerProperties[key].label;
      const value = currentPlayerKeyVals[key];
      if (value !== onRenderPlayerKeyVals[key]) {
        actionList.push(["SET", `/playerData/$PLAYER_N/${key}`, value]);
        actionList.push(["LOG", `{{$ALIAS_N}} set their ${label} to ${value}.`]);
      }
    }
    for (const key of Object.keys(currentGameKeyVals)) {
      const label = gameDefGameProperties[key].label;
      const value = currentGameKeyVals[key];
      if (value !== onRenderGameKeyVals[key]) {
        actionList.push(["SET", `/${key}`, value]);
        actionList.push(["LOG", `{{$ALIAS_N}} set the ${label} to ${value}.`]);
      }
    }

    if (actionList.length > 0) {
      doActionList(actionList);
    }

    // Update the UI settings
    dispatch(setUserSettings(currentUiKeyVals));

    // Close the modal
    dispatch(setTyping(false));
    dispatch(setShowModal(null));
  }

  
  const description = (label) => {
    return <div className="text-sm text-gray-300 mb-1">{siteL10n(label)}</div>
  }

  return(
    <div className="text-white">
      <h1 className="mb-1">{siteL10n("uiPreferences")}</h1>
      {description("uiPreferencesDescription")}
      <SettingModalTable settings={uiSettings} currentKeyVals={currentUiKeyVals} defaultKeyVals={defaultUiKeyVals} setCurrentFunction={setCurrentUiKeyVals} setDefaultFunction={setDefaultUiKeyVals} l10n={siteL10n}/>
      <h1 className="mb-1">{siteL10n("playerPreferences")}</h1>
      {description("playerPreferencesDescription")}
      <SettingModalTable settings={gameDefPlayerSettings} currentKeyVals={currentPlayerKeyVals} defaultKeyVals={defaultPlayerKeyVals} setCurrentFunction={setCurrentPlayerKeyVals} setDefaultFunction={setDefaultPlayerKeyVals} l10n={gameL10n}/>
      {isHost && 
        <div>
          <h1 className="mb-1">{siteL10n("gamePreferences")}</h1>
          {description("gamePreferencesDescription")}
          <SettingModalTable settings={gameDefGameSettings} currentKeyVals={currentGameKeyVals} defaultKeyVals={defaultGameKeyVals} setCurrentFunction={setCurrentGameKeyVals} setDefaultFunction={setDefaultGameKeyVals} l10n={gameL10n}/>
        </div>
      }
      <div className="flex items-center justify-between">
        <Button isSubmit isPrimary className="my-2 w-64" onClick={handleSave}>
          Update
        </Button>
      </div>
    </div>
  );
}

const SettingModalTable = React.memo(({settings, currentKeyVals, defaultKeyVals, setCurrentFunction, setDefaultFunction, l10n}) => {
  const baseClassName = "m-2 px-4 py-2 w-1/3";
  return (
    <table className="w-full text-sm mb-2">
      <tbody>
        <tr className="bg-gray-800 text-white">
          <th className={baseClassName}></th>
          <th className={baseClassName}>Current</th>
          <th className={baseClassName}>Default</th>
        </tr>
        {Object.keys(settings).map((propertyId, index) => {
          const settingObj = settings[propertyId];
          const bgColour = index % 2 === 0 ? "bg-gray-500" : "bg-gray-600";
          const className = baseClassName + " " + bgColour;
          return (
            <tr key={propertyId}>
              <td className={className}>
                {l10n(settingObj.label)}
              </td>
              <td className={className}>
                <SettingsModalFormElement val={currentKeyVals[settingObj.id]} settingObj={settingObj} setFunction={setCurrentFunction} l10n={l10n}/>
              </td>
              <td className={className} style={{opacity: "70%"}}>
                <SettingsModalFormElement val={defaultKeyVals[settingObj.id]} settingObj={settingObj} setFunction={setDefaultFunction} l10n={l10n}/>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
})

const SettingsModalFormElement = ({val, settingObj, setFunction, l10n}) => {
  const dispatch = useDispatch();
  const user = useProfile();
  switch (settingObj.type) {
    case 'integer':
      return (
        <input
          type="number"
          className="p-1 w-16 text-black"
          value={val}
          onChange={(e) => {
            const newValue = parseInt(e.target.value);
            setFunction(prevSettings => ({...prevSettings, [settingObj.id]: newValue}))
          }}
        />
      );
    case 'string':
      return (
        (settingObj.supporterLevel > user?.supporter_level && user.admin === false) ?
          <button 
            className="flex items-center justify-center rounded text-white bg-gray-800 hover:bg-gray-700 p-1 px-4"
            onClick={() => {dispatch(setShowModal("patreon"))}}
            >
            <span>Unlock</span>
            <img className="ml-2" style={{height: "20px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg" alt="Patreon logo"/>
          </button>
          :
          <input
            disabled={settingObj.supporterLevel > user?.supporter_level && user.admin === false}
            type="text"
            className="p-1 w-48 text-black"
            value={val}
            onChange={(e) => {
              const newValue = e.target.value;
              setFunction(prevSettings => ({ ...prevSettings, [settingObj.id]: newValue }));
            }}
          />
      );
    case 'option':
      return (
        <select
          className="p-2 w-48 text-black"
          value={val}
          onChange={(e) => {
            const newValue = e.target.value;
            setFunction(prevSettings => ({...prevSettings, [settingObj.id]: newValue}));
          }}
        >
          {settingObj.options.map(option => (
            <option key={option.id} value={option.id}>{l10n(option.label)}</option>
          ))}
        </select>
      );
    case 'boolean':
      return (
        <input
          type="checkbox"
          className="p-1"
          checked={val}
          onChange={(e) => {
            const newValue = e.target.checked;
            setFunction(prevSettings => ({...prevSettings, [settingObj.id]: newValue}))}
          }
        />
      );
    default:
      return null;
  }
};
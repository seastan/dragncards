import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import ReactModal from "react-modal";
import { setShowModal, setTyping } from "../store/playerUiSlice";
import { usePlugin } from "./hooks/usePlugin";
import useProfile from "../../hooks/useProfile";
import Axios from "axios";
import { deepUpdate } from "../store/updateValues";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import Button from "../../components/basic/Button";
import { useDoActionList } from "./hooks/useDoActionList";
import store from "../../store";
import { Z_INDEX } from "./functions/common";

export const ToggleSwitch = ({ checked, onChange }) => {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none"
        style={{ backgroundColor: checked ? "#22c55e" : "#ef4444" }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200"
          style={{ transform: checked ? "translateX(1.375rem)" : "translateX(0.25rem)" }}
        />
      </button>
    </div>
  );
};

export const AutomationModal = React.memo(() => {
  const dispatch = useDispatch();

  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={true}
      onRequestClose={() => {
        dispatch(setShowModal(null));
        dispatch(setTyping(false));
      }}
      contentLabel={"Automation Preferences"}
      overlayClassName="fixed inset-0 bg-black-50"
      className="insert-auto p-5 bg-gray-700 border max-h-lg mx-auto my-2 rounded-lg outline-none"
      style={{
        overlay: {
          zIndex: Z_INDEX.Modal,
        },
        content: {
          width: "800px",
          maxHeight: "95dvh",
          overflowY: "scroll",
        },
      }}
    >
      <AutomationModalContent />
    </ReactModal>
  );
});

const AutomationModalContent = () => {
  const dispatch = useDispatch();
  const doActionList = useDoActionList();
  const user = useProfile();
  const authOptions = useAuthOptions();
  const plugin = usePlugin();

  const [currentGameRuleDisabled, setCurrentGameRuleDisabled] = useState({});
  const [defaultGameRuleDisabled, setDefaultGameRuleDisabled] = useState({});
  const [onRenderGameRuleDisabled, setOnRenderGameRuleDisabled] = useState({});

  const [currentCardRuleDisabled, setCurrentCardRuleDisabled] = useState({});
  const [defaultCardRuleDisabled, setDefaultCardRuleDisabled] = useState({});
  const [onRenderCardRuleDisabled, setOnRenderCardRuleDisabled] = useState({});

  const [gameRules, setGameRules] = useState([]);
  const [cardRules, setCardRules] = useState([]);

  useEffect(() => {
    dispatch(setTyping(true));
    const state = store.getState();
    const game = state?.gameUi?.game;
    const ruleById = game?.ruleById || {};
    const cardById = game?.cardById || {};
    const databaseDefaults = user?.plugin_settings?.[plugin?.id]?.automation || {};
    const dbGameRules = databaseDefaults?.gameRules || {};
    const dbCardRules = databaseDefaults?.cardRules || {};

    const gameRulesList = [];
    const cardRulesMap = {}; // keyed by "databaseId::originalRuleId"
    const currentGameDisabled = {};
    const currentCardDisabled = {};
    const defaultGameDisabled = {};
    const defaultCardDisabled = {};

    Object.entries(ruleById).forEach(([ruleId, rule]) => {
      if (rule.category === "game") {
        gameRulesList.push({ id: ruleId, label: rule._comment || ruleId });
        currentGameDisabled[ruleId] = rule.disabled === true;
        defaultGameDisabled[ruleId] = dbGameRules[ruleId] === true;
      } else if (rule.category === "card") {
        const groupKey = `${rule.databaseId}::${rule.originalRuleId}`;
        if (!cardRulesMap[groupKey]) {
          const cardName = cardById[rule.this_id]?.sides?.A?.name || rule.databaseId;
          cardRulesMap[groupKey] = {
            groupKey,
            label: rule._comment || rule.originalRuleId || ruleId,
            cardName,
            databaseId: rule.databaseId,
            originalRuleId: rule.originalRuleId,
            ruleIds: [],
          };
        }
        cardRulesMap[groupKey].ruleIds.push(ruleId);
        // If any instance is not disabled, treat the group as not disabled
        if (!currentCardDisabled.hasOwnProperty(groupKey)) {
          currentCardDisabled[groupKey] = rule.disabled === true;
        } else if (currentCardDisabled[groupKey] && rule.disabled !== true) {
          currentCardDisabled[groupKey] = false;
        }
        const cardDbDefaults = dbCardRules[rule.databaseId] || {};
        defaultCardDisabled[groupKey] = cardDbDefaults[rule.originalRuleId] === true;
      }
    });

    const cardRulesList = Object.values(cardRulesMap);

    setGameRules(gameRulesList);
    setCardRules(cardRulesList);

    setCurrentGameRuleDisabled(currentGameDisabled);
    setOnRenderGameRuleDisabled(currentGameDisabled);
    setDefaultGameRuleDisabled(defaultGameDisabled);

    setCurrentCardRuleDisabled(currentCardDisabled);
    setOnRenderCardRuleDisabled(currentCardDisabled);
    setDefaultCardRuleDisabled(defaultCardDisabled);
  }, []);

  const handleSave = async () => {
    // Build action list for current changes
    const actionList = [];

    // Game rule changes
    for (const rule of gameRules) {
      const ruleId = rule.id;
      if (currentGameRuleDisabled[ruleId] !== onRenderGameRuleDisabled[ruleId]) {
        const disabled = currentGameRuleDisabled[ruleId];
        actionList.push(["SET", `/ruleById/${ruleId}/disabled`, disabled]);
        if (disabled) {
          actionList.push(["LOG", `{{$ALIAS_N}} disabled rule '${rule.label}'.`]);
        } else {
          actionList.push(["LOG", `{{$ALIAS_N}} enabled rule '${rule.label}'.`]);
        }
      }
    }

    // Card rule changes (apply to all instances of the same card type + rule)
    for (const rule of cardRules) {
      const groupKey = rule.groupKey;
      if (currentCardRuleDisabled[groupKey] !== onRenderCardRuleDisabled[groupKey]) {
        const disabled = currentCardRuleDisabled[groupKey];
        for (const ruleId of rule.ruleIds) {
          actionList.push(["SET", `/ruleById/${ruleId}/disabled`, disabled]);
        }
        if (disabled) {
          actionList.push(["LOG", `{{$ALIAS_N}} disabled rule '${rule.label}' for ${rule.cardName}.`]);
        } else {
          actionList.push(["LOG", `{{$ALIAS_N}} enabled rule '${rule.label}' for ${rule.cardName}.`]);
        }
      }
    }

    if (actionList.length > 0) {
      doActionList(actionList, "Updated automation preferences");
    }

    // Build defaults for database save
    const newGameRuleDefaults = {};
    for (const rule of gameRules) {
      newGameRuleDefaults[rule.id] = defaultGameRuleDisabled[rule.id] || false;
    }

    const newCardRuleDefaults = {};
    for (const rule of cardRules) {
      if (!newCardRuleDefaults[rule.databaseId]) {
        newCardRuleDefaults[rule.databaseId] = {};
      }
      newCardRuleDefaults[rule.databaseId][rule.originalRuleId] = defaultCardRuleDisabled[rule.groupKey] || false;
    }

    const newDatabasePluginSettings = {
      [plugin.id]: {
        automation: {
          gameRules: newGameRuleDefaults,
          cardRules: newCardRuleDefaults,
        },
      },
    };

    const res = await Axios.post(
      "/be/api/v1/profile/update_plugin_user_settings",
      newDatabasePluginSettings,
      authOptions
    );

    const pluginSettings = user.plugin_settings;
    deepUpdate(pluginSettings, newDatabasePluginSettings);
    const newProfileData = {
      user_profile: {
        ...user,
        plugin_settings: pluginSettings,
      },
    };
    user.setData(newProfileData);

    if (res.status !== 200) {
      alert("Error updating automation settings.");
    }

    dispatch(setTyping(false));
    dispatch(setShowModal(null));
  };

  const baseClassName = "m-2 px-4 py-2 w-1/3";

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-2">
        <h1>Automation Preferences</h1>
        <Button isPrimary
          onClick={() => dispatch(setShowModal("settings"))}
        >
          Back to Settings
        </Button>
      </div>

      <h2 className="mb-1">Game Rules</h2>
      {gameRules.length === 0 ? (
        <div className="text-sm text-gray-300 mb-2">No game rules found.</div>
      ) : (
        <table className="w-full text-sm mb-2">
          <tbody>
            <tr className="bg-gray-800 text-white">
              <th className={baseClassName}>Rule</th>
              <th className={baseClassName}>Enabled (Current)</th>
              <th className={baseClassName}>Enabled (Default)</th>
            </tr>
            {gameRules.map((rule, index) => {
              const bgColour = index % 2 === 0 ? "bg-gray-500" : "bg-gray-550";
              const className = baseClassName + " " + bgColour;
              return (
                <tr key={rule.id}>
                  <td className={className}>{rule.label}</td>
                  <td className={className}>
                    <ToggleSwitch
                      checked={!(currentGameRuleDisabled[rule.id] || false)}
                      onChange={(val) =>
                        setCurrentGameRuleDisabled((prev) => ({
                          ...prev,
                          [rule.id]: !val,
                        }))
                      }
                    />
                  </td>
                  <td className={className} style={{ opacity: "70%" }}>
                    <ToggleSwitch
                      checked={!(defaultGameRuleDisabled[rule.id] || false)}
                      onChange={(val) =>
                        setDefaultGameRuleDisabled((prev) => ({
                          ...prev,
                          [rule.id]: !val,
                        }))
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2 className="mb-1">Card Rules</h2>
      {cardRules.length === 0 ? (
        <div className="text-sm text-gray-300 mb-2">
          No card rules found. Load cards to see card-specific rules.
        </div>
      ) : (
        <table className="w-full text-sm mb-2">
          <tbody>
            <tr className="bg-gray-800 text-white">
              <th className={baseClassName}>Rule</th>
              <th className={baseClassName}>Enabled (Current)</th>
              <th className={baseClassName}>Enabled (Default)</th>
            </tr>
            {cardRules.map((rule, index) => {
              const bgColour = index % 2 === 0 ? "bg-gray-500" : "bg-gray-550";
              const className = baseClassName + " " + bgColour;
              return (
                <tr key={rule.groupKey}>
                  <td className={className}>
                    <span className="font-bold">{rule.cardName}</span>
                    {" - "}
                    {rule.label}
                  </td>
                  <td className={className}>
                    <ToggleSwitch
                      checked={!(currentCardRuleDisabled[rule.groupKey] || false)}
                      onChange={(val) =>
                        setCurrentCardRuleDisabled((prev) => ({
                          ...prev,
                          [rule.groupKey]: !val,
                        }))
                      }
                    />
                  </td>
                  <td className={className} style={{ opacity: "70%" }}>
                    <ToggleSwitch
                      checked={!(defaultCardRuleDisabled[rule.groupKey] || false)}
                      onChange={(val) =>
                        setDefaultCardRuleDisabled((prev) => ({
                          ...prev,
                          [rule.groupKey]: !val,
                        }))
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="flex items-center justify-between">
        <Button isSubmit isPrimary className="my-2 w-64" onClick={handleSave}>
          Update
        </Button>
      </div>
    </div>
  );
};

import React, { useEffect } from "react";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faInfoCircle, faClone } from "@fortawesome/free-solid-svg-icons"; // 👈 added faClone

export const Groups = ({ inputs, setInputs }) => {
  const siteL10n = useSiteL10n();
  const groups = inputs.groups || [];
  const maxPlayers = inputs.maxPlayers || 2;

  const controllerOptions = ["shared", ...Array.from({ length: maxPlayers }, (_, i) => `player${i + 1}`)];

  useEffect(() => {
    if (!inputs.groups || inputs.groups.length === 0) {
      const defaultGroups = [];

      for (let i = 1; i <= maxPlayers; i++) {
        const playerId = `player${i}`;
        defaultGroups.push(
          { groupId: `${playerId}Deck`, label: `Player ${i} Deck`, groupType: "Deck", controller: playerId },
          { groupId: `${playerId}Discard`, label: `Player ${i} Discard`, groupType: "Discard", controller: playerId, correspondingDeck: `${playerId}Deck` },
          { groupId: `${playerId}Hand`, label: `Player ${i} Hand`, groupType: "Hand", controller: playerId },
          { groupId: `${playerId}PlayArea`, label: `Player ${i} Play Area`, groupType: "In Play", controller: playerId }
        );
      }
      defaultGroups.push({ groupId: "sharedSetAside", label: "Set Aside", groupType: "Aside", controller: "shared" });

      setInputs((prev) => ({
        ...prev,
        groups: defaultGroups
      }));
    }
  }, [inputs.groups, setInputs]);

  const addGroup = () => {
    const newGroup = {
      groupId: "",
      label: "",
      groupType: "Deck",
      controller: "player1"
    };
    setInputs((prev) => ({
      ...prev,
      groups: [...(prev.groups || []), newGroup]
    }));
  };

  const removeGroup = (index) => {
    const updatedGroups = [...groups];
    updatedGroups.splice(index, 1);
    setInputs((prev) => ({
      ...prev,
      groups: updatedGroups
    }));
  };

  const updateGroupField = (index, field, value) => {
    const updatedGroups = [...groups];
    updatedGroups[index][field] = value;
    setInputs((prev) => ({
      ...prev,
      groups: updatedGroups
    }));
  };

  // 👇 Add duplicate handler
  const duplicateGroup = (index) => {
    const original = groups[index];
    let newGroup = { ...original };

    const playerMatch = newGroup.groupId.match(/player(\d+)/);
    if (playerMatch) {
      const increment = window.confirm("Increment player number?");
      if (increment) {
        const oldNum = parseInt(playerMatch[1], 10);
        const newNum = oldNum + 1;

        // update groupId
        newGroup.groupId = newGroup.groupId.replace(`player${oldNum}`, `player${newNum}`);
        // update controller
        newGroup.controller = newGroup.controller.replace(`player${oldNum}`, `player${newNum}`);
        // update label
        newGroup.label = newGroup.label.replace(
          new RegExp(`Player ${oldNum}`),
          `Player ${newNum}`
        );
        // update correspondingDeck if it exists
        if (newGroup.correspondingDeck) {
          newGroup.correspondingDeck = newGroup.correspondingDeck.replace(`player${oldNum}`, `player${newNum}`);
        }

      }
    }

    setInputs((prev) => ({
      ...prev,
      groups: [...prev.groups, newGroup],
    }));
  };

  const groupTypes = ["Deck", "Discard", "Hand", "In Play", "Aside"];

  return (
    <div className="w-full max-w-5xl p-6 m-4 bg-gray-800 rounded-lg text-white">
      <h3 className="text-lg font-semibold mb-4">{siteL10n("Groups")}</h3>

      <div className="flex items-start gap-3 p-2 mb-4 bg-blue-900 rounded-lg text-sm text-blue-800">
        <FontAwesomeIcon icon={faInfoCircle} className="text-white" />
        <p className="m-0">
          A <strong>"group"</strong> is a place where you can put cards during the game, such as a deck, a player's hand, a discard pile, or a play area. They can also be places to set cards aside, either onscreen or offscreen. A sample of groups has been created for you based on the number of players you specified, but you can customize these or add your own.
        </p>
      </div>

      <div className="grid grid-cols-[64px_8rem_10rem_8rem_8rem_12rem] gap-4 text-sm text-gray-400 mb-2 px-1">
        <span></span>
        <span>{siteL10n("Group ID")}</span>
        <span>{siteL10n("Label")}</span>
        <span>{siteL10n("Group Type")}</span>
        <span>{siteL10n("Controller")}</span>
        <span>{siteL10n("Corresponding Deck")}</span>
      </div>

      <div className="space-y-2">
        {groups.map((group, index) => (
          <div
            key={index}
            className="grid grid-cols-[64px_8rem_10rem_8rem_8rem_12rem] gap-4 items-center"
          >
            <div className="flex space-x-2">
              <button
                onClick={() => removeGroup(index)}
                className="text-red-400 hover:text-red-600"
                title={siteL10n("Remove group")}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
              <button
                onClick={() => duplicateGroup(index)}
                className="text-green-400 hover:text-green-600"
                title={siteL10n("Duplicate group")}
              >
                <FontAwesomeIcon icon={faClone} />
              </button>
            </div>

            <input
              type="text"
              placeholder={siteL10n("Group ID")}
              value={group.groupId}
              onChange={(e) => updateGroupField(index, "groupId", e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />

            <input
              type="text"
              placeholder={siteL10n("Label")}
              value={group.label}
              onChange={(e) => updateGroupField(index, "label", e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />

            <select
              value={group.groupType}
              onChange={(e) => updateGroupField(index, "groupType", e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              {groupTypes.map((type) => (
                <option key={type} value={type}>{siteL10n(type)}</option>
              ))}
            </select>

            <select
              value={group.controller}
              onChange={(e) => updateGroupField(index, "controller", e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              {controllerOptions.map((ctrl) => (
                <option key={ctrl} value={ctrl}>{siteL10n(ctrl)}</option>
              ))}
            </select>

            <select
              value={group.correspondingDeck || ""}
              onChange={(e) => updateGroupField(index, "correspondingDeck", e.target.value)}
              disabled={group.groupType !== "Discard"}
              className={`px-2 py-1 border rounded text-white text-sm bg-gray-700 border-gray-600 ${
                group.groupType !== "Discard" ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <option value="">{siteL10n("Select a deck")}</option>
              {groups
                .filter((g) => (g.groupId !== group.groupId && g.groupType === "Deck"))
                .map((g, idx) => (
                  <option key={`${g.groupId}-${idx}`} value={g.groupId}>
                    {g.groupId}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={addGroup}
          className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
        >
          <FontAwesomeIcon icon={faPlus} />
          {siteL10n("Add Group")}
        </button>
      </div>
    </div>
  );
};

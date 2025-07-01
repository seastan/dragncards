import React from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";
import { GameProperties } from "./GameProperties";


const defaultAutomation = {
  postNewGameActionList: [
    ["LOG", "A new game was created."]
  ],
  postLoadActionList: [
    ["LOG", "{{$PLAYER_N}} loaded some cards."],
  ],
  gameRules: {},
  cards: {}
};

const defaultClearTableOptions = [
  {"label": "Good guys win", "actionList": ["SET", "/victoryState", "goodGuysWin"]},
  {"label": "Bad guys win", "actionList": ["SET", "/victoryState", "badGuysWin"]},
  {"label": "Tie", "actionList": ["SET", "/victoryState", "tie"]},
  {"label": "Incomplete", "actionList": ["SET", "/victoryState", "incomplete"]}
];

const defaultFunctions = {
  DISCARD: {
    "args": ["$CARD_ID"],
    "code": [
      ["COND",
        ["EQUAL", "$CARD.discardGroupId", null],
        ["LOG", "{{ALIAS_N}} failed to discard {{CARD.currentFace.name}} because it is not associated with a discard pile. Please drag the card instead."],
        ["TRUE"],
        [
          ["LOG", "{{ALIAS_N}} discarded {{CARD.sides.A.name}}."],
          ["MOVE_CARD", "$CARD.id", "$CARD.discardGroupId", 0],
        ]
      ]
    ]
  },
  TOGGLE_ROTATE: {
    args: ["$CARD_ID"],
    code: [
      ["VAR", "$CARD", "$GAME.cardById.$CARD_ID"],
      ["COND",
        ["AND", ["EQUAL", "$CARD.rotation", 90], "$CARD.inPlay"],
        [
          ["LOG", "{{ALIAS_N}} rotated {{CARD.currentFace.name}}."],
          ["SET", "/cardById/$CARD.id/rotation", 0]
        ],
        ["AND", ["EQUAL", "$CARD.rotation", 0], "$CARD.inPlay"],
        [
          ["LOG", "{{ALIAS_N}} straightened {{CARD.currentFace.name}}."],
          ["SET", "/cardById/$CARD.id/rotation", 90]
        ]
      ]
    ]
  },
  FLIP: {
    args: ["$CARD_ID"],
    code: [
      ["VAR", "$CARD", "$GAME.cardById.$CARD_ID"],
      ["COND",
        ["EQUAL", "$CARD.currentSide", "A"],
        [
          ["LOG", "{{ALIAS_N}} flipped {{CARD.currentFace.name}} facedown."],
          ["SET", "/cardById/$CARD.id/currentSide", "B"]
        ],
        ["TRUE"],
        [
          ["SET", "/cardById/$CARD.id/currentSide", "A"],
          ["LOG", "{{ALIAS_N}} flipped {{CARD.currentFace.name}} faceup."]
        ]
      ]
    ]
  },
  DETACH: {
    args: ["$CARD_ID"],
    code: [
      ["VAR", "$CARD", "$GAME.cardById.$CARD_ID"],
      ["COND",
        ["GREATER_THAN", "$CARD.cardIndex", 0],
        [
          ["MOVE_CARD", "$CARD.id", "$CARD.groupId", ["ADD", "$CARD.stackIndex", 1]],
          ["LOG", "{{ALIAS_N}} detached {{CARD.currentFace.name}}."],
        ]
      ]
    ]
  },
  SHUFFLE_INTO_DECK: {
    args: ["$CARD_ID"],
    code: [
      ["VAR", "$CARD", "$GAME.cardById.$CARD_ID"],
      ["VAR", "$GROUP_ID", "$CARD.deckGroupId"],
      ["COND",
        ["EQUAL", "$GROUP_ID", null],
        ["LOG", "{{ALIAS_N}} failed to shuffle {{CARD.currentFace.name}} into a deck because it is not associated with a deck."],
        ["TRUE"],
        [
          ["MOVE_CARD", "$CARD.id", "$CARD.deckGroupId", 0],
          ["SHUFFLE_GROUP", "$GROUP_ID"],
          ["LOG", "{{ALIAS_N}} shuffled {{CARD.currentFace.name}} into {{GAME.groupById.$GROUP_ID.label}}."]
        ]
      ]
    ]
  },
};

const processBrowse = (inputs) => {
  return {
      "filterPropertySideA": "type",
      "filterValuesSideA": inputs?.cardTypes ? Object.keys(inputs.cardTypes) : [],
      "textPropertiesSideA": ["name"] 
    };
};

const processCardTypes = (inputs) => {
  const tokens = inputs.tokens || {};
  const tokenIds = Object.keys(tokens);
  const cardTypes = inputs.cardTypes || {};
  Object.entries(cardTypes).forEach(([type, properties]) => {
    cardTypes[type] = {
      ...properties,
      tokens: tokenIds
    };
  });

  return cardTypes;
};

const processCardMenu = (inputs) => {
  return {
    moveToGroupIds: inputs?.groups ? Object.keys(inputs.groups) : [],
    options: []
  };
};

function processSpawnGroupId(groupId) {
  return groupId.replace(/^player\d+/, 'playerN');
}

function processLabel(groupId, label) {
  return label.replace(/Player \d+/, 'My');
}

function processSpawnGroup(group) {
  return {
    loadGroupId: processSpawnGroupId(group.groupId),
    label: processLabel(group.groupId, group.label),
  };
}

function processSpawnGroups(inputs) {
  const groups = inputs?.groups || {};
  const seen = new Set();

  const deckGroups = Object.values(groups).filter(group => group.groupType === "deck");

  return deckGroups.reduce((acc, group) => {
    const processed = processSpawnGroup(group);
    const key = processed.loadGroupId;

    if (!seen.has(key)) {
      seen.add(key);
      acc.push(processed);
    }

    return acc;
  }, []);
}

const processDeckbuilder = (inputs) => {
  return {
    // addButtons: [1, 2, ..., inputs.deckbuilder.maxCardQuantity]
    addButtons: Array.from({ length: inputs.deckbuilder?.maxCardQuantity || 3 }, (_, i) => i + 1),
    columns: inputs.deckbuilder?.searchableColumns || [],
    spawnGroups: processSpawnGroups(inputs),
  };
};

const processDeckMenu = () => {
  return {
    subMenus: [
      {
        label: "Sample Decks",
        deckLists: [
          {label: "Sample Deck 1", groupId: "sampleDeck1"},
        ],
      },
      {
        label: "More Sample Decks",
        subMenus: [
          {
            label: "Nested Menu",
            deckLists: [
              {label: "Sample Deck 2", groupId: "sampleDeck2"},
            ],
          }
        ]
      }
    ]
  }
};

const processGroupMenu = (inputs) => {
  return {
    moveToGroupIds: inputs?.groups ? inputs.groups.map(group => group.groupId) : [],
    options: []
  };
};

const processGroupType = (groupType) => {
  switch (groupType) {
    case "Deck":
      return "deck";
    case "Discard":
      return "discard";
    case "Hand":
      return "hand";
    case "In Play":
      return "inPlay";
    case "Aside":
      return "aside";
    default:
      return groupType.toLowerCase();
  }
};

const processGroups = (inputs) => {
  const groups = inputs.groups || {};
  const newGroups = {};

  // First, create the base group objects
  Object.entries(groups).forEach(([_groupIndex, group]) => {
    newGroups[group.groupId] = {
      groupType: processGroupType(group.groupType),
      label: group.label,
      tableLabel: group.label,
      onCardEnter: {
        controller: group.controller,
      },
    };
  });

  // Then, add deck/discard relationships
  Object.entries(groups).forEach(([_groupIndex, group]) => {
    const groupId = group.groupId;
    const groupType = processGroupType(group.groupType);
    if (groupType === "deck") {
      newGroups[groupId].onCardEnter["deckGroupId"] = groupId;
    } else if (groupType === "discard") {
      newGroups[groupId].onCardEnter["discardGroupId"] = groupId;
    }
    if (group.correspondingDeck) {
      newGroups[groupId].onCardEnter["deckGroupId"] = group.correspondingDeck;
      if (newGroups[group.correspondingDeck]) {
        newGroups[group.correspondingDeck].onCardEnter["discardGroupId"] = groupId;
      }
    }
  });

  return newGroups;
};

const processInputsIntoGameDefinition = (inputs) => {
  // Current date in YYYY-MM-DD format
  const currentDate = new Date().toISOString().split("T")[0];

  const gameDefinition = {
    actionLists: {},
    announcements: [`${currentDate}: Plugin created`],
    automation: defaultAutomation,
    browse: processBrowse(inputs),
    cardBacks: inputs.cardBacks || {},
    cardMenu: processCardMenu(inputs),
    cardProperties: inputs.cardProperties || {},
    cardTypes: processCardTypes(inputs),
    clearTableOptions: defaultClearTableOptions,
    deckbuilder: processDeckbuilder(inputs),
    deckMenu: processDeckMenu(),
    defaultActions: [],
    faceProperties: inputs.faceProperties || {},
    functions: defaultFunctions,
    gameProperties: inputs.GameProperties || {},
    groupMenu: processGroupMenu(inputs),
    groups: processGroups(inputs),
    pluginName: inputs.pluginName || "My Game",
    minPlayers: inputs.minPlayers || 2,
    maxPlayers: inputs.maxPlayers || 2,
    backgroundUrl: inputs.backgroundUrl || "",
  };

  return gameDefinition;
};



export const ExportGameDefinition = ({ inputs }) => {
  const siteL10n = useSiteL10n();

  const exportGameDefinition = async () => {
    const zip = new JSZip();

    const gameDefinition = processInputsIntoGameDefinition(inputs);

    Object.entries(gameDefinition).forEach(([key, value]) => {
      const jsonString = JSON.stringify(value, null, 2);
      zip.file(`${key}.json`, jsonString);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${inputs.pluginName}_game_definition_export.zip`);
  };

  return (
    <div className="max-w-3xl p-6 m-4 bg-gray-800 rounded-lg">
      <p className="text-sm text-gray-300 mb-4">
        {siteL10n("Click below to export your game definition. You can then make further modifications to the JSON files if needed. Once you are ready to test it, go to \"My Plugins\" and upload the files along with your TSV card database.")}
      </p>

      <button
        onClick={exportGameDefinition}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
      >
        Export Game Definition as ZIP
      </button>
    </div>

  );
};

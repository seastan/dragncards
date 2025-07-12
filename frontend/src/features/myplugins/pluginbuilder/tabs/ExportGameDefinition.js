import React from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";
import { GameProperties } from "./GameProperties";
import { PlayerProperties } from "./PlayerProperties";


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
          ["LOG", "{{$ALIAS_N}} discarded {{$CARD.sides.A.name}}."],
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
          ["LOG", "{{$ALIAS_N}} rotated {{$CARD.currentFace.name}}."],
          ["SET", "/cardById/$CARD.id/rotation", 0]
        ],
        ["AND", ["EQUAL", "$CARD.rotation", 0], "$CARD.inPlay"],
        [
          ["LOG", "{{$ALIAS_N}} straightened {{$CARD.currentFace.name}}."],
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
          ["LOG", "{{$ALIAS_N}} flipped {{$CARD.currentFace.name}} facedown."],
          ["SET", "/cardById/$CARD.id/currentSide", "B"]
        ],
        ["TRUE"],
        [
          ["SET", "/cardById/$CARD.id/currentSide", "A"],
          ["LOG", "{{$ALIAS_N}} flipped {{$CARD.currentFace.name}} faceup."]
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
          ["LOG", "{{$ALIAS_N}} detached {{$CARD.currentFace.name}}."],
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
        ["LOG", "{{$ALIAS_N}} failed to shuffle {{$CARD.currentFace.name}} into a deck because it is not associated with a deck."],
        ["TRUE"],
        [
          ["MOVE_CARD", "$CARD.id", "$CARD.deckGroupId", 0],
          ["SHUFFLE_GROUP", "$GROUP_ID"],
          ["LOG", "{{$ALIAS_N}} shuffled {{$CARD.currentFace.name}} into {{$GAME.groupById.$GROUP_ID.label}}."]
        ]
      ]
    ]
  },
};

const defaultGroupTypes = {
  deck: {
    canHaveAttachments: false,
    canHaveTokens: false,
    shuffleOnLoad: true,
    onCardEnter: {
      currentSide: "B",
      inPlay: false,
      rotation: 0
    }
  },
  discard: {
    canHaveAttachments: false,
    canHaveTokens: false,
    shuffleOnLoad: false,
    onCardEnter: {
      currentSide: "A",
      inPlay: false,
      rotation: 0
    }
  },
  aside: {
    canHaveAttachments: false,
    canHaveTokens: false,
    shuffleOnLoad: false,
    onCardEnter: {
      currentSide: "A",
      inPlay: false,
      rotation: 0
    }
  },
  hand: {
    canHaveAttachments: false,
    canHaveTokens: false,
    shuffleOnLoad: false,
    onCardEnter: {
      currentSide: "A",
      inPlay: false,
      rotation: 0
    }
  },
  inPlay: {
    canHaveAttachments: true,
    canHaveTokens: true,
    shuffleOnLoad: false,
    onCardEnter: {
      currentSide: "A",
      inPlay: true
    }
  }
};

const defaultGameHotkeys = [
  {"key": "D", "actionList": ["DRAW_CARD"], "label": "Draw a card"}
];
const defaultCardHotkeys = [
  {"key": "A", "actionList": ["TOGGLE_ROTATE", "$ACTIVE_CARD_ID"], "label": "Toggle Rotate"},
  {"key": "F", "actionList": ["FLIP_CARD", "$ACTIVE_CARD_ID"], "label": "Flip Card"},
  {"key": "C", "actionList": ["DETACH", "$ACTIVE_CARD_ID"], "label": "Detach"},
  {"key": "H", "actionList": ["SHUFFLE_INTO_DECK", "$ACTIVE_CARD_ID"], "label": "Shuffle Into Owner's Deck"},
  {"key": "X", "actionList": ["DISCARD_CARD", "$ACTIVE_CARD"], "label": "Discard"}
];

const defaultTopBarCounters = {
  shared: [
    {
      label: "Round",
      imageUrl: "",
      gameProperty: "roundNumber"
    }
  ]
};

const processHotkeys = (inputs) => {
  const gameHotkeys = inputs?.gameHotkeys || defaultGameHotkeys;
  const cardHotkeys = inputs?.cardHotkeys || defaultCardHotkeys;
  const tokenHotkeys = [];

  Object.entries(inputs?.tokens || {}).forEach(([tokenIndex, token]) => {
    tokenHotkeys.push({
      key: `${tokenIndex + 1}`,
      tokenType: token.id,
      label: `icon(${token.imageUrl})`,
    });
  });

  return {
    game: gameHotkeys,
    card: cardHotkeys,
    token: tokenHotkeys
  };
};

const processBrowse = (inputs) => {
  return {
      "filterPropertySideA": "type",
      "filterValuesSideA": inputs?.cardTypes ? Object.keys(inputs.cardTypes) : [],
      "textPropertiesSideA": ["name"] 
    };
};

const processCardTypes = (inputs) => {
  const tokens = inputs.tokens || [];
  const tokenIds = tokens.map(token => token.id);
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
    moveToGroupIds: inputs?.groups ? inputs.groups.map(group => group.groupId) : [],
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

const processDeckbuilderColumns = (inputs) => {
  const searchableColumns = inputs.deckbuilder?.searchableColumns || [];
  return searchableColumns.map(col => ({
    propName: col.propertyId,
    label: col.label
  }));
};

const processDeckbuilder = (inputs) => {
  return {
    // addButtons: [1, 2, ..., inputs.deckbuilder.maxCardQuantity]
    addButtons: Array.from({ length: inputs.deckbuilder?.maxCardQuantity || 3 }, (_, i) => i + 1),
    columns: processDeckbuilderColumns(inputs),
    spawnGroups: processSpawnGroups(inputs),
  };
};

const processDeckMenu = () => {
  return {
    subMenus: [
      {
        label: "Sample Decks",
        deckLists: [
          {label: "Sample Deck 1", deckListId: "sampleDeck1"},
        ],
      },
      {
        label: "More Sample Decks",
        subMenus: [
          {
            label: "Nested Menu",
            deckLists: [
              {label: "Sample Deck 2", deckListId: "sampleDeck2"},
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



const processLayout = (inputs) => {
  const layout = inputs.layout;
  if (!layout) {
    return {};
  }
  const numRows = layout.numRows;
  const rectangles = layout.rectangles;

  const width = layout.canvasWidth;
  const height = layout.canvasHeight;

  const newLayout = {
    cardSize: Math.ceil((1 / numRows) * 100 - 4),
    rowSpacing: 3,
    chat: inputs.chatBox
  };

  const regions = {};
  rectangles.forEach(({ x, y, width: w, height: h, text: groupId, type, direction }) => {
    regions[groupId] = {
      groupId: groupId,
      type: type,
      direction: direction,
      left: `${((x / width) * 100).toFixed(1)}%`,
      top: `${((y / height) * 100).toFixed(1)}%`,
      width: `${((w / width) * 100).toFixed(1)}%`,
      height: `${((h / height) * 100).toFixed(1)}%`
    };
    if (type === "hand") {
      regions[groupId].disableDroppableAttachments = true;
    }
  });

  newLayout.regions = regions;

  newLayout.chat = layout.chatBox;

  return {
    default: newLayout,
  };
};

const processPlayerCountMenu = (inputs) => {
  const minPlayers = inputs.minPlayers;
  const maxPlayers = inputs.maxPlayers;

  const options = [];
  for (let i = minPlayers; i <= maxPlayers; i++) {
    options.push({
      label: `${i}`,
      numPlayers: i,
      layoutId: "default"
    });
  }

  return options;
};

const processPreBuiltDecks = (inputs) => {
  // Select 10 random ids from the inputs.cardDb
  const cardDb = inputs.cardDb || {};
  const cardIds = Object.keys(cardDb);
  const shuffledIds1 = cardIds.sort(() => 0.5 - Math.random()).slice(0, 10);
  const shuffledIds2 = cardIds.sort(() => 0.5 - Math.random()).slice(0, 10);

  // Pick a groupId for the sample deck
  const groupId = inputs.groups[0]?.groupId;

  const sampleDeck1 = {
    label: "Sample Deck 1",
    cards: shuffledIds1.map(id => ({
      databaseId: id,
      quantity: 1,
      loadGroupId: groupId
    }))
  };
  const sampleDeck2 = {
    label: "Sample Deck 2",
    cards: shuffledIds2.map(id => ({
      databaseId: id,
      quantity: 1,
      loadGroupId: groupId
    }))
  };

  return { sampleDeck1, sampleDeck2 };
};

const processSpawnExistingCardModal = (inputs) => {
  const groupIds = [];
  const groups = inputs.groups || {};
  Object.entries(groups).forEach(([_groupIndex, group]) => {
    const groupId = group.groupId;
    if (processGroupType(group.groupType) === "deck" || processGroupType(group.groupType) === "inPlay") {
      groupIds.push(groupId);
    }
  });
  return {
    "columnProperties": ["name", "type"],
    "loadGroupIds": groupIds
  };
};

const processPhases = (inputs) => {
  const phases = inputs.phases || [];
  const processedSteps = processSteps(inputs);
  const numSteps = Object.keys(processedSteps.steps).length;
  const stepHeight = numSteps > 0 ? (100 / numSteps) : 0;
  const newPhases = {};
  const phaseOrder = [];

  phases.forEach((phase) => {
    const phaseId = phase.phaseId;
    const steps = phase.steps || [];
    const numStepsInPhase = steps.length;
    newPhases[phaseId] = {
      label: phase.label || "",
      height: `${(numStepsInPhase > 0 ? (stepHeight * numStepsInPhase) : 0).toFixed(1)}%`,
    };
    phaseOrder.push(phaseId);
  });

  return {
    phases: newPhases,
    phaseOrder
  };
};

const processSteps = (inputs) => {
  const steps = {};
  const stepOrder = [];
  // Loop over phases
  const phases = inputs.phases || [];
  phases.forEach((phase) => {
    const phaseId = phase.phaseId;
    const phaseSteps = phase.steps || [];
    // Loop over steps in each phase
    phaseSteps.forEach((step) => {
      const stepId = step.stepId;
      steps[stepId] = {
        phaseId: phaseId,
        label: step.label || "",
      };
      stepOrder.push(stepId);
    });
  });
  return {
    steps,
    stepOrder
  };
};

const processTokens = (inputs) => {
  const tokens = inputs.tokens || {};
  const newTokens = {};
  Object.entries(tokens).forEach(([tokenIndex, token]) => {
    newTokens[token.id] = {
      label: token.label,
      left: `${token.left}%`,
      top: `${token.top}%`,
      width: `${token.width}vh`,
      height: `${token.height}vh`,
      imageUrl: token.imageUrl,
      canBeNegative: true
    };
  });
  return newTokens;
};

const processProperties = (inputs, propertyType) => {
  const propertiesList = inputs[propertyType] || [];
  const properties = {};
  propertiesList.forEach(prop => {
    if (prop.id) {
      properties[prop.id] = prop;
    }
  });
  return properties;
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
    cardProperties: processProperties(inputs, "cardProperties"),
    cardTypes: processCardTypes(inputs),
    clearTableOptions: defaultClearTableOptions,
    deckbuilder: processDeckbuilder(inputs),
    deckMenu: processDeckMenu(),
    defaultActions: [],
    faceProperties: processProperties(inputs, "faceProperties"),
    functions: defaultFunctions,
    gameProperties: processProperties(inputs, "gameProperties"),
    groupMenu: processGroupMenu(inputs),
    groups: processGroups(inputs),
    groupTypes: defaultGroupTypes,
    hotkeys: processHotkeys(inputs),
    imageUrlPrefix: {},
    labels: {},
    layouts: processLayout(inputs),
    phases: processPhases(inputs).phases,
    phaseOrder: processPhases(inputs).phaseOrder,
    playerCountMenu: processPlayerCountMenu(inputs),
    playerProperties: processProperties(inputs, "playerProperties"),
    pluginMenu: {},
    preBuiltDecks: processPreBuiltDecks(inputs),
    preferences: {},
    prompts: {},
    spawnExistingCardModal: processSpawnExistingCardModal(inputs),
    stepReminderRegex: [],
    steps: processSteps(inputs).steps,
    stepOrder: processSteps(inputs).stepOrder,
    tokens: processTokens(inputs),
    topBarCounters: defaultTopBarCounters,
    touchBar: [],
    pluginName: inputs.pluginName || "My Game",
    backgroundUrl: inputs.backgroundUrl || "",
  };

  return gameDefinition;
};



export const ExportGameDefinition = ({ inputs }) => {
  const siteL10n = useSiteL10n();
  console.log("inputs in ExportGameDefinition:", inputs);

  const exportGameDefinition = async () => {
    const zip = new JSZip();

    const gameDefinition = processInputsIntoGameDefinition(inputs);

    Object.entries(gameDefinition).forEach(([key, value]) => {
      const jsonString = JSON.stringify({[key]: value}, null, 2);
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

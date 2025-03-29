//export const CARDSCALE = 3.;
export const CARDSCALE = 52;

export const CYCLEORDER = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "0A", "0B", "0C", "00", "99", "A1", "A2", "PT"];

export const CYCLEINFO = {
  "0A": {name: "The Hobbit"},
  "0B": {name: "The Lord of the Rings Standalone"},
  "0C": {name: "The Lord of the Rings Campaign"},
  "00": {name: "Two-Player Limited-Edition Starter"},
  "01": {name: "Core Set & Shadows of Mirkwood"},
  "02": {name: "Khazad-dûm & Dwarrowdelf"},
  "03": {name: "Heirs of Númenor & Against the Shadow"},
  "04": {name: "The Voice of Isengard & The Ringmaker"},
  "05": {name: "The Lost Realm & Angmar Awakened"},
  "06": {name: "The Grey Havens & The Dreamchaser"},
  "07": {name: "The Sands of Harad & The Haradrim"},
  "08": {name: "The Wilds of Rhovanion & Ered Mithrin"},
  "09": {name: "A Shadow in the East & Vengenace of Mordor"},
  "99": {name: "Print on Demand"},
  "A1": {name: "ALeP - Children of Eorl & Oaths of the Rohirrim"},
  "A2": {name: "ALeP - The Shire's Reckoning & The Fell Summer"},
  "PT": {name: "ALeP - Playtest"},
}

export const GROUPSINFO = {
    "sharedEncounterDeck": {name: "Encounter Deck", tablename: "Encounter"},
    "sharedEncounterDiscard": {name: "Encounter Discard", tablename: "Discard"},
    "sharedQuestDeck": {name: "Quest Deck", tablename: "Quest Deck"},
    "sharedQuestDiscard": {name: "Quest Discard", tablename: "Quest Discard"},
    "sharedQuestDeck2": {name: "Second Quest Deck", tablename: "Quest Deck 2"},
    "sharedQuestDiscard2": {name: "Second Quest Discard", tablename: "Quest Discard 2"},
    "sharedEncounterDeck2": {name: "Second Encounter Deck", tablename: "Encounter Deck 2"},
    "sharedEncounterDiscard2": {name: "Second Encounter Discard", tablename: "Encounter Discard 2"},
    "sharedEncounterDeck3": {name: "Third Encounter Deck", tablename: "Encounter Deck 3"},
    "sharedEncounterDiscard3": {name: "Third Encounter Discard", tablename: "Encounter Discard 3"},
    "sharedOther": {name: "Other", tablename: "Other"},
    "sharedSetAside": {name: "Set Aside", tablename: "Set Aside"},
    "sharedVictory": {name: "Victory Display", tablename: "Victory Display"},
    "sharedStaging": {name: "Staging Area", tablename: "Staging"},
    "sharedActive": {name: "Active Location", tablename: "Active"},
    "sharedMainQuest": {name: "Main Quest", tablename: "Main Quest"},
    "sharedExtra1": {name: "Extra 1", tablename: "Extra 1"},
    "sharedExtra2": {name: "Extra 2", tablename: "Extra 2"},
    "sharedExtra3": {name: "Extra 3", tablename: "Extra 3"},
    "sharedExtra4": {name: "Extra 4", tablename: "Extra 4"},
    "player1Hand": {name: "Player 1 Hand", tablename: "Hand"},
    "player1Deck": {name: "Player 1 Deck", tablename: "Deck"},
    "player1Discard": {name: "Player 1 Discard", tablename: "Discard"},
    "player1Sideboard": {name: "Player 1 Sideboard", tablename: "Player 1 Sideboard"},
    "player1Deck2": {name: "Player 1 Deck 2", tablename: "Player 1 Deck 2"},
    "player1Play1": {name: "Player 1 Play Area 1", tablename: "Play Area"},
    "player1Play2": {name: "Player 1 Play Area 2", tablename: "Play Area"},
    "player1Play3": {name: "Player 1 Play Area 3", tablename: "Play Area"},
    "player1Play4": {name: "Player 1 Play Area 4", tablename: "Play Area"},
    "player1Engaged": {name: "Player 1 Engaged Area", tablename: "Engaged"},
    "player1Event": {name: "Player 1 Current Event", tablename: "Event"},
    "player2Hand": {name: "Player 2 Hand", tablename: "Hand"},
    "player2Deck": {name: "Player 2 Deck", tablename: "Deck"},
    "player2Discard": {name: "Player 2 Discard", tablename: "Discard"},
    "player2Sideboard": {name: "Player 2 Sideboard", tablename: "Player 2 Sideboard"},
    "player2Deck2": {name: "Player 2 Deck 2", tablename: "Player 2 Deck 2"},
    "player2Play1": {name: "Player 2 Play Area 1", tablename: "Play Area"},
    "player2Play2": {name: "Player 2 Play Area 2", tablename: "Play Area"},
    "player2Play3": {name: "Player 2 Play Area 3", tablename: "Play Area"},
    "player2Play4": {name: "Player 2 Play Area 4", tablename: "Play Area"},
    "player2Engaged": {name: "Player 2 Engaged Area", tablename: "Engaged"},
    "player2Event": {name: "Player 2 Current Event", tablename: "Event"},
    "player3Hand": {name: "Player 3 Hand", tablename: "Hand"},
    "player3Deck": {name: "Player 3 Deck", tablename: "Deck"},
    "player3Discard": {name: "Player 3 Discard", tablename: "Discard"},
    "player3Sideboard": {name: "Player 3 Sideboard", tablename: "Player 3 Sideboard"},
    "player3Deck2": {name: "Player 3 Deck 2", tablename: "Player 3 Deck 2"},
    "player3Play1": {name: "Player 3 Play Area 1", tablename: "Play Area"},
    "player3Play2": {name: "Player 3 Play Area 2", tablename: "Play Area"},
    "player3Play3": {name: "Player 3 Play Area 3", tablename: "Play Area"},
    "player3Play4": {name: "Player 3 Play Area 4", tablename: "Play Area"},
    "player3Engaged": {name: "Player 3 Engaged Area", tablename: "Engaged"},
    "player3Event": {name: "Player 3 Current Event", tablename: "Event"},
    "player4Hand": {name: "Player 4 Hand", tablename: "Hand"},
    "player4Deck": {name: "Player 4 Deck", tablename: "Deck"},
    "player4Discard": {name: "Player 4 Discard", tablename: "Discard"},
    "player4Sideboard": {name: "Player 4 Sideboard", tablename: "Player 4 Sideboard"},
    "player4Deck2": {name: "Player 4 Deck 2", tablename: "Player 4 Deck 2"},
    "player4Play1": {name: "Player 4 Play Area 1", tablename: "Play Area"},
    "player4Play2": {name: "Player 4 Play Area 2", tablename: "Play Area"},
    "player4Play3": {name: "Player 4 Play Area 3", tablename: "Play Area"},
    "player4Play4": {name: "Player 4 Play Area 4", tablename: "Play Area"},
    "player4Engaged": {name: "Player 4 Engaged Area", tablename: "Engaged"},
    "player4Event": {name: "Player 4 Current Event", tablename: "Event"}
}


export const stepIdToText = (stepId) => {
  for (var phase of PHASEINFO) {
    for (var step of phase.steps) {
      if (step.id === stepId) return step.text;
    }
  }
  return "";
}

export const TOOLTIPINFO = {
  "tooltipMotK": "You will need to search your deck to locate your MotK hero.",
  "tooltipEncounter2": "This quest has cards in a second encounter deck located in the View > Shared menu.",
  "tooltipQuest2": "This quest has cards in a second quest deck located in the View > Shared menu.",
  "tooltipAdvancedSetup": "To aid with the setup of this quest, see Menu > Special Functions.",
}

export const PHASEINFO = [
  {
    "name" : "Beginning",
    "label" : "α",
    "height" : "4%",
    "steps" : [
      {"id": "0.0", "text": "0.0: Beginning of the round"},
    ]
  },
  {
    "name" : "Resource",
    "label" : "Resource",
    "height" : "11%",
    "steps" : [
      {"id": "1.1", "text": "1.1: Beginning of the Resource phase"},
      {"id": "1.R", "text": "1.2 & 1.3: Gain resources and draw cards - <u>then player actions</u>", "actions": true},
      {"id": "1.4", "text": "1.4: End of the Resource phase"},  
    ]
  },
  {
    "name" : "Planning",
    "label" : "Planning",
    "height" : "11%",
    "steps" : [
      {"id": "2.1", "text": "2.1: Beginning of the Planning phase"},
      {"id": "2.P", "text": "2.2 & 2.3: Play cards in turn order - <u>player actions throughout</u>", "actions": true},
      {"id": "2.4", "text": "2.4: End of the Planning phase"},
    ]
  },
  {
    "name" : "Quest",
    "label" : "Quest",
    "height" : "17%",
    "steps" : [
      {"id": "3.1", "text": "3.1: Beginning of the Quest phase - <u>then player actions</u>", "actions": true},
      {"id": "3.2", "text": "3.2: Commit characters to the quest - <u>then player actions</u>", "actions": true},
      {"id": "3.3", "text": "3.3: Staging - <u>then player actions</u>", "actions": true},
      {"id": "3.4", "text": "3.4: Quest resolution - <u>then player actions</u>", "actions": true},
      {"id": "3.5", "text": "3.5: End of the Quest phase"},
    ]
  },
  {
    "name" : "Travel",
    "label" : "Travel",
    "height" : "11%",
    "steps" : [
      {"id": "4.1", "text": "4.1: Beginning of the Travel phase"},
      {"id": "4.2", "text": "4.2: Travel opportunity - <u>then player actions</u>", "actions": true},
      {"id": "4.3", "text": "4.3: End of the Travel phase"},
    ]
  },
  {
    "name" : "Encounter",
    "label" : "Encounter",
    "height" : "14%",
    "steps" : [
      {"id": "5.1", "text": "5.1: Beginning of the Encounter phase"},
      {"id": "5.2", "text": "5.2: Optional engagement - <u>then player actions</u>", "actions": true},
      {"id": "5.3", "text": "5.3: Engagement checks - <u>then player actions</u>", "actions": true},
      {"id": "5.4", "text": "5.4: End of the Encounter phase"},
    ]
  },
  {
    "name" : "Combat",
    "label" : "Combat",
    "height" : "17%",
    "steps" : [
      {"id": "6.1", "text": "6.1: Beginning of the Combat phase"},
      {"id": "6.2", "text": "6.2: Deal shadow cards"},
      {"id": "6.E", "text": "6.3-6.6: Enemy attacks - <u>player actions after each combat substep</u>", "actions": true},
      {"id": "6.P", "text": "6.7-6.10: Player attacks - <u>player actions after each combat substep</u>", "actions": true},
      {"id": "6.11", "text": "6.11: End of the Combat phase"},
    ]
  },
  {
    "name" : "Refresh",
    "label" : "Refresh",
    "height" : "11%",
    "steps" : [
      {"id": "7.1", "text": "7.1: Beginning of the Refresh phase"},
      {"id": "7.R", "text": "7.2-7.4: Ready cards, raise threat, pass P1 token - <u>then player actions</u>", "actions": true},
      {"id": "7.5", "text": "7.5: End of the Refresh phase"},
    ]
  },
  {
    "name" : "End",
    "label" : "Ω",
    "height" : "4%",
    "steps" : [
      {"id": "0.1", "text": "0.1: End of the round"},
    ]
  }
]

export const nextRoundStep = (stepId) => {
  var stepFound = false;
  for (var phase of PHASEINFO) {
    const steps = phase.steps;
    for (var step of steps) {
      if (stepFound) return {stepId: step.id, phase: phase.name};
      if (step.id == stepId) stepFound = true;
    }
  }
  return null;
}

export const prevRoundStep = (stepId) => {
  var prev = null;
  for (var phase of PHASEINFO) {
    const steps = phase.steps;
    for (var step of steps) {
      if (step.id == stepId) return prev;
      prev = {stepId: step.id, phase: phase.name};
    }
  }
  return null;
}

export const nextPhase = (currPhase) => {
  var phaseFound = false;
  for (var phase of PHASEINFO) {
    const steps = phase.steps;
    for (var step of steps) {
      if (phaseFound && phase.name !== currPhase) return {stepId: step.id, phase: phase.name};
      if (phase.name == currPhase) phaseFound = true;
    }
  }
  return null;
}

export const prevPhase = (currPhase) => {
  var prev = null;
  for (var phase of PHASEINFO) {
    const steps = phase.steps;
    for (var step of steps) {
      if (phase.name === currPhase) return prev;
      if (prev?.phase !== phase.name ) prev = {stepId: step.id, phase: phase.name};
    }
  }
  return null;
}

export const playerNum = (playerN) => {
  switch(playerN) {
    case 'player1':
      return 1;
    case 'player2':
      return 2;
    case 'player3':
      return 3;
    case 'player4':
      return 4;
  }
  return null;
} 

export const sectionToLoadGroupId = (section, playerN) => {
  switch(section) {
    case 'Hero':
      return playerN+'Play1';
    case 'Ally':
      return playerN+'Deck';
    case 'Attachment':
      return playerN+'Deck';
    case 'Event':
      return playerN+'Deck';
    case 'Side Quest':
      return playerN+'Deck';
    case 'Sideboard':
      return playerN+'Sideboard';
    case 'Quest':
      return 'sharedQuestDeck';
    case 'Encounter':
      return 'sharedEncounterDeck';
    case 'Special':
      return 'sharedEncounterDeck2';
    case 'Second Special':
      return 'sharedEncounterDeck3';
    case 'Setup':
      return 'sharedSetAside';
    case 'Staging Setup':
      return 'sharedStaging';
    case 'Active Setup':
      return 'sharedActive';
    case 'Second Quest Deck':
      return 'sharedQuestDeck2';
  }
  return 'sharedOther';
}

export const sectionToDeckGroupId = (section, playerN) => {
  switch(section) {
    case 'Hero':
      return playerN+'Deck';
    case 'Ally':
      return playerN+'Deck';
    case 'Attachment':
      return playerN+'Deck';
    case 'Event':
      return playerN+'Deck';
    case 'Side Quest':
      return playerN+'Deck';
    case 'Sideboard':
      return playerN+'Deck';
    case 'Quest':
      return 'sharedQuestDeck';
    case 'Encounter':
      return 'sharedEncounterDeck';
    case 'Special':
      return 'sharedEncounterDeck2';
    case 'Second Special':
      return 'sharedEncounterDeck3';
    case 'Setup':
      return 'sharedEncounterDeck';
    case 'Staging Setup':
      return 'sharedEncounterDeck';
    case 'Active Setup':
      return 'sharedEncounterDeck';
    case 'Second Quest Deck':
      return 'sharedQuestDeck2';
  }
  return 'sharedOther';
}

export const sectionToDiscardGroupId = (section, playerN) => {
  switch(section) {
    case 'Hero':
      return playerN+'Discard';
    case 'Ally':
      return playerN+'Discard';
    case 'Attachment':
      return playerN+'Discard';
    case 'Event':
      return playerN+'Discard';
    case 'Side Quest':
      return playerN+'Discard';
    case 'Sideboard':
      return playerN+'Discard';
    case 'Quest':
      return 'sharedQuestDiscard';
    case 'Encounter':
      return 'sharedEncounterDiscard';
    case 'Special':
      return 'sharedEncounterDiscard2';
    case 'Second Special':
      return 'sharedEncounterDiscard3';
    case 'Setup':
      return 'sharedEncounterDiscard';
    case 'Staging Setup':
      return 'sharedEncounterDiscard';
    case 'Active Setup':
      return 'sharedEncounterDiscard';
    case 'Second Quest Deck':
      return 'sharedQuestDiscard2';
  }
  return 'sharedOther';
}

export const LAYOUTINFO = {
  "layout1standard": [
    {
      regions: [
        {id: "sharedMainQuest", width: "12%"},
        {id: "sharedActive", width: "11%"},
        {id: "sharedStaging", width: "58%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "9.5%"},
        {id: "sharedEncounterDiscard", width: "9.5%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "100%"},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "100%"},
      ]
    },
    {
      regions: [
        {id: "player1Play2", width: "89%"},
        {id: "player1Event", width: "11%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "56%", style: "shaded"},
        {id: "Deck", width: "9.5%", style: "shaded"},
        {id: "Discard", width: "9.5%", style: "shaded"},
      ]
    },
  ],
  "layout1extra": [
    {
      regions: [
        {id: "sharedMainQuest", width: "12%"},
        {id: "sharedActive", width: "11%"},
        {id: "sharedStaging", width: "58%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "9.5%"},
        {id: "sharedEncounterDiscard", width: "9.5%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "65%"},
        {id: "sharedExtra1", width: "35%"},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "65%"},
        {id: "sharedExtra2", width: "35%"},
      ]
    },
    {
      regions: [
        {id: "player1Play2", width: "55%"},
        {id: "player1Event", width: "10%"},
        {id: "sharedExtra3", width: "35%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "56%", style: "shaded"},
        {id: "Deck", width: "9.5%", style: "shaded"},
        {id: "Discard", width: "9.5%", style: "shaded"},
      ]
    },
  ],
  "layout1extra4": [
    {
      regions: [
        {id: "sharedMainQuest", width: "12%"},
        {id: "sharedActive", width: "11%"},
        {id: "sharedStaging", width: "58%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "9.5%"},
        {id: "sharedEncounterDiscard", width: "9.5%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "65%"},
        {id: "sharedExtra1", width: "35%"},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "65%"},
        {id: "sharedExtra2", width: "35%"},
      ]
    },
    {
      regions: [
        {id: "player1Play2", width: "65%"},
        {id: "sharedExtra3", width: "35%"},
      ]
    },
    {
      regions: [
        {id: "player1Play3", width: "55%"},
        {id: "player1Event", width: "10%"},
        {id: "sharedExtra4", width: "35%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "56%", style: "shaded"},
        {id: "Deck", width: "9.5%", style: "shaded"},
        {id: "Discard", width: "9.5%", style: "shaded"},
      ]
    },
  ],
  "layout2standard": [
    {
      regions: [
        {id: "sharedMainQuest", width: "9%"},
        {id: "sharedActive", width: "8%"},
        {id: "sharedStaging", width: "67%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "8%"},
        {id: "sharedEncounterDiscard", width: "8%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "50%"},
        {id: "player2Engaged", width: "50%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "50%"},
        {id: "player2Play1", width: "50%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play2", width: "50%"},
        {id: "player2Play2", width: "50%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play3", width: "42%"},
        {id: "player1Event", width: "8%"},
        {id: "player2Play3", width: "42%", hideTitle: true},
        {id: "player2Event", width: "8%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "59%", style: "shaded"},
        {id: "Deck", width: "8%", style: "shaded"},
        {id: "Discard", width: "8%", style: "shaded"},
      ]
    },
  ],
  "layout2extra": [
    {
      regions: [
        {id: "sharedMainQuest", width: "9%"},
        {id: "sharedActive", width: "8%"},
        {id: "sharedStaging", width: "67%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "8%"},
        {id: "sharedEncounterDiscard", width: "8%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "37%"},
        {id: "player2Engaged", width: "36%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "37%"},
        {id: "player2Play1", width: "36%"},
        {id: "sharedExtra1", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "player1Play2", width: "37%"},
        {id: "player2Play2", width: "36%"},
        {id: "sharedExtra2", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "player1Play3", width: "29%"},
        {id: "player1Event", width: "8%"},
        {id: "player2Play3", width: "28%"},
        {id: "player2Event", width: "8%"},
        {id: "sharedExtra3", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "59%", style: "shaded"},
        {id: "Deck", width: "8%", style: "shaded"},
        {id: "Discard", width: "8%", style: "shaded"},
      ]
    },
  ],
  "layout2extra4": [
    {
      regions: [
        {id: "sharedMainQuest", width: "9%"},
        {id: "sharedActive", width: "8%"},
        {id: "sharedStaging", width: "67%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "8%"},
        {id: "sharedEncounterDiscard", width: "8%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "37%"},
        {id: "player2Engaged", width: "36%", hideTitle: true},
        {id: "sharedExtra1", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "37%"},
        {id: "player2Play1", width: "36%"},
        {id: "sharedExtra2", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "player1Play2", width: "37%"},
        {id: "player2Play2", width: "36%"},
        {id: "sharedExtra3", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "player1Play3", width: "29%"},
        {id: "player1Event", width: "8%"},
        {id: "player2Play3", width: "28%"},
        {id: "player2Event", width: "8%"},
        {id: "sharedExtra4", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "59%", style: "shaded"},
        {id: "Deck", width: "8%", style: "shaded"},
        {id: "Discard", width: "8%", style: "shaded"},
      ]
    },
  ],
  "layout3standard": [
    {
      regions: [
        {id: "sharedMainQuest", width: "9%"},
        {id: "sharedActive", width: "8%"},
        {id: "sharedStaging", width: "67%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "8%"},
        {id: "sharedEncounterDiscard", width: "8%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "34%"},
        {id: "player2Engaged", width: "33%", hideTitle: true},
        {id: "player3Engaged", width: "33%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "34%"},
        {id: "player2Play1", width: "33%", hideTitle: true},
        {id: "player3Play1", width: "33%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play2", width: "34%"},
        {id: "player2Play2", width: "33%", hideTitle: true},
        {id: "player3Play2", width: "33%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play3", width: "26%"},
        {id: "player1Event", width: "8%"},
        {id: "player2Play3", width: "25%", hideTitle: true},
        {id: "player2Event", width: "8%"},
        {id: "player3Play3", width: "25%", hideTitle: true},
        {id: "player3Event", width: "8%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "59%", style: "shaded"},
        {id: "Deck", width: "8%", style: "shaded"},
        {id: "Discard", width: "8%", style: "shaded"},
      ]
    },
  ],
  "layout3extra": [
    {
      regions: [
        {id: "sharedMainQuest", width: "9%"},
        {id: "sharedActive", width: "8%"},
        {id: "sharedStaging", width: "67%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "8%"},
        {id: "sharedEncounterDiscard", width: "8%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "34%"},
        {id: "player2Engaged", width: "33%", hideTitle: true},
        {id: "player3Engaged", width: "33%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "65%"},
        {id: "player1Event", width: "8%"},
        {id: "sharedExtra1", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "player2Play1", width: "65%"},
        {id: "player2Event", width: "8%"},
        {id: "sharedExtra2", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "player3Play1", width: "65%"},
        {id: "player3Event", width: "8%"},
        {id: "sharedExtra3", width: "27%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "59%", style: "shaded"},
        {id: "Deck", width: "8%", style: "shaded"},
        {id: "Discard", width: "8%", style: "shaded"},
      ]
    },
  ],
  "layout3extra4": [
    {
      regions: [
        {id: "sharedMainQuest", width: "9%"},
        {id: "sharedActive", width: "8%"},
        {id: "sharedStaging", width: "67%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "8%"},
        {id: "sharedEncounterDiscard", width: "8%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "26%"},
        {id: "player2Engaged", width: "25%", hideTitle: true},
        {id: "player3Engaged", width: "25%", hideTitle: true},
        {id: "sharedExtra1", width: "24%"},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "26%"},
        {id: "player2Play1", width: "25%"},
        {id: "player3Play1", width: "25%"},
        {id: "sharedExtra2", width: "24%"},
      ]
    },
    {
      regions: [
        {id: "player1Play2", width: "26%"},
        {id: "player2Play2", width: "25%"},
        {id: "player3Play2", width: "25%"},
        {id: "sharedExtra3", width: "24%"},
      ]
    },
    {
      regions: [
        {id: "player1Play3", width: "26%"},
        {id: "player2Play3", width: "25%"},
        {id: "player3Play3", width: "25%"},
        {id: "sharedExtra4", width: "24%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "59%", style: "shaded"},
        {id: "Deck", width: "8%", style: "shaded"},
        {id: "Discard", width: "8%", style: "shaded"},
      ]
    },
  ],
  "layout4standard": [
    {
      regions: [
        {id: "sharedMainQuest", width: "8%"},
        {id: "sharedActive", width: "9%"},
        {id: "sharedStaging", width: "68%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "7.5%"},
        {id: "sharedEncounterDiscard", width: "7.5%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "25%"},
        {id: "player2Engaged", width: "25%", hideTitle: true},
        {id: "player3Engaged", width: "25%", hideTitle: true},
        {id: "player4Engaged", width: "25%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "25%"},
        {id: "player2Play1", width: "25%", hideTitle: true},
        {id: "player3Play1", width: "25%", hideTitle: true},
        {id: "player4Play1", width: "25%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play2", width: "25%"},
        {id: "player2Play2", width: "25%", hideTitle: true},
        {id: "player3Play2", width: "25%", hideTitle: true},
        {id: "player4Play2", width: "25%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play3", width: "25%"},
        {id: "player2Play3", width: "25%", hideTitle: true},
        {id: "player3Play3", width: "25%", hideTitle: true},
        {id: "player4Play3", width: "25%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play4", width: "17%"},
        {id: "player1Event", width: "8%"},
        {id: "player2Play4", width: "17%", hideTitle: true},
        {id: "player2Event", width: "8%"},
        {id: "player3Play4", width: "17%", hideTitle: true},
        {id: "player3Event", width: "8%"},
        {id: "player4Play4", width: "17%", hideTitle: true},
        {id: "player4Event", width: "8%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "60%", style: "shaded"},
        {id: "Deck", width: "7.5%", style: "shaded"},
        {id: "Discard", width: "7.5%", style: "shaded"},
      ]
    },
  ],
  "layout4extra": [
    {
      regions: [
        {id: "sharedMainQuest", width: "8%"},
        {id: "sharedActive", width: "9%"},
        {id: "sharedStaging", width: "68%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "7.5%"},
        {id: "sharedEncounterDiscard", width: "7.5%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "25%"},
        {id: "player2Engaged", width: "25%", hideTitle: true},
        {id: "player3Engaged", width: "25%", hideTitle: true},
        {id: "player4Engaged", width: "25%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "75%"},
        {id: "sharedExtra1", width: "25%"},
      ]
    },
    {
      regions: [
        {id: "player2Play1", width: "75%"},
        {id: "sharedExtra2", width: "25%"},
      ]
    },
    {
      regions: [
        {id: "player3Play1", width: "75%"},
        {id: "sharedExtra3", width: "25%"},
      ]
    },
    {
      regions: [
        {id: "player4Play1", width: "72%"},
        {id: "player1Event", width: "7%"},
        {id: "player2Event", width: "7%", hideTitle: true},
        {id: "player3Event", width: "7%", hideTitle: true},
        {id: "player4Event", width: "7%", hideTitle: true},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "60%", style: "shaded"},
        {id: "Deck", width: "7.5%", style: "shaded"},
        {id: "Discard", width: "7.5%", style: "shaded"},
      ]
    },
  ],
  "layout4extra4": [
    {
      regions: [
        {id: "sharedMainQuest", width: "8%"},
        {id: "sharedActive", width: "9%"},
        {id: "sharedStaging", width: "68%", style: "shaded", boxShadow: "true"},
        {id: "sharedEncounterDeck", width: "7.5%"},
        {id: "sharedEncounterDiscard", width: "7.5%"},
      ]
    },
    {
      regions: [
        {id: "player1Engaged", width: "25%"},
        {id: "player2Engaged", width: "25%"},
        {id: "player3Engaged", width: "25%"},
        {id: "player4Engaged", width: "25%"},
      ]
    },
    {
      regions: [
        {id: "player1Play1", width: "75%"},
        {id: "sharedExtra1", width: "25%"},
      ]
    },
    {
      regions: [
        {id: "player2Play1", width: "75%"},
        {id: "sharedExtra2", width: "25%"},
      ]
    },
    {
      regions: [
        {id: "player3Play1", width: "75%"},
        {id: "sharedExtra3", width: "25%"},
      ]
    },
    {
      regions: [
        {id: "player4Play1", width: "75%"},
        {id: "sharedExtra4", width: "25%"},
      ]
    },
    {
      regions: [
        {id: "Hand", width: "60%", style: "shaded"},
        {id: "Deck", width: "7.5%", style: "shaded"},
        {id: "Discard", width: "7.5%", style: "shaded"},
      ]
    },
  ]

}

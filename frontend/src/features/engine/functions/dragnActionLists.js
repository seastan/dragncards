
export const dragnActionLists = {
  setRotation: (deg) => (
    [
      ["LOG", "$ALIAS_N", " set rotation of ", "$ACTIVE_FACE.name", " to ", deg, "."],
      ["SET", "/cardById/$ACTIVE_CARD_ID/rotation", deg]
    ]
  ),
  setAttachmentDirection: (dir) => (
    [
      ["LOG", "$ALIAS_N", " set the attachment direction of ", "$ACTIVE_FACE.name", " to ", dir, "."],
      ["SET", "/cardById/$ACTIVE_CARD_ID/attachmentDirection", dir]
    ]
  ),
  toggleTrigger: (stepId) => (
    [
      ["VAR", "$STEP_ID", stepId],
      ["COND",
        "$ACTIVE_FACE.triggers.$STEP_ID",
        [
          ["LOG", "$ALIAS_N", " removed ", stepId, " trigger to ", "$ACTIVE_FACE.name", "."],
          ["SET", "/cardById/$ACTIVE_CARD_ID/sides/$ACTIVE_CARD.currentSide/triggers/" + stepId, false]
        ],
        true,
        [
          ["LOG", "$ALIAS_N", " added ", stepId, " trigger to ", "$ACTIVE_FACE.name", "."],
          ["SET", "/cardById/$ACTIVE_CARD_ID/sides/$ACTIVE_CARD.currentSide/triggers/" + stepId, true]
        ]
      ]
    ]
  ),
  targetCard: () => ([
    ["COND",
      ["NOT", "$ACTIVE_CARD.targeting.$PLAYER_N"],
      [
        ["LOG", "$ALIAS_N", " targeted ", "$ACTIVE_CARD.currentFace.name", "."],
        ["SET", "/cardById/$ACTIVE_CARD_ID/targeting/$PLAYER_N", true]
      ],
      true,
      [
        ["LOG", "$ALIAS_N", " untargeted ", "$ACTIVE_CARD.currentFace.name", "."],
        ["SET", "/cardById/$ACTIVE_CARD_ID/targeting/$PLAYER_N", false]
      ]
    ]
  ]),
  triggerAutomationAbility: (ability, cardId, currentSide) => ([
    ["COND",
      ability !== null,
      [
        ["LOG", "$ALIAS_N", " triggered the ability on ", "$ACTIVE_FACE.name", "."],
        ["ABILITY", cardId, currentSide],
      ],
      ["TRUE"],
      ["LOG", "$ALIAS_N", " attempted to trigger the ability on ", "$ACTIVE_FACE.name", " but it has no ability implemented."]
    ]
  ]),
  clearTargets: () => ([
    ["LOG", "$ALIAS_N", " cleared all targets and arrows."],
    ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$GAME.cardById", [
      ["SET", "/cardById/$CARD_ID/targeting/$PLAYER_N", false],
      ["SET", "/cardById/$CARD_ID/arrows/$PLAYER_N", ["LIST"]]
    ]]
  ]),
  setStep: (stepId, stepInfo) => ([
    ["SET", "/stepId", stepId],
    ["LOG", "$ALIAS_N", " set the round step to ", stepInfo?.label, "."]
  ]),
  moveAllStacksTo: (origGroupId, destGroupId, numStacks, position) => ([
    ["COND",
      ["EQUAL", position, "top"],
      ["LOG", "$ALIAS_N", " moved all cards (", numStacks, ") from ", "$GAME.groupById." + origGroupId + ".label", " to top of ", "$GAME.groupById." + destGroupId + ".label", "."],
      ["EQUAL", position, "bottom"],
      ["LOG", "$ALIAS_N", " moved (", numStacks, ") from ", "$GAME.groupById." + origGroupId + ".label", " to bottom of ", "$GAME.groupById." + destGroupId + ".label", "."],
      true,
      ["LOG", "$ALIAS_N", " shuffled all cards (", numStacks, ") from ", "$GAME.groupById." + origGroupId + ".label", " into ", "$GAME.groupById." + destGroupId + ".label", "."]
    ],
    ["MOVE_STACKS", origGroupId, destGroupId, numStacks, position]
  ]),
  moveCardToTop: (cardId, destGroupId, label) => ([
    ["LOG", "$ALIAS_N", " moved ", ["FACEUP_NAME_FROM_CARD_ID", cardId], " to top of ", label, "."],
    ["MOVE_CARD", cardId, destGroupId, 0]
  ]),
  moveCardToShuffled: (cardId, destGroupId, label) => ([
    ["LOG", "$ALIAS_N", " shuffled ", ["FACEUP_NAME_FROM_CARD_ID", cardId], " into ", label, "."],
    ["MOVE_CARD", cardId, destGroupId, 0],
    ["SHUFFLE_GROUP", destGroupId]
  ]),
  moveCardToBottom: (cardId, destGroupId, label) => ([
    ["LOG", "$ALIAS_N", " moved ", ["FACEUP_NAME_FROM_CARD_ID", cardId], " to bottom of ", label, "."],
    ["MOVE_CARD", cardId, destGroupId, -1]
  ]),
  moveCardToTopX: (cardId, destGroupId, label) => ([
    ["INPUT", "integer", "$VAL", "Shuffle into top:", 5],
    ["LOG", "$ALIAS_N", " shuffled ", ["FACEUP_NAME_FROM_CARD_ID", cardId], " into the top ", "$VAL", " cards of ", label, "."],
    ["MOVE_CARD", cardId, destGroupId, 0],
    ["SHUFFLE_TOP_X", destGroupId, "$VAL"]
  ]),
  moveCardToBottomX: (cardId, destGroupId, label) => ([
    ["INPUT", "integer", "$VAL", "Shuffle into bottom:", 5],
    ["LOG", "$ALIAS_N", " shuffled ", ["FACEUP_NAME_FROM_CARD_ID", cardId], " into the bottom ", "$VAL", " cards of ", label, "."],
    ["MOVE_CARD", cardId, destGroupId, -1],
    ["SHUFFLE_BOTTOM_X", destGroupId, "$VAL"]
  ]),
  detach: (card) => ([
    ["COND",
      ["GREATER_THAN", card.cardIndex, 0],
      [
        ["LOG", "$ALIAS_N", " detached ", ["FACEUP_NAME_FROM_CARD_ID", card.id], "."],
        ["MOVE_CARD", card.id, card.groupId, card.stackIndex + 1, 0]
      ]
    ]
  ]),
  flipCard: (card) => ([
    ["COND",
      ["EQUAL", "$ACTIVE_CARD.currentSide", "A"],
      [
        ["LOG", "$ALIAS_N", " flipped ", "$ACTIVE_CARD.sides.A.name", " facedown."],
        ["SET", "/cardById/" + card.id + "/currentSide", "B"]
      ],
      true,
      [
        ["LOG", "$ALIAS_N", " flipped ", "$ACTIVE_CARD.sides.A.name", " faceup."],
        ["SET", "/cardById/" + card.id + "/currentSide", "A"]
      ]
    ]
  ]),
  deleteCard: (card) => ([
    ["LOG", "$ALIAS_N", " deleted ", ["FACEUP_NAME_FROM_CARD_ID", card.id], "."],
    ["DELETE_CARD", card.id]
  ]),
  chooseRandom: (groupId) => ([
    ["LOG", "$ALIAS_N", " chose a random card from ", "$GAME.groupById." + groupId + ".label", "."],
    ["VAR", "$RANDOM_IDX", ["RANDOM_INT", 0, ["SUBTRACT", ["LENGTH", "$GAME.groupById." + groupId + ".stackIds"], 1]]],
    ["VAR", "$STACK_ID", "$GAME.groupById." + groupId + ".stackIds.[$RANDOM_IDX]"],
    ["VAR", "$CARD_ID", "$GAME.stackById.$STACK_ID.cardIds.[0]"],
    ["TARGET", "$CARD_ID"]
  ]),
  togglePeeking: (card, val, playerIList) => {
    if (val === "All") {
      // Make an object where the keys are the playerI and the values are true
      const peeking = playerIList.reduce((obj, playerI) => {
        obj[playerI] = true;
        return obj;
      }
      , {});
      return ([
        ["LOG", "$ALIAS_N", " set ", ["FACEUP_NAME_FROM_CARD_ID", card.id], " to be peeked at by all players."],
        ["SET", "/cardById/" + card.id + "/peeking", peeking]
      ])
    } else if (val === "None") {
      return ([
        ["LOG", "$ALIAS_N", " set ", ["FACEUP_NAME_FROM_CARD_ID", card.id], " to not be peeked at by any players."],
        ["SET", "/cardById/" + card.id + "/peeking", {}]
      ])
    } else {
      const peeking = {...card.peeking, [val]: !card.peeking[val]};
      return ([
        card.peeking[val]
          ? ["LOG", "$ALIAS_N", " set ", ["FACEUP_NAME_FROM_CARD_ID", card.id], " to not be peeked at by {", val, "}."]
          : ["LOG", "$ALIAS_N", " set ", ["FACEUP_NAME_FROM_CARD_ID", card.id], " to be peeked at by {", val + "}", "."]
        ,
        ["SET", "/cardById/" + card.id + "/peeking", peeking]
      ])
    }
  },
  toggleGroupVisibility: (group, val, playerIList) => {
    if (val === "All") {
      // Make an object where the keys are the playerI and the values are true
      const peeking = playerIList.reduce((obj, playerI) => {
        obj[playerI] = true;
        return obj;
      }
      , {});
      return ([
        ["LOG", `{{$ALIAS_N}}" set ${group.label} to be peeked at by all players.`],
        ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$GAME.cardById", [
          ["COND",
            ["EQUAL", "$CARD.groupId", group.id],
            ["SET", "/cardById/$CARD_ID/peeking", peeking]
          ]
        ]],
        ["SET", `/groupById/${group.id}/onCardEnter/peeking`, peeking]
      ])
    } else if (val === "None") {
      return ([
        ["LOG", `{{$ALIAS_N}}" set ${group.label} to be hidden from all players.`],
        ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$GAME.cardById", [
          ["COND",
            ["EQUAL", "$CARD.groupId", group.id],
            ["SET", "/cardById/$CARD_ID/peeking", {}]
          ]
        ]],
        ["SET", `/groupById/${group.id}/onCardEnter/peeking`, {}]
      ])
    } else {
      const peeking = {...group?.onCardEnter?.peeking, [val]: !group?.onCardEnter?.peeking?.[val]};
      return ([
        group?.onCardEnter?.peeking?.[val]
          ? ["LOG", `{{$ALIAS_N}} set ${group.label} to not be peeked at by ${val}.`]
          : ["LOG", `{{$ALIAS_N}} set ${group.label} to be peeked at by ${val}.`]
        ,
        ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$GAME.cardById", [
          ["COND",
            ["EQUAL", "$CARD.groupId", group.id],
            ["SET", `/cardById/$CARD_ID/peeking`, peeking]
          ]
        ]],
        ["SET", `/groupById/${group.id}/onCardEnter/peeking`, peeking]
      ])
    }
  },
  drawArrow: () => ([
    ["VAR", "$FROM_CARD_ID", "$GAME.playerData.$PLAYER_N.drawingArrowFrom"],
    ["COND",
      ["EQUAL", "$FROM_CARD_ID", null],
      [
        ["LOG", "$ALIAS_N", " is drawing an arrow from ", "$ACTIVE_CARD.currentFace.name", "."],
        ["SET", "/playerData/$PLAYER_N/drawingArrowFrom", "$ACTIVE_CARD_ID"]
      ],
      ["IN_LIST", "$GAME.cardById.$FROM_CARD_ID.arrows.$PLAYER_N", "$ACTIVE_CARD_ID"],
      [
        ["LOG", "$ALIAS_N", " removed an arrow to ", "$ACTIVE_CARD.currentFace.name", "."],
        ["SET", "/cardById/$FROM_CARD_ID/arrows/$PLAYER_N", 
          ["REMOVE_FROM_LIST_BY_VALUE", "$GAME.cardById.$FROM_CARD_ID.arrows.$PLAYER_N", "$ACTIVE_CARD_ID"]
        ],
        ["SET", "/playerData/$PLAYER_N/drawingArrowFrom", null]
      ],
      true,
      [
        ["LOG", "$ALIAS_N", " drew an arrow to ", "$ACTIVE_CARD.currentFace.name", "."],
        ["SET", "/cardById/$FROM_CARD_ID/arrows/$PLAYER_N", ["APPEND", "$GAME.cardById.$FROM_CARD_ID.arrows.$PLAYER_N", "$ACTIVE_CARD_ID"]],
        ["SET", "/playerData/$PLAYER_N/drawingArrowFrom", null]
      ]
    ]
  ])
}
  
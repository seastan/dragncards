import { mytypeof } from "./validateGameDef";

export function generateMarkdown(schema, parentPath = 'gameDef') {
  let markdown = "";
  // markdown += `#### \`${parentPath}\`\n`;
  // markdown += `- **Description**: ${schema._description_}\n`;
  // markdown += `- **Type**: ${schema._type_}\n`;
  // markdown += `\n`;

  const description = schema._description_ || '';
  const type = schema._type_ || 'unknown';
  const required = schema._required_ ? "Yes" : "No";
  const allowedValues = schema._memberOfPath_ ? `\`${JSON.stringify(schema._memberOfPath_)}\`` : '';

  // If fullPath has one . then it is a top level key, print a title for it
  if (parentPath.split('.').length <= 2) {
    markdown += `# \`${parentPath}\`\n`;
  } else {
    markdown += `#### \`${parentPath}\`\n`;
  }
  markdown += `- **Description**: ${description}\n`;
  markdown += `- **Type**: ${type}\n`;
  markdown += `- **Required**: ${required}\n`;
  if (allowedValues) {
    markdown += `- **Allowed values**: ${allowedValues}\n`;
  }
  if (parentPath.split('.').length === 2 && (type === 'object' || type === 'array')) {
    const suffix = parentPath.split('.')[1];
    markdown += `- [Example](https://github.com/seastan/dragncards-example-plugin/blob/main/jsons/${suffix}.json)\n`;
  }
  markdown += `\n`;

  for (const [key, value] of Object.entries(schema)) {
    if (key === '_itemSchema_') {
      markdown += generateMarkdown(value, parentPath + (value._type_ === 'array' ? '.[arrayelement]' : '.[key]'));
    } else if (key.startsWith('_')) {
      continue; // Skip internal keys
    } else {
      markdown += generateMarkdown(value, `${parentPath}.${key}`);
    }
  }

  return markdown;
}
export const getGameDefSchema = (gameDef) => {
    return ({
      "_description_": "The game definition schema",
      "_type_": "object",
      
      "pluginName": {
        "_description_": "The name of the plugin",
        "_type_": "string",
        "_required_": true
      },
      "tutorialUrl": {
        "_description_": "The URL of the tutorial",
        "_type_": "string",
      },
      "minPlayers": {
        "_description_": "The minimum number of players",
        "_type_": "integer",
        "_required_": true
      },
      "maxPlayers": {
        "_description_": "The maximum number of players",
        "_type_": "integer",
        "_required_": true
      },
      "backgroundUrl": {
        "_description_": "The URL of the background image",
        "_type_": "string",
      },
      "loadPreBuiltOnNewGame": {
        "_description_": "If set to true, it will open the pre-built deck menu when the game starts",
        "_type_": "boolean",
      },
      "vacantSeatOnNewGame": {
        "_description_": "If set to true, the user that created the room for the game will not be automatically seated in the player1 seat.",
        "_type_": "boolean",
      },
      "actionLists": {
        "_description_": "Predefined action lists that care called using hotkeys or clicking on buttons. The key is the actionListId.",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "An action list",
          "_type_": "actionList"
        }
      },
      "announcements": {
        "_description_": "List of announcements that are displayed to users in the 'Create Room' lobby",
        "_type_": "array",
        "_itemSchema_": {
          "_description_": "A single announcement",
          "_type_": "string"
        }
      },
      "automation": {
        "_description_": "Automation settings",
        "_type_": "object",
        "postNewGameActionList": {
          "_description_": "Action list that is called right after a new game is created",
          "_type_": "actionList",
        },
        "postSitDownActionList": {
          "_description_": "Action list that is called right after a player sits down",
          "_type_": "actionList",
        },
        "postLoadActionList": {
          "_description_": "Action list that is called right after a deck is loaded",
          "_type_": "actionList",
        },
        "preLoadActionList": {
          "_description_": "Action list that is called right before a deck is loaded",
          "_type_": "actionList",
        },
        "gameRules": {
          "_description_": "Game rules",
          "_type_": "array",
          "_required_": false,
          "_itemSchema_": {
            "_description_": "A rule that is triggered automatically by the game state",
            "_type_": "object",
            "type": {
              "_description_": "The type of rule",
              "_type_": "string",
              "_required_": true,
              "_memberOf_": ["trigger", "passive"],
              "_memberOfPath_": `["trigger", "passive"]`,
            },
            "listenTo": {
              "_description_": "The paths in the game state to listen to for changes",
              "_type_": "array",
              "_required_": true,
              "_itemSchema_": {
                "_description_": "A path in the game state",
                "_type_": "any",
              }
            },
            "condition": {
              "_description_": "The condition that must be met for the rule to trigger",
              "_type_": "code",
            },
            "then": {
              "_description_": "(`trigger` type only) The action list to call when the rule triggers",
              "_type_": "actionList",
            },
            "onDo": {
              "_description_": "(`passive` type only) The action list to call when the condition is met",
              "_type_": "actionList",
            },
            "offDo": {
              "_description_": "(`passive` type only) The action list to call when the condition is no longer met",
              "_type_": "actionList",
            }
          }
        },
        "cards": {
          "_description_": "Card automation settings. Each key is a databaseId corresponding to a card.",
          "_type_": "object",
          "_itemSchema_": {
            "_description_": "Rules for a specific card",
            "_type_": "object",
            "ability": {
              "_description_": "The abilities of the card, which can be triggered manually by the player. The key is the side of the card corresponding to the ability, such as 'A' or 'B'.",
              "_type_": "object",
              "_itemSchema_": {
                "_description_": "An ability of the card's [key] side",
                "_type_": "actionList"
              }
            },
            "rules": {
              "_description_": "Rules that are triggered automatically by the card",
              "_type_": "array",
              "_itemSchema_": {
                "_description_": "A rule that is triggered automatically by the card",
                "_type_": "object",
                "type": {
                  "_description_": "The type of rule",
                  "_type_": "string",
                  "_required_": true,
                  "_memberOf_": ["trigger", "passive", "entersPlay", "whileInPlay"],
                  "_memberOfPath_": `["trigger", "passive", "entersPlay", "whileInPlay"]`,
                },
                "listenTo": {
                  "_description_": "The paths in the game state to listen to for changes",
                  "_type_": "array",
                  "_itemSchema_": {
                    "_description_": "A path in the game state",
                    "_type_": "any",
                  }
                },
                "condition": {
                  "_description_": "The condition that must be met for the rule to trigger",
                  "_type_": "code",
                },
                "side": {
                  "_description_": "The side of the card the rule belongs to",
                  "_type_": "string",
                },
                "then": {
                  "_description_": "(`trigger` and `entersPlay` types only) The action list to call when the rule triggers",
                  "_type_": "actionList",
                },
                "onDo": {
                  "_description_": "(`passive` and `whileInPlay` types only) The action list to call when the condition is met",
                  "_type_": "actionList",
                },
                "offDo": {
                  "_description_": "(`passive` and `whileInPlay` types only) The action list to call when the condition is no longer met",
                  "_type_": "actionList",
                }
              }
            }
          }
        }
      },
      "browse": {
        "_description_": "Settings for the browse group feature",
        "_type_": "object",
        "_required_": true,
        "_strictKeys_": true,
        "filterPropertySideA": {
          "_description_": "The property to filter on (only side A is supported). Example: 'type'",
          "_type_": "string",
          "_required_": true,
        },
        "filterValuesSideA": {
          "_description_": "The predefined options of filterPropertySideA to filter on (only side A is supported). Example: ['Ally', 'Attachment', 'Enemy']",
          "_type_": "array",
          "_required_": true,
          "_itemSchema_": {
            "_description_": "A value of filterPropertySideA. Example: 'Ally'",
            "_type_": "string",
          }
        },
        "textPropertiesSideA": {
          "_description_": "The properties to search through when typing in the text box (only side A is supported). Example: ['name', 'text', 'traits']",
          "_type_": "array",
          "_required_": true,
          "_itemSchema_": {
            "_description_": "A property to search through. Example: 'name'",
            "_type_": "any",
          }
        }
      },
      "cardBacks": {
        "_description_": "Card back settings",
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_description_": "A card back",
          "_type_": "object",
          "_strictKeys_": true,
          "width": {
            "_description_": "The width of the card back",
            "_type_": "float",
            "_required_": true,
          },
          "height": {
            "_description_": "The height of the card back",
            "_type_": "float",
            "_required_": true,
          },
          "imageUrl": {
            "_description_": "The URL of the image to use as the card back",
            "_type_": "string",
            "_required_": true,
          }
        }
      },
      "cardMenu": {
        "_description_": "Settings for the card menu",
        "_type_": "object",
        "_strictKeys_": true,
        "moveToGroupIds": {
          "_description_": "The group IDs to provide as options to move the card to",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "The group ID",
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
            "_memberOfPath_": "gameDef.groups",
          }
        },
        "suppress": {
          "_description_": "The options to suppress in the card menu",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "The option to suppress",
            "_type_": "string",
            "_memberOf_": ["Detach", "Attachment Direction", "Flip", "Delete", "Move To", "Show To", "Toggle Trigger", "Set Rotation"],
            "_memberOfPath_": `["Detach", "Attachment Direction", "Flip", "Delete", "Move To", "Show To", "Toggle Trigger", "Set Rotation"]`,
          }
        },
        "options": {
          "_description_": "Custom options to display in the card menu",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A custom option to display in the card menu",
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_description_": "The label of the option",
              "_type_": "label",
              "_required_": true,
            },
            "actionList": {
              "_description_": "The action list to call when the option is selected",
              "_type_": "actionList",
              "_required_": true,
            },
            "showIf": {
              "_description_": "The condition that must be met for the option to be displayed",
              "_type_": "code",
            }
          }
        }
      },
      "cardProperties": {
        "_description_": "Card properties",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A card property",
          "_type_": "object",
          "_strictKeys_": true,
          "type": {
            "_description_": "The data type of the property",
            "_type_": "string",
            "_required_": true,
            "_memberOf_": ["boolean", "integer", "string", "float"],
            "_memberOfPath_": `["boolean", "integer", "string", "float"]`,
          },
          "default": {
            "_description_": "The default value of the property",
            "_type_": "any",
            "_required_": true,
          }
        }
      },
      "cardTypes": {
        "_description_": "Card types. The key is the name of the card type.",
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_description_": "Details of the card type",
          "_type_": "object",
          "_strictKeys_": true,
          "width": {
            "_description_": "The width of the card",
            "_type_": "float",
            "_required_": true,
          },
          "height": {
            "_description_": "The height of the card",
            "_type_": "float",
            "_required_": true,
          },
          "tokens": {
            "_description_": "The list of tokenIds that can be placed on the card",
            "_type_": "array",
            "_itemSchema_": {
              "_description_": "A tokenId that can be placed on the card",
              "_type_": "string",
              "_memberOf_": mytypeof(gameDef?.tokens) === "object" ? Object.keys(gameDef.tokens) : [],
              "_memberOfPath_": "gameDef.tokens",
            }
          },
          "zoomFactor": {
            "_description_": "The scale factor of the card type",
            "_type_": "float",
          },
          "canOnlyAttachToTypes": {
            "_description_": "List of card types that this card type can only attach to",
            "_type_": "array",
            "_itemSchema_": {
              "_description_": "A card type that this card type can only attach to",
              "_type_": "string",
              "_memberOf_": mytypeof(gameDef?.cardTypes) === "object" ? Object.keys(gameDef.cardTypes) : [],
              "_memberOfPath_": "gameDef.cardTypes",
            }
          },
          "canOnlyHaveAttachmentsOfTypes": {
            "_description_": "List of card types that this card type can only have as attachments",
            "_type_": "array",
            "_itemSchema_": {
              "_description_": "A card type that this card type can only have as attachments",
              "_type_": "string",
              "_memberOf_": mytypeof(gameDef?.cardTypes) === "object" ? Object.keys(gameDef.cardTypes) : [],
              "_memberOfPath_": "gameDef.cardTypes",
            }
          }
        }
      },
      "clearTableOptions": {
        "_description_": "Options for clearing the table",
        "_type_": "array",
//        "_required_": true,
        "_itemSchema_": {
          "_description_": "A clear table option",
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_description_": "The label of the option",
            "_type_": "label",
            "_required_": true,
          },
          "actionList": {
            "_description_": "The action list to call when the option is selected",
            "_type_": "actionList",
            "_required_": true,
          }
        }
      },
      "closeRoomOptions": {
        "_description_": "Options for closing the room",
        "_type_": "array",
//        "_required_": true,
        "_itemSchema_": {
          "_description_": "The label of the option",
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_description_": "The label of the option",
            "_type_": "label",
            "_required_": true,
          },
          "actionList": {
            "_description_": "The action list to call when the option is selected",
            "_type_": "actionList",
            "_required_": true,
          }
        }
      },
      "deckbuilder": {
        "_description_": "Settings for the deckbuilder",
        "_type_": "object",
//        "_required_": true,
        "addButtons": {
          "_description_": "List of increment/decrement button values to add to the deckbuilder. Example: [1, 2, 3]",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "An increment/decrement button values to add to the deckbuilder",
            "_type_": "integer",
          }
        },
        "colorKey": {
          "_description_": "The face property to use set the text color in the builder",
          "_type_": "string",
        },
        "colorValues": {
          "_description_": "List of hex color values to use to set the text color in the builder",
          "_type_": "object",
          "_itemSchema_": {
            "_description_": "A hex color value to use to set the text color in the builder",
            "_type_": "string",
          }
        },
        "columns": {
          "_description_": "The columns to display in the deckbuilder",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A column to display in the deckbuilder",
            "_type_": "object",
            "_strictKeys_": true,
            "propName": {
              "_description_": "The name of the face property to display",
              "_type_": "string",
              "_required_": true,
            },
            "label": {
              "_description_": "The label to display for the column",
              "_type_": "label",
              "_required_": true,
            }
          }
        },
        "spawnGroups": {
          "_description_": "List of groupIds to allow the user to load cards into.",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "groupId to allow the user to load cards into",
            "_type_": "object",
            "_strictKeys_": true,
            "loadGroupId": {
              "_description_": "The group ID",
              "_type_": "string",
              "_required_": true,
              "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
              "_memberOfPath_": "gameDef.groups",
            },
            "label": {
              "_description_": "The label to display for the group",
              "_type_": "label",
              "_required_": true,
            }
          }
        }
      },
      "deckMenu": {
        "_description_": "Settings for the pre-built deck menu",
        "_type_": "object",
        "subMenus": {
          "_description_": "Second-level menus to display in the deck menu",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "Second-level menu option",
            "_type_": "object",
            "label": {
              "_description_": "The label of the second-level menu",
              "_type_": "label",
              "_required_": true,
            },
            "subMenus": {
              "_description_": "Third-level menus to display in the second-level menu",
              "_type_": "array",
              "_itemSchema_": {
                "_description_": "Third-level menu option",
                "_type_": "object",
                "_strictKeys_": true,
                "label": {
                  "_description_": "The label of the third-level menu",
                  "_type_": "label",
                  "_required_": true,
                },
                "deckLists": {
                  "_description_": "The deck lists to display in the third-level menu",
                  "_type_": "array",
                  "_required_": true,
                  "_itemSchema_": {
                    "_description_": "A deck list to display in the third-level menu",
                    "_type_": "object",
                    "_strictKeys_": true,
                    "label": {
                      "_description_": "The label of the deck list",
                      "_type_": "label",
                      "_required_": true,
                    },
                    "deckListId": {
                      "_description_": "The ID of the deck list",
                      "_type_": "string",
                      "_required_": true,
                      "_memberOf_": mytypeof(gameDef?.preBuiltDecks) === "object" ? Object.keys(gameDef.preBuiltDecks) : [],
                      "_memberOfPath_": "gameDef.preBuiltDecks",
                    }
                  }
                }
              }
            },
            "deckLists": {
              "_description_": "The deck lists to display in the second-level menu",
              "_type_": "array",
              "_itemSchema_": {
                "_description_": "A deck list to display in the second-level menu",
                "_type_": "object",
                "_strictKeys_": true,
                "label": {
                  "_description_": "The label of the deck list",
                  "_type_": "label",
                  "_required_": true,
                },
                "deckListId": {
                  "_description_": "The ID of the deck list",
                  "_type_": "string",
                  "_required_": true,
                  "_memberOf_": mytypeof(gameDef?.preBuiltDecks) === "object" ? Object.keys(gameDef.preBuiltDecks) : [],
                  "_memberOfPath_": "gameDef.preBuiltDecks",
                }
              }
            }
          }
        },
        "deckLists": {
          "_description_": "The deck lists to display in the first-level deck menu",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A deck list to display in the first-level deck menu",
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_description_": "The label of the deck list",
              "_type_": "label",
              "_required_": true,
            },
            "deckListId": {
              "_description_": "The ID of the deck list",
              "_type_": "string",
              "_required_": true,
              "_memberOf_": mytypeof(gameDef?.preBuiltDecks) === "object" ? Object.keys(gameDef.preBuiltDecks) : [],
              "_memberOfPath_": "gameDef.preBuiltDecks",
            }
          }
        }
      },
      "defaultActions": {
        "_description_": "Default actions to perform when a card is tapped in touch mode. The conditions are checked in order, and the first one that is met is displayed.",
        "_type_": "array",
        "_itemSchema_": {
          "_description_": "A default action",
          "_type_": "object",
          "_strictKeys_": true,
          "actionList": {
            "_description_": "The action list to call when the card is tapped",
            "_type_": "actionList",
            "_required_": true,
          },
          "label": {
            "_description_": "The label of the action",
            "_type_": "label",
            "_required_": true,
          },
          "condition": {
            "_description_": "The condition that must be met for the action to be displayed",
            "_type_": "actionList",
            "_required_": true,
          },
          "position": {
            "_description_": "The position of the action in the menu bar",
            "_type_": "string",
            "_memberOf_": ["top", "bottom"],
            "_memberOfPath_": `["top", "bottom"]`,
          }
        }
      },
      "faceProperties": {
        "_description_": "Card face properties",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A card face property. The key is the face property name.",
          "_type_": "object",
          "_strictKeys_": true,
          "type": {
            "_description_": "The data type of the property",
            "_type_": "string",
            "_required_": true,
            "_memberOf_": ["boolean", "integer", "string", "float", "object", "list"],
            "_memberOfPath_": `["boolean", "integer", "string", "float", "object", "list"]`,
          },
          "default": {
            "_description_": "The default value of the property",
            "_type_": "selfType",
            "_required_": true,
            "_nullable_": true,
          },
        }
      },
      "functions": {
        "_description_": "Plugin-defined functions that can be called in any action list. The key is the function name, for example 'SHUFFLE_PLAYER_I_DECK'.",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A plugin-defined function",
          "_type_": "object",
          "_strictKeys_": true,
          "args": {
            "_description_": "The arguments of the function. Example: ['$PLAYER_I']",
            "_type_": "any",
            "_itemSchema_": {
              "_description_": "An argument of the function. Example: '$PLAYER_I'",
              "_type_": "string",
            }
          },
          "code": {
            "_description_": "The DragnLang code to execute. Example: ['SHUFFLE_GROUP', '{{$PLAYER_I}}Deck']",
            "_type_": "code",
            "_required_": true,
          },
        }
      },    
      "gameProperties": {
        "_description_": "Game properties",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A game property",
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_description_": "The label of the property",
            "_type_": "label",
          },
          "type": {
            "_description_": "The data type of the property",
            "_type_": "string",
            "_required_": true,
          },
          "default": {
            "_description_": "The default value of the property",
            "_type_": "selfType",
            "_required_": true,
          },
          "min": {
            "_description_": "The minimum value of the property",
            "_type_": "selfType",
          },
          "max": {
            "_description_": "The maximum value of the property",
            "_type_": "selfType",
          },
          "options": {
            "_description_": "If the type is 'option', these are the options to choose from",
            "_type_": "array",
            "_itemSchema_": {
              "_description_": "An option to choose from",
              "_type_": "object",
              "_strictKeys_": true,
              "label": {
                "_description_": "The label of the option",
                "_type_": "label",
                "_required_": true,
              },
              "id": {
                "_description_": "The ID of the option, which the game property will be set to when selected",
                "_type_": "string",
                "_required_": true,
              }
            }
          }
        }
      },
      "groupMenu": {
        "_description_": "Settings for the group hamburger menu",
        "_type_": "object",
//        "_required_": true,
        "_strictKeys_": true,
        "peekAtTopN": {
          "_description_": "List of options for the number of cards to peek at the top of the group. Example: [5, 10]",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "The number of cards to peek at the top of the group",
            "_type_": "integer",
          }
        },
        "moveToGroupIds": {
          "_description_": "The group IDs to provide as options to move the cards in the group to",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "The group ID",
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
            "_memberOfPath_": "gameDef.groups",
          }
        },
        "suppress": {
          "_description_": "List of options to suppress in the group menu",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "The option to suppress",
            "_type_": "string",
            "_memberOf_": ["Shuffle", "Browse", "Look at top", "Look at top X", "Choose Random", "Set Visibility", "Move To"],
            "_memberOfPath_": `["Browse", "Look at top", "Look at top X", "Choose Random", "Set Visibility", "Move To"]`,
          }
        },
        "options": {
          "_description_": "Custom options to display in the group menu",
          "_type_": "array",
          "_required_": true,
          "_itemSchema_": {
            "_description_": "A custom option to display in the group menu",
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_description_": "The label of the option",
              "_type_": "label",
              "_required_": true,
            },
            "actionList": {
              "_description_": "The action list to call when the option is selected",
              "_type_": "actionList",
              "_required_": true,
            },
          }
        }
      },
      "groupTypes": {
        "_description_": "Group type definitions. Any properties of a group type that are defined will be passed onto any groups that are given that type.",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A group type",
          "_type_": "object",
          "label": {
            "_description_": "The label of the group type",
            "_type_": "label",
          },
          "tableLabel": {
            "_description_": "The label of the group type in the table",
            "_type_": "label",
          },
          "canHaveAttachments": {
            "_description_": "Whether the group can have attachments",
            "_type_": "boolean",
          },
          "shuffleOnLoad": {
            "_description_": "Whether the group should be shuffled when loaded",
            "_type_": "boolean",
          },
          "onCardEnter": {
            "_description_": "Properties to apply to a card when it enters the group. The key is the cardProperty to set, and the value is the value to set it to.",
            "_type_": "object",
            "_itemSchema_": {
              "_description_": "The value to apply to the card's [key] property",
              "_type_": "any",
            }
          },
          "onCardLeave": {
            "_description_": "Properties to apply to a card when it leaves the group. The key is the cardProperty to set, and the value is the value to set it to.",
            "_type_": "object",
            "_itemSchema_": {
              "_description_": "The value to apply to the card's [key] property",
              "_type_": "any",
            }
          },
          "menuOptions": {
            "_description_": "Options to display in the group hamburger menu",
            "_type_": "array",
            "_itemSchema_": {
              "_description_": "A menu option to display in the group hamburger menu",
              "_type_": "object",
              "_strictKeys_": true,
              "label": {
                "_description_": "The label of the option",
                "_type_": "label",
                "_required_": true,
              },
              "actionList": {
                "_description_": "The action list to call when the option is selected",
                "_type_": "actionList",
                "_required_": true,
              },
            }
          },
          "_itemSchema_": {
            "_type_": "any",
          }
        }
      },
      "groups": {
        "_description_": "Group definitions",
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_description_": "Definition of a group",
          "_type_": "object",
          "groupType": {
            "_description_": "The type of the group",
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.groupTypes) === "object" ? Object.keys(gameDef.groupTypes) : [],
            "_memberOfPath_": "gameDef.groupTypes",
          },
          "label": {
            "_description_": "The label of the group",
            "_type_": "label",
            "_required_": true,
          },
          "tableLabel": {
            "_description_": "The label of the group in the table",
            "_type_": "label",
          },
          "canHaveAttachments": {
            "_description_": "Whether the group can have attachments",
            "_type_": "boolean",
          },
          "shuffleOnLoad": {
            "_description_": "Whether the group should be shuffled when loaded",
            "_type_": "boolean",
          },
          "onCardEnter": {
            "_description_": "Properties to apply to a card when it enters the group. The key is the cardProperty to set, and the value is the value to set it to.",
            "_type_": "object",
            "_itemSchema_": {
              "_description_": "The value to apply to the card's [key] property",
              "_type_": "any",
            }
          },
          "onCardLeave": {
            "_description_": "Properties to apply to a card when it leaves the group. The key is the cardProperty to set, and the value is the value to set it to.",
            "_type_": "object",
            "_itemSchema_": {
              "_description_": "The value to apply to the card's [key] property",
              "_type_": "any",
            }
          },
          "menuOptions": {
            "_description_": "Options to display in the group hamburger menu",
            "_type_": "array",
            "_itemSchema_": {
              "_description_": "A menu option to display in the group hamburger menu",
              "_type_": "object",
              "_strictKeys_": true,
              "label": {
                "_description_": "The label of the option",
                "_type_": "label",
                "_required_": true,
              },
              "actionList": {
                "_description_": "The action list to call when the option is selected",
                "_type_": "actionList",
                "_required_": true,
              },
            }
          },
          "_itemSchema_": {
            "_description_": "Value of some arbitrary [key] you can define, which the group will have when the game starts",
            "_type_": "any",
          }
        }
      },
      "hotkeys": {
        "_type_": "object",
        "_strictKeys_": true,
        "token": {
          "_description_": "List of hotkeys for tokens",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A hotkey for a token",
            "_type_": "object",
            "_strictKeys_": true,
            "key": {
                "_description_": "The key to press",
                "_type_": "string",
                "_required_": true,
            },
            "tokenType": {
                "_description_": "The token type to spawn",
                "_type_": "string",
                "_required_": true,
                "_memberOf_": mytypeof(gameDef?.tokens) === "object" ? Object.keys(gameDef.tokens) : [],
                "_memberOfPath_": "gameDef.tokens",
            },
            "label": {
                "_description_": "The label of the hotkey",
                "_type_": "label",
                "_required_": true,
            },
          }
        },
        "game": {
          "_description_": "List of hotkeys for game actions",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A hotkey for a game action",
            "_type_": "object",
            "_strictKeys_": true,
            "key": {
                "_description_": "The key to press",
                "_type_": "string",
                "_required_": true,
            },
            "actionList": {
                "_description_": "The action list to call when the key is pressed",
                "_type_": "actionList",
                "_required_": true,
            },
            "label": {
                "_description_": "The label of the hotkey",
                "_type_": "label",
                "_required_": true,
            },
          }
        },
        "card": {
          "_description_": "Hotkeys for cards",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A hotkey for a card",
            "_type_": "object",
            "_strictKeys_": true,
            "key": {
                "_description_": "The key to press",
                "_type_": "string",
                "_required_": true,
            },
            "actionList": {
                "_description_": "The action list to call when the key is pressed",
                "_type_": "actionList",
                "_required_": true,
            },
            "label": {
                "_description_": "The label of the hotkey",
                "_type_": "label",
                "_required_": true,
            },
          }
        }
      },
      "labels": {
        "_description_": "Labels used in the game. The [key] is the labelId, and it can be used for any label in the gameDef by referencing it via `id:labelId`. This is optional, and mainly used for localization. For example, if you have some button with the label 'Draw Card', you can instead define a label `drawCard: {'English': 'Draw Card', 'Spanish': 'Robar Carta'}` and then use `id:drawCard` as the label for the button.",
        "_type_": "object",
        "_itemSchema_": {
          "_Description_": "The label details. The [key] is the language, and the value is the label text.",
          "_type_": "object",
          "_itemSchema_": {
            "_description_": "The label text",
            "_type_": "string",
          }
        }
      },
      "layoutMenu": {
        "_description_": "Layout menu options",
        "_type_": "array",
        "_required_": true,
        "_itemSchema_": {
          "_description_": "A layout menu option",
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_description_": "The label to display in the layout menu",
            "_type_": "label",
            "_required_": true,
          },
          "layoutId": {
            "_description_": "The ID of the layout",
            "_type_": "string",
            "_required_": true,
            "_memberOf_": mytypeof(gameDef?.layouts) === "object" ? Object.keys(gameDef.layouts) : [],
            "_memberOfPath_": "gameDef.layouts",
          },
          "numPlayers": {
            "_description_": "The number of players the layout supports",
            "_type_": "any",
            "_required_": true,
          },
        }
      },
      "layouts": {
        "_description_": "Layout definitions",
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_description_": "Definition of a layout",
          "_type_": "object",
          "_strictKeys_": true,
          "testBorders": {
            "_description_": "If set to true, the layout will display borders around the regions to help with layout testing",
            "_type_": "boolean",
          },
          "postSetActionList": {
            "_description_": "The action list to call after the layout is set",
            "_type_": "actionList",
          },
          "cardSize": {
            "_description_": "The size of the cards in the layout",
            "_type_": "float",
            "_required_": true,
          },
          "rowSpacing": {
            "_description_": "The spacing between rows in the layout",
            "_type_": "float",
            "_required_": true,
          },
          "chat": {
            "_description_": "Chat settings",
            "_type_": "object",
            "_required_": true,
            "_strictKeys_": true,
            "left": {
              "_description_": "The left position of the chat",
              "_type_": "any",
              "_required_": true,
            },
            "top": {
              "_description_": "The top position of the chat",
              "_type_": "any",
              "_required_": true,
            },
            "width": {
              "_description_": "The width of the chat",
              "_type_": "any",
              "_required_": true,
            },
            "height": {
              "_description_": "The height of the chat",
              "_type_": "any",
              "_required_": true,
            }
          },
          "regions": {
            "_description_": "Regions in the layout",
            "_type_": "object",
            "_required_": true,
            "_itemSchema_": {
              "_description_": "A region in the layout",
              "_type_": "object",
              "_strictKeys_": true,
              "groupId": {
                "_description_": "The group ID",
                "_type_": "groupId",
                "_required_": true,
              },
              "type": {
                "_description_": "The type of the region",
                "_type_": "string",
                "_memberOf_": ["row", "pile", "fan", "free"],
                "_required_": true,
              },
              "direction": {
                "_description_": "The direction of the region",
                "_type_": "string",
                "_memberOf_": ["horizontal", "vertical", "free"],
              },
              "left": {
                "_description_": "The left position of the region",
                "_type_": "any",
                "_required_": true,
              },
              "top": {
                "_description_": "The top position of the region",
                "_type_": "any",
                "_required_": true,
              },
              "width": {
                "_description_": "The width of the region",
                "_type_": "any",
                "_required_": true,
              },
              "height": {
                "_description_": "The height of the region",
                "_type_": "any",
                "_required_": true,
              },
              "style": {
                "_description_": "The style of the region, in the form of a CSS object. Example: {'background-color': 'red'}",
                "_type_": "object",
                "_itemSchema_": {
                  "_description_": "A CSS style property",
                  "_type_": "string",
                }
              },
              "layerIndex": {
                "_description_": "The layer index of the region. Higher index regions are drawn on top of lower index regions.",
                "_type_": "integer",
              },
              "hideTitle": {
                "_description_": "Whether to hide the title of the region",
                "_type_": "boolean",
              },
              "showMenu": {
                "_description_": "Whether to show the hamburger menu for the region",
                "_type_": "boolean",
              },
              "visible": {
                "_description_": "Whether the region is visible",
                "_type_": "boolean",
              },
              "cardSizeFactor": {
                "_description_": "The scale factor of the card size in the region",
                "_type_": "float",
              },
              "disableDroppableAttachments": {
                "_description_": "Whether to disable dropping attachments on cards in the region",
                "_type_": "boolean",
              }
            }
          },
          "tableButtons": {
            "_description_": "Buttons to display on the table. The [key] is the buttonId.",
            "_type_": "object",
            "_itemSchema_": {
              "_description_": "A button to display on the table",
              "_type_": "object",
              "_strictKeys_": true,
              "actionList": {
                "_description_": "The action list to call when the button is clicked",
                "_type_": "actionList",
                "_required_": true,
              },
              "label": {
                "_description_": "The label of the button",
                "_type_": "label",
                "_required_": true,
              },
              "left": {
                "_description_": "The left position of the button",
                "_type_": "any",
                "_required_": true,
              },
              "top": {
                "_description_": "The top position of the button",
                "_type_": "any",
                "_required_": true,
              },
              "width": {
                "_description_": "The width of the button",
                "_type_": "any",
                "_required_": true,
              },
              "height": {
                "_description_": "The height of the button",
                "_type_": "any",
                "_required_": true,
              }
            }
          },
          "textBoxes": {
            "_description_": "Text boxes to display on the table. The [key] is the textBoxId.",
            "_type_": "object",
            "_itemSchema_": {
              "_description_": "A text box to display on the table",
              "_type_": "object",
              "_strictKeys_": true,
              "left": {
                "_description_": "The left position of the text box",
                "_type_": "any",
                "_required_": true,
              },
              "top": {
                "_description_": "The top position of the text box",
                "_type_": "any",
                "_required_": true,
              },
              "width": {
                "_description_": "The width of the text box",
                "_type_": "any",
                "_required_": true,
              },
              "height": {
                "_description_": "The height of the text box",
                "_type_": "any",
                "_required_": true,
              },
              "visible": {
                "_description_": "Whether the text box is visible",
                "_type_": "boolean",
              }
            }

          }
        }
      },
      "phases": {
        "_description_": "Phases of the game. The [key] is the phaseId.",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A phase of the game",
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_description_": "The label of the phase",
            "_type_": "label",
            "_required_": true,
          },
          "height": {
            "_description_": "The screen height of the phase label",
            "_type_": "string",
            "_required_": true,
          },
        }
      },
      "phaseOrder": {
        "_description_": "List of phaseIds in the order they should be displayed",
        "_type_": "array",
        "_itemSchema_": {
          "_description_": "The phaseId",
          "_type_": "string",
          "_memberOf_": mytypeof(gameDef?.phases) === "object" ? Object.keys(gameDef.phases) : [],
        }
      },
      "playerProperties": {
        "_description_": "Player properties. The [key] is the player property name.",
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_description_": "A player property",
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_description_": "The label of the property",
            "_type_": "label",
          },
          "type": {
            "_description_": "The data type of the property",
            "_type_": "string",
            "_required_": true,

          },
          "default": {
            "_type_": "selfType",
            "_required_": true,
          },
          "min": {
            "_type_": "selfType",
          },
          "max": {
            "_type_": "selfType",
          },
          "options": {
            "_type_": "array",
            "_itemSchema_": {
              "_description_": "An option to choose from",
              "_type_": "object",
              "_strictKeys_": true,
              "label": {
                "_type_": "label",
                "_required_": true,
              },
              "id": {
                "_type_": "string",
                "_required_": true,
              }
            }
          },
        }
      },
      "pluginMenu": {
        "_type_": "object",
        "_strictKeys_": true,
        "options": {
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A plugin menu option",
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_description_": "The label of the option",
              "_type_": "label",
              "_required_": true,
            },
            "actionList": {
              "_description_": "The action list to call when the option is selected",
              "_type_": "actionList",
              "_required_": true,
            }
          }
        }
      },
      "preBuiltDecks": {
        "_description_": "Pre-built decks. The [key] is the deck ID.",
        "_type_": "object",
//        "_required_": true,
        "_itemSchema_": {
          "_description_": "A pre-built deck",
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_type_": "label",
            "_required_": true,
          }, 
          "cards": {
            "_description_": "List of objects containing the card databaseIds to load, their quantity, and their loadGroupId",
            "_type_": "array",
            "_required_": true,
            "_itemSchema_": {
              "_description_": "Load information for a card",
              "_type_": "object",
              "_strictKeys_": true,
              "databaseId": {
                "_description_": "The databaseId of the card",
                "_type_": "string",
                "_required_": true,
              },
              "quantity": {
                "_description_": "The quantity of the card to load",
                "_type_": "integer",
                "_required_": true,
              },
              "loadGroupId": {
                "_description_": "The group ID to load the card into",
                "_type_": "string",
                "_required_": true,
                "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
                "_memberOfPath_": "gameDef.groups",
              },
              "left": {
                "_description_": "Optional: If being loaded into a 'free' region type, the initial left position of the card",
                "_type_": "any",
              },
              "top": {
                "_description_": "Optional: If being loaded into a 'free' region type, the initial top position of the card",
                "_type_": "any",
              }
            }
          },
          "preLoadActionList": {
            "_description_": "The action list to call before the deck is loaded",
            "_type_": "actionList",
          },
          "postLoadActionList": {
            "_description_": "The action list to call after the deck is loaded",
            "_type_": "actionList",
          },
          "hideFromSearch": {
            "_description_": "Whether the deck should be hidden from the pre-built search menu",
            "_type_": "boolean",
          }
        }
      },
      "preferences": {
        "_description_": "User preferences.",
        "_type_": "object",
        "_strictKeys_": true,
        "game": {
          "_description_": "List of game properties to display in the Preferences panel. Values a user sets in this way will be stored in their account and automatically applied when they create a game.",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A game property key",
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.gameProperties) === "object" ? Object.keys(gameDef.gameProperties) : [],
            "_memberOfPath_": "gameDef.gameProperties"
          }
        },
        "player": {
          "_description_": "List of player properties to display in the Preferences panel. Values a user sets in this way will be stored in their account and automatically applied when they sit in a seat.",
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.playerProperties) === "object" ? Object.keys(gameDef.playerProperties) : [],
            "_memberOfPath_": "gameDef.playerProperties"
          }
        }
      },
      "prompts": {
        "_description_": "Plugin-defined prompts that can be called in any action list. The key is the prompt name, for example 'CHOOSE_PLAYER_I'.",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A plugin-defined prompt",
          "_type_": "object",
          "_strictKeys_": true,
          "args": {
            "_description_": "The arguments of the prompt. Example: ['$PLAYER_I']",
            "_type_": "array",
            "_required_": true,
            "_itemSchema_": {
              "_description_": "An argument of the prompt. Example: '$PLAYER_I'",
              "_type_": "string",
            }
          },
          "message": {
            "_description_": "The message to display in the prompt",
            "_type_": "any",
            "_required_": true,
          },
          "options": {
            "_description_": "The options to choose from in the prompt",
            "_type_": "array",
            "_itemSchema_": {
              "_description_": "An option to choose from",
              "_type_": "object",
              "label": {
                "_description_": "The label of the option",
                "_type_": "label",
                "_required_": true,
              },
              "hotkey": {
                "_description_": "The hotkey to press to select the option. Example: '1'",
                "_type_": "string",
              },
              "code": {
                "_description_": "The DragnLang code to execute when the option is selected.",
                "_type_": "code",
              }
            }
          },
          "optionsActionList": {
            "_type_": "actionList",
          }
        }
      },
      "saveGame": {
        "_description_": "Settings for saving the game",
        "_type_": "object",
        "_strictKeys_": true,
        "metadata": {
          "_description_": "Metadata to save with the game, which will be displayed in the saved games section of the user profile.",
          "_type_": "object",
          "_itemSchema_": {
            "_description_": "Either a value or an actionList that returns a value",
            "_type_": "any",
          }
        },
      },
      "spawnExistingCardModal": {
        "_description_": "Settings for the 'Spawn Existing Card' modal",
        "_type_": "object",
        "_required_": true,
        "columnProperties": {
          "_description_": "Face properties to display in the columns of the modal. Only the value for side A is displayed.",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A face property",
            "_type_": "string",
          },
        },
        "loadGroupIds": {
          "_description_": "The group IDs to provide as options to load the card into",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "The group ID",
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
            "_memberOfPath_": "gameDef.groups",
          }
        }
      },
      "stepReminderRegex": {
        "_description_": "List of step reminder regexes",
        "_type_": "array",
        "_itemSchema_": {
          "_description_": "A step reminder regex",
          "_type_": "object",
          "_strictKeys_": true,
          "faceProperty": {
            "_description_": "The face property to apply the regex to",
            "_type_": "string",
            "_required_": true,
          },
          "regex": {
            "_description_": "The regex to match",
            "_type_": "string",
            "_required_": true,
          },
          "stepId": {
            "_description_": "The stepId to place a reminder on",
            "_type_": "string",
            "_required_": true,
          }
        }
      },
      "steps": {
        "_description_": "Steps of the game. The [key] is the stepId.",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A step of the game",
          "_type_": "object",
          "_strictKeys_": true,
          "phaseId": {
            "_description_": "The phaseId the step belongs to",
            "_type_": "string",
            "_required_": true,
            "_memberOf_": mytypeof(gameDef?.phases) === "object" ? Object.keys(gameDef.phases) : [],
          },
          "label": {
            "_description_": "The label of the step",
            "_type_": "label",
            "_required_": true,
          },
        }
      },
      "stepOrder": {
        "_description_": "List of stepIds in the order they should be displayed",
        "_type_": "array",
        "_itemSchema_": {
          "_description_": "The stepId",
          "_type_": "string",
          "_memberOf_": mytypeof(gameDef?.steps) === "object" ? Object.keys(gameDef.steps) : [],
        }
      },
      "textBoxes": {
        "_description_": "Definitions for text boxes that can be appliet to layouts. The [key] is the textBoxId.",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A text box definition",
          "_type_": "object",
          "_strictKeys_": true,
          "content": {
            "_description_": "The content of the text box",
            "_type_": "any",
            "_required_": true,
          },
        }
      },
      "tokens": {
        "_description_": "Token definitions. The [key] is the token type.",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "A token definition",
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_description_": "The label of the token",
            "_type_": "label",
            "_required_": true,
          },
          "left": {
            "_description_": "The left position of the token",
            "_type_": "string",
            "_required_": true,
          },
          "top": {
            "_description_": "The top position of the token",
            "_type_": "string",
            "_required_": true,
          },
          "width": {
            "_description_": "The width of the token",
            "_type_": "string",
            "_required_": true,
          },
          "height": {
            "_description_": "The height of the token",
            "_type_": "string",
            "_required_": true,
          },
          "imageUrl": {
            "_description_": "The image URL of the token",
            "_type_": "string",
            "_required_": true,
          },
          "canBeNegative": {
            "_description_": "Whether the token can be negative",
            "_type_": "boolean",
          },
          "hideLabel1": {
            "_description_": "Whether to hide label if the value is '1'",
            "_type_": "boolean",
          }
        }
      },
      "topBarCounters": {
        "_description_": "Top bar counters",
        "_type_": "object",
        "shared": {
          "_description_": "List of shared counters",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "Details for a shared counter",
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_description_": "The label of the counter",
              "_type_": "label",
              "_required_": true,
            },
            "imageUrl": {
              "_description_": "The image URL of the counter",
              "_type_": "string",
              "_required_": true,
            },
            "gameProperty": {
              "_description_": "The game property whose value is displayed",
              "_type_": "string",
              "_required_": true,
              "_memberOf_": mytypeof(gameDef?.gameProperties) === "object" ? Object.keys(gameDef.gameProperties) + ["roundNumber"] : ["roundNumber"],
              "_memberOfPath_": "gameDef.gameProperties",
            }
          }
        },
        "player": {
          "_description_": "List of player counters",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "Details for a player counter",
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_description_": "The label of the counter",
              "_type_": "label",
              "_required_": true,
            },
            "imageUrl": {
              "_description_": "The image URL of the counter",
              "_type_": "string",
              "_required_": true,
            },
            "playerProperty": {
              "_description_": "The player property whose value is displayed",
              "_type_": "string",
              "_required_": true,
              "_memberOf_": mytypeof(gameDef?.playerProperties) === "object" ? Object.keys(gameDef.playerProperties) : [],
              "_memberOfPath_": "gameDef.playerProperties",
            }
          }
        }
      },
      "touchBar": {
        "_description_": "List of touch bar rows",
        "_type_": "array",
        "_itemSchema_": {
          "_description_": "A touch bar row, which is a list of touch bar buttons",
          "_type_": "array",
          "_itemSchema_": {
            "_description_": "A touch bar button",
            "_type_": "object",
            "_strictKeys_": true,
            "id": {
              "_description_": "The button ID",
              "_type_": "string",
            },
            "label": {
              "_description_": "The label of the button",
              "_type_": "label",
            },
            "imageUrl": {
              "_description_": "The image URL of the button",
              "_type_": "string",
            },
            "actionType": {
              "_description_": "The type of action to perform when the button is clicked",
              "_type_": "string",
              "_memberOf_": ["token", "card", "game", "engine"],
              "_memberOfPath_": `["token", "card", "game", "engine"]`,
            },
            "tokenType": {
              "_description_": "The token type to spawn when the button is clicked",
              "_type_": "string",
              "_memberOf_": mytypeof(gameDef?.tokens) === "object" ? Object.keys(gameDef.tokens) : [],
              "_memberOfPath_": "gameDef.tokens",
            },
            "actionList": {
              "_description_": "The action list to call when the button is clicked",
              "_type_": "actionList",
            }
          }
        }
      },
      "imageUrlPrefix": {
        "_description_": "Object describing the prefix to add to image URLs. The [key] is the language. This can be used to reduce character count in the TSV if many URLs contain a similar prefix. It can be used for localization if your images are hosted in such a way that the the URLs for the same card in different languages have the save suffix but different prefix. Example: {'Default': 'https://hostingsite.com/English/', 'English': 'https://hostingsite.com/English/', 'French': 'https://hostingsite.com/French/'}",
        "_type_": "object",
        "_itemSchema_": {
          "_description_": "The image URL prefix",
          "_type_": "string"
        }
      }
    });
  }
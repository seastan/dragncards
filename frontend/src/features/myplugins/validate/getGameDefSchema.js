import { mytypeof } from "./validateGameDef";

export function generateMarkdown(schema, parentPath = 'gameDef') {
  let markdown = "";

  for (const [key, value] of Object.entries(schema)) {
    if (key.startsWith('_')) continue; // Skip internal keys

    const fullPath = `${parentPath}.${key}`;
    const description = value._description_ || '';
    const type = value._type_ || 'unknown';
    const required = value._required_ ? "Yes" : "No";
    const allowedValues = value._memberOf_ ? `\`${JSON.stringify(value._memberOf_)}\`` : '';

    markdown += `### ${fullPath}\n`;
    markdown += `- **Description**: ${description}\n`;
    markdown += `- **Type**: ${type}\n`;
    markdown += `- **Required**: ${required}\n`;
    if (allowedValues) {
      markdown += `- **Allowed values**: ${allowedValues}\n`;
    }
    markdown += `\n`;

    if (value._type_ === 'object') {
      markdown += generateMarkdown(value, fullPath);
    } else if (value._type_ === 'array' && value._itemSchema_) {
      markdown += `### ${fullPath}.[arrayelement]\n`;
      markdown += generateMarkdown(value._itemSchema_, `${fullPath}.[arrayelement]`);
    }
  }

  return markdown;
}
export const getGameDefSchema = (gameDef) => {
    return ({
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
        "_description_": "Predefined action lists that care called using hotkeys, clicking on buttons, etc.",
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "any"
          }
        }
      },
      "announcements": {
        "_description_": "Announcements that are displayed to users in the 'Create Room' lobby",
        "_type_": "array",
        "_itemSchema_": {
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
              "_description_": "The path in the game state to listen to for changes",
              "_type_": "array",
              "_required_": true,
              "_itemSchema_": {
                "_type_": "any",
              }
            },
            "condition": {
              "_description_": "The condition that must be met for the rule to trigger",
              "_type_": "array",
              "_required_": true,
              "_itemSchema_": {
                "_type_": "actionList",
              }
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
          "_description_": "Card automation settings",
          "_type_": "object",
          "_itemSchema_": {
            "_type_": "object",
            "ability": {
              "_description_": "The ability of the card, which can be triggered manually by the player",
              "_type_": "object",
              "_itemSchema_": {
                "_type_": "actionList"
              }
            },
            "rules": {
              "_description_": "Rules that are triggered automatically by the card",
              "_type_": "array",
              "_itemSchema_": {
                "_type_": "object",
                "type": {
                  "_description_": "The type of rule",
                  "_type_": "string",
                  "_required_": true,
                  "_memberOf_": ["trigger", "passive", "entersPlay", "whileInPlay"],
                  "_memberOfPath_": `["trigger", "passive", "entersPlay", "inPlay"]`,
                },
                "listenTo": {
                  "_description_": "The path in the game state to listen to for changes",
                  "_type_": "array",
                  "_itemSchema_": {
                    "_type_": "any",
                  }
                },
                "condition": {
                  "_description_": "The condition that must be met for the rule to trigger",
                  "_type_": "array",
                  "_itemSchema_": {
                    "_type_": "actionList",
                  }
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
          "_description_": "The property to filter on (only side A is supported)",
          "_type_": "string",
          "_required_": true,
        },
        "filterValuesSideA": {
          "_description_": "The values to filter on (only side A is supported)",
          "_type_": "array",
          "_required_": true,
          "_itemSchema_": {
            "_type_": "string",
          }
        },
        "textPropertiesSideA": {
          "_description_": "The properties to search through when typing in the text box (only side A is supported)",
          "_type_": "array",
          "_required_": true,
          "_itemSchema_": {
            "_type_": "any",
          }
        }
      },
      "cardBacks": {
        "_description_": "Card back settings",
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
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
            "_type_": "string",
            "_memberOf_": ["Detach", "Attachment Direction", "Flip", "Delete", "Move To", "Show To", "Toggle Trigger", "Set Rotation"],
            "_memberOfPath_": `["Detach", "Attachment Direction", "Flip", "Delete", "Move To", "Show To", "Toggle Trigger", "Set Rotation"]`,
          }
        },
        "options": {
          "_description_": "Custom options to display in the card menu",
          "_type_": "array",
          "_itemSchema_": {
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
        "_description_": "Card types",
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
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
            "_description_": "The tokens that can be placed on the card",
            "_type_": "array",
            "_itemSchema_": {
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
            "_description_": "The card types that this card type can only attach to",
            "_type_": "array",
            "_itemSchema_": {
              "_type_": "string",
              "_memberOf_": mytypeof(gameDef?.cardTypes) === "object" ? Object.keys(gameDef.cardTypes) : [],
              "_memberOfPath_": "gameDef.cardTypes",
            }
          },
          "canOnlyHaveAttachmentsOfTypes": {
            "_description_": "The card types that this card type can only have as attachments",
            "_type_": "array",
            "_itemSchema_": {
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
          "_description_": "Buttons to add to the deckbuilder",
          "_type_": "array",
          "_itemSchema_": {
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
            "_type_": "string",
          }
        },
        "columns": {
          "_description_": "The columns to display in the deckbuilder",
          "_type_": "array",
          "_itemSchema_": {
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
          "_description_": "The groups to allow the user to load cards into.",
          "_type_": "array",
          "_itemSchema_": {
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
            "_type_": "selfType",
            "_required_": true,
            "_nullable_": true,
          },
        }
      },
      "functions": {
        "_description_": "Plugin-defined functions that can be called in any action list",
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "args": {
            "_description_": "The arguments of the function",
            "_type_": "any",
            "_itemSchema_": {
              "_type_": "string",
            }
          },
          "code": {
            "_description_": "The DragnLang code to execute",
            "_type_": "code",
            "_required_": true,
          },
        }
      },    
      "gameProperties": {
        "_description_": "Game properties",
        "_type_": "object",
        "_itemSchema_": {
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
          "_description_": "The number of cards to peek at the top of the group",
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "integer",
          }
        },
        "moveToGroupIds": {
          "_description_": "The group IDs to provide as options to move the cards in the group to",
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
            "_memberOfPath_": "gameDef.groups",
          }
        },
        "suppress": {
          "_description_": "The options to suppress in the group menu",
          "_type_": "array",
          "_itemSchema_": {
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
        "_description_": "Group type difinitions. Any properties of a group type that are defined will be passed onto any groups that are given that type.",
        "_type_": "object",
        "_itemSchema_": {
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
            "_description_": "Properties to apply to a card enters the group",
            "_type_": "object",
            "_itemSchema_": {
              "_type_": "any",
            }
          },
          "onCardLeave": {
            "_description_": "Properties to apply to a card leaves the group",
            "_type_": "object",
            "_itemSchema_": {
              "_type_": "any",
            }
          },
          "menuOptions": {
            "_description_": "Options to display in the group hamburger menu",
            "_type_": "array",
            "_itemSchema_": {
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
            "_description_": "Properties to apply to a card enters the group",
            "_type_": "object",
            "_itemSchema_": {
              "_type_": "any",
            }
          },
          "menuOptions": {
            "_description_": "Options to display in the group hamburger menu",
            "_type_": "array",
            "_itemSchema_": {
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
      "hotkeys": {
        "_type_": "object",
        "_strictKeys_": true,
        "token": {
          "_description_": "Hotkeys for tokens",
          "_type_": "array",
          "_itemSchema_": {
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
          "_description_": "Hotkeys for game actions",
          "_type_": "array",
          "_itemSchema_": {
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
        "_description_": "Labels used in the game",
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_itemSchema_": {
            "_type_": "string",
          }
        }
      },
      "layoutMenu": {
        "_description_": "Layout menu options",
        "_type_": "array",
        "_required_": true,
        "_itemSchema_": {
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
          "_type_": "object",
          "_strictKeys_": true,
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
                "_description_": "The style of the region",
                "_type_": "object",
                "_itemSchema_": {
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
            "_description_": "Buttons to display on the table",
            "_type_": "object",
            "_itemSchema_": {
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
            "_description_": "Text boxes to display on the table",
            "_type_": "object",
            "_itemSchema_": {
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
              },
            }
          }
        }
      },
      "phases": {
        "_description_": "Phases of the game",
        "_type_": "object",
        "_itemSchema_": {
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
        "_description_": "The order of the phases",
        "_type_": "array",
        "_itemSchema_": {
          "_type_": "string",
          "_memberOf_": mytypeof(gameDef?.phases) === "object" ? Object.keys(gameDef.phases) : [],
        }
      },
      "playerProperties": {
        "_description_": "Player properties",
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
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
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_type_": "label",
              "_required_": true,
            },
            "actionList": {
              "_type_": "actionList",
              "_required_": true,
            }
          }
        }
      },
      "preBuiltDecks": {
        "_type_": "object",
//        "_required_": true,
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_type_": "label",
            "_required_": true,
          }, 
          "cards": {
            "_type_": "array",
            "_required_": true,
            "_itemSchema_": {
              "_type_": "object",
              "_strictKeys_": true,
              "databaseId": {
                "_type_": "string",
                "_required_": true,
              },
              "quantity": {
                "_type_": "integer",
                "_required_": true,
              },
              "loadGroupId": {
                "_type_": "string",
                "_required_": true,
                "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
                "_memberOfPath_": "gameDef.groups",
              },
              "left": {
                "_type_": "any",
              },
              "top": {
                "_type_": "any",
              }
            }
          },
          "preLoadActionList": {
            "_type_": "actionList",
          },
          "postLoadActionList": {
            "_type_": "actionList",
          },
          "hideFromSearch": {
            "_type_": "boolean",
          }
        }
      },
      "preferences": {
        "_type_": "object",
        "_strictKeys_": true,
        "game": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.gameProperties) === "object" ? Object.keys(gameDef.gameProperties) : [],
            "_memberOfPath_": "gameDef.gameProperties"
          }
        },
        "player": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.playerProperties) === "object" ? Object.keys(gameDef.playerProperties) : [],
            "_memberOfPath_": "gameDef.playerProperties"
          }
        }
      },
      "prompts": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "args": {
            "_type_": "array",
            "_required_": true,
            "_itemSchema_": {
              "_type_": "string",
            }
          },
          "message": {
            "_type_": "any",
            "_required_": true,
          },
          "options": {
            "_type_": "array",
            "_itemSchema_": {
              "_type_": "object",
              "label": {
                "_type_": "label",
                "_required_": true,
              },
              "hotkey": {
                "_type_": "string",
              },
              "code": {
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
        "_type_": "object",
        "_strictKeys_": true,
        "metadata": {
          "_type_": "object",
          "_itemSchema_": {
            "_type_": "any",
          }
        },
      },
      "spawnExistingCardModal": {
        "_type_": "object",
        "_required_": true,
        "columnProperties": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "string",
          },
        },
        "loadGroupIds": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
            "_memberOfPath_": "gameDef.groups",
          }
        }
      },
      "stepReminderRegex": {
        "_type_": "array",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "faceProperty": {
            "_type_": "string",
            "_required_": true,
          },
          "regex": {
            "_type_": "string",
            "_required_": true,
          },
          "stepId": {
            "_type_": "string",
            "_required_": true,
          }
        }
      },
      "steps": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "phaseId": {
            "_type_": "string",
            "_required_": true,
            "_memberOf_": mytypeof(gameDef?.phases) === "object" ? Object.keys(gameDef.phases) : [],
          },
          "label": {
            "_type_": "label",
            "_required_": true,
          },
        }
      },
      "stepOrder": {
        "_type_": "array",
        "_itemSchema_": {
          "_type_": "string",
          "_memberOf_": mytypeof(gameDef?.steps) === "object" ? Object.keys(gameDef.steps) : [],
        }
      },
      "textBoxes": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "content": {
            "_type_": "any",
            "_required_": true,
          },
        }
      },
      "tokens": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_type_": "label",
            "_required_": true,
          },
          "left": {
            "_type_": "string",
            "_required_": true,
          },
          "top": {
            "_type_": "string",
            "_required_": true,
          },
          "width": {
            "_type_": "string",
            "_required_": true,
          },
          "height": {
            "_type_": "string",
            "_required_": true,
          },
          "imageUrl": {
            "_type_": "string",
            "_required_": true,
          },
          "canBeNegative": {
            "_type_": "boolean",
          },
          "hideLabel1": {
            "_type_": "boolean",
          }
        }
      },
      "topBarCounters": {
        "_type_": "object",
        "shared": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_type_": "label",
              "_required_": true,
            },
            "imageUrl": {
              "_type_": "string",
              "_required_": true,
            },
            "gameProperty": {
              "_type_": "string",
              "_required_": true,
              "_memberOf_": mytypeof(gameDef?.gameProperties) === "object" ? Object.keys(gameDef.gameProperties) + ["roundNumber"] : ["roundNumber"],
              "_memberOfPath_": "gameDef.gameProperties",
            }
          }
        },
        "player": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_type_": "label",
              "_required_": true,
            },
            "imageUrl": {
              "_type_": "string",
              "_required_": true,
            },
            "playerProperty": {
              "_type_": "string",
              "_required_": true,
              "_memberOf_": mytypeof(gameDef?.playerProperties) === "object" ? Object.keys(gameDef.playerProperties) : [],
              "_memberOfPath_": "gameDef.playerProperties",
            }
          }
        }
      },
      "touchBar": {
        "_type_": "array",
        "_itemSchema_": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "_strictKeys_": true,
            "id": {
              "_type_": "string",
            },
            "label": {
              "_type_": "label",
            },
            "imageUrl": {
              "_type_": "string",
            },
            "actionType": {
              "_type_": "string",
              "_memberOf_": ["token", "card", "game", "engine"],
              "_memberOfPath_": `["token", "card", "game", "engine"]`,
            },
            "tokenType": {
              "_type_": "string",
              "_memberOf_": mytypeof(gameDef?.tokens) === "object" ? Object.keys(gameDef.tokens) : [],
              "_memberOfPath_": "gameDef.tokens",
            },
            "actionList": {
              "_type_": "actionList",
            },
            "dragnButton": {
              "_type_": "string",
            }

          }
        }
      },
      "imageUrlPrefix": {
        "_description_": "The prefix to add to image URLs",
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "string"
        }
      }
    });
  }
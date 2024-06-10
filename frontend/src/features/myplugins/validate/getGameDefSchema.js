import { mytypeof } from "./validateGameDef";

export const getGameDefSchema = (gameDef) => {
    return ({
      "_type_": "object",
      
      "pluginName": {
        "_label_": "Plugin Name",
        "_type_": "string",
        "_required_": true
      },
      "tutorialUrl": {
        "_type_": "string",
      },
      "minPlayers": {
        "_type_": "integer",
        "_required_": true
      },
      "maxPlayers": {
        "_type_": "integer",
        "_required_": true
      },
      "firstPlayerImageUrl": {
        "_type_": "string",
      },
      "backgroundUrl": {
        "_type_": "string",
      },
      "loadPreBuiltOnNewGame": {
        "_type_": "boolean",
      },
      "vacantSeatOnNewGame": {
        "_type_": "boolean",
      },
      "defaultAttachmentDirection": {
        "_type_": "string",
      },
      "actionLists": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "any"
          }
        }
      },
      "announcements": {
        "_type_": "array",
        "_itemSchema_": {
          "_type_": "string"
        }
      },
      "automation": {
        "_type_": "object",
        "postNewGameActionList": {
          "_type_": "actionList",
        },
        "postLoadActionList": {
          "_type_": "actionList",
        },
        "preLoadActionList": {
          "_type_": "actionList",
        },
        "gameRules": {
          "_type_": "array",
          "_required_": false,
          "_itemSchema_": {
            "_type_": "object",
            "type": {
              "_type_": "string",
              "_required_": true,
              "_memberOf_": ["trigger", "passive"],
              "_memberOfPath_": `["trigger", "passive"]`,
            },
            "listenTo": {
              "_type_": "array",
              "_required_": true,
              "_itemSchema_": {
                "_type_": "any",
              }
            },
            "condition": {
              "_type_": "array",
              "_required_": true,
              "_itemSchema_": {
                "_type_": "any",
              }
            },
            "then": {
              "_type_": "actionList",
            },
            "onDo": {
              "_type_": "actionList",
            },
            "offDo": {
              "_type_": "actionList",
            }
          }
        },
        "cards": {
          "_type_": "object",
          "_itemSchema_": {
            "_type_": "object",
            "ability": {
              "_type_": "object",
              "_itemSchema_": {
                "_type_": "actionList"
              }
            },
            "rules": {
              "_type_": "array",
              "_itemSchema_": {
                "_type_": "object",
                "type": {
                  "_type_": "string",
                  "_required_": true,
                  "_memberOf_": ["trigger", "passive", "entersPlay", "whileInPlay"],
                  "_memberOfPath_": `["trigger", "passive", "entersPlay", "inPlay"]`,
                },
                "listenTo": {
                  "_type_": "array",
                  "_itemSchema_": {
                    "_type_": "any",
                  }
                },
                "condition": {
                  "_type_": "array",
                  "_itemSchema_": {
                    "_type_": "any",
                  }
                },
                "side": {
                  "_type_": "string",
                },
                "then": {
                  "_type_": "actionList",
                },
                "onDo": {
                  "_type_": "actionList",
                },
                "offDo": {
                  "_type_": "actionList",
                }
              }
            }
          }
        }
      },
      "browse": {
        "_type_": "object",
        "_required_": true,
        "_strictKeys_": true,
        "filterPropertySideA": {
          "_type_": "string",
          "_required_": true,
        },
        "filterValuesSideA": {
          "_type_": "array",
          "_required_": true,
          "_itemSchema_": {
            "_type_": "string",
          }
        },
        "textPropertiesSideA": {
          "_type_": "array",
          "_required_": true,
          "_itemSchema_": {
            "_type_": "any",
          }
        }
      },
      "cardBacks": {
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "width": {
            "_type_": "float",
            "_required_": true,
          },
          "height": {
            "_type_": "float",
            "_required_": true,
          },
          "imageUrl": {
            "_type_": "string",
            "_required_": true,
          }
        }
      },
      "cardMenu": {
        "_type_": "object",
        "_strictKeys_": true,
        "moveToGroupIds": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
            "_memberOfPath_": "gameDef.groups",
          }
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
            "actionList": {
              "_type_": "actionList",
              "_required_": true,
            }
          }
        }
      },
      "cardProperties": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "type": {
            "_type_": "string",
            "_required_": true,
          },
          "default": {
            "_type_": "any",
            "_required_": true,
          }
        }
      },
      "cardTypes": {
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "width": {
            "_type_": "float",
            "_required_": true,
          },
          "height": {
            "_type_": "float",
            "_required_": true,
          },
          "tokens": {
            "_type_": "array",
            "_itemSchema_": {
              "_type_": "string",
              "_memberOf_": mytypeof(gameDef?.tokens) === "object" ? Object.keys(gameDef.tokens) : [],
              "_memberOfPath_": "gameDef.tokens",
            }
          },
          "zoomFactor": {
            "_type_": "float",
          },
        }
      },
      "clearTableOptions": {
        "_type_": "array",
//        "_required_": true,
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
      },
      "closeRoomOptions": {
        "_type_": "array",
//        "_required_": true,
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
      },
      "deckbuilder": {
        "_type_": "object",
//        "_required_": true,
        "addButtons": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "integer",
          }
        },
        "colorKey": {
          "_type_": "string",
        },
        "colorValues": {
          "_type_": "object",
          "_itemSchema_": {
            "_type_": "string",
          }
        },
        "columns": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "_strictKeys_": true,
            "propName": {
              "_type_": "string",
              "_required_": true,
            },
            "label": {
              "_type_": "label",
              "_required_": true,
            }
          }
        },
        "spawnGroups": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "_strictKeys_": true,
            "loadGroupId": {
              "_type_": "string",
              "_required_": true,
              "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
              "_memberOfPath_": "gameDef.groups",
            },
            "label": {
              "_type_": "label",
              "_required_": true,
            }
          }
        }
      },
      "deckMenu": {
        "_type_": "object",
        "subMenus": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "label": {
              "_type_": "label",
              "_required_": true,
            },
            "subMenus": {
              "_type_": "array",
              "_itemSchema_": {
                "_type_": "object",
                "_strictKeys_": true,
                "label": {
                  "_type_": "label",
                  "_required_": true,
                },
                "deckLists": {
                  "_type_": "array",
                  "_required_": true,
                  "_itemSchema_": {
                    "_type_": "object",
                    "_strictKeys_": true,
                    "label": {
                      "_type_": "label",
                      "_required_": true,
                    },
                    "deckListId": {
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
              "_type_": "array",
              "_itemSchema_": {
                "_type_": "object",
                "_strictKeys_": true,
                "label": {
                  "_type_": "label",
                  "_required_": true,
                },
                "deckListId": {
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
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "_strictKeys_": true,
            "label": {
              "_type_": "label",
              "_required_": true,
            },
            "deckListId": {
              "_type_": "string",
              "_required_": true,
              "_memberOf_": mytypeof(gameDef?.preBuiltDecks) === "object" ? Object.keys(gameDef.preBuiltDecks) : [],
              "_memberOfPath_": "gameDef.preBuiltDecks",
            }
          }
        }
      },
      "defaultActions": {
        "_type_": "array",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "actionList": {
            "_type_": "actionList",
            "_required_": true,
          },
          "label": {
            "_type_": "label",
            "_required_": true,
          },
          "condition": {
            "_type_": "actionList",
            "_required_": true,
          },
          "position": {
            "_type_": "string",
            "_memberOf_": ["top", "bottom"],
            "_memberOfPath_": `["top", "bottom"]`,
          }
        }
      },
      "faceProperties": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "type": {
            "_type_": "string",
            "_required_": true,
          },
          "default": {
            "_type_": "selfType",
            "_required_": true,
            "_nullable_": true,
          },
        }
      },
      "functions": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "args": {
            "_type_": "any",
            "_itemSchema_": {
              "_type_": "string",
            }
          },
          "code": {
            "_type_": "code",
            "_required_": true,
          },
        }
      },    
      "gameProperties": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_type_": "label",
          },
          "type": {
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
          }
        }
      },
      "groupMenu": {
        "_type_": "object",
//        "_required_": true,
        "_strictKeys_": true,
        "peekAtTopN": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "integer",
          }
        },
        "moveToGroupIds": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.groups) === "object" ? Object.keys(gameDef.groups) : [],
            "_memberOfPath_": "gameDef.groups",
          }
        },
        "options": {
          "_type_": "array",
          "_required_": true,
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
            },
          }
        }
      },
      "groupTypes": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "label": {
            "_type_": "label",
          },
          "tableLabel": {
            "_type_": "label",
          },
          "canHaveAttachments": {
            "_type_": "boolean",
          },
          "shuffleOnLoad": {
            "_type_": "boolean",
          },
          "onCardEnter": {
            "_type_": "object",
            "_itemSchema_": {
              "_type_": "any",
            }
          },
          "onCardLeave": {
            "_type_": "object",
            "_itemSchema_": {
              "_type_": "any",
            }
          },
          "_itemSchema_": {
            "_type_": "any",
          }
        }
      },
      "groups": {
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_type_": "object",
          "groupType": {
            "_type_": "string",
            "_memberOf_": mytypeof(gameDef?.groupTypes) === "object" ? Object.keys(gameDef.groupTypes) : [],
            "_memberOfPath_": "gameDef.groupTypes",
          },
          "label": {
            "_type_": "label",
            "_required_": true,
          },
          "tableLabel": {
            "_type_": "label",
          },
          "canHaveAttachments": {
            "_type_": "boolean",
          },
          "shuffleOnLoad": {
            "_type_": "boolean",
          },
          "onCardEnter": {
            "_type_": "object",
            "_itemSchema_": {
              "_type_": "any",
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
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "_strictKeys_": true,
            "key": {
                "_type_": "string",
                "_required_": true,
            },
            "tokenType": {
                "_type_": "string",
                "_required_": true,
                "_memberOf_": mytypeof(gameDef?.tokens) === "object" ? Object.keys(gameDef.tokens) : [],
                "_memberOfPath_": "gameDef.tokens",
            },
            "label": {
                "_type_": "label",
                "_required_": true,
            },
          }
        },
        "game": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "_strictKeys_": true,
            "key": {
                "_type_": "string",
                "_required_": true,
            },
            "actionList": {
                "_type_": "actionList",
                "_required_": true,
            },
            "label": {
                "_type_": "label",
                "_required_": true,
            },
          }
        },
        "card": {
          "_type_": "array",
          "_itemSchema_": {
            "_type_": "object",
            "_strictKeys_": true,
            "key": {
                "_type_": "string",
                "_required_": true,
            },
            "actionList": {
                "_type_": "actionList",
                "_required_": true,
            },
            "label": {
                "_type_": "label",
                "_required_": true,
            },
          }
        }
      },
      "labels": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_itemSchema_": {
            "_type_": "string",
          }
        }
      },
      "layoutMenu": {
        "_type_": "array",
        "_required_": true,
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_type_": "label",
            "_required_": true,
          },
          "layoutId": {
            "_type_": "string",
            "_required_": true,
            "_memberOf_": mytypeof(gameDef?.layouts) === "object" ? Object.keys(gameDef.layouts) : [],
            "_memberOfPath_": "gameDef.layouts",
          },
          "numPlayers": {
            "_type_": "any",
            "_required_": true,
          },
        }
      },
      "layouts": {
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "postSetActionList": {
            "_type_": "actionList",
          },
          "cardSize": {
            "_type_": "float",
            "_required_": true,
          },
          "rowSpacing": {
            "_type_": "float",
            "_required_": true,
          },
          "chat": {
            "_type_": "object",
            "_required_": true,
            "_strictKeys_": true,
            "left": {
              "_type_": "any",
              "_required_": true,
            },
            "top": {
              "_type_": "any",
              "_required_": true,
            },
            "width": {
              "_type_": "any",
              "_required_": true,
            },
            "height": {
              "_type_": "any",
              "_required_": true,
            }
          },
          "regions": {
            "_type_": "object",
            "_required_": true,
            "_itemSchema_": {
              "_type_": "object",
              "_strictKeys_": true,
              "groupId": {
                "_type_": "groupId",
                "_required_": true,
              },
              "type": {
                "_type_": "string",
                "_memberOf_": ["row", "pile", "fan", "free"],
                "_required_": true,
              },
              "direction": {
                "_type_": "string",
                "_memberOf_": ["horizontal", "vertical", "free"],
              },
              "left": {
                "_type_": "any",
                "_required_": true,
              },
              "top": {
                "_type_": "any",
                "_required_": true,
              },
              "width": {
                "_type_": "any",
                "_required_": true,
              },
              "height": {
                "_type_": "any",
                "_required_": true,
              },
              "style": {
                "_type_": "object",
                "_itemSchema_": {
                  "_type_": "string",
                }
              },
              "layerIndex": {
                "_type_": "integer",
              },
              "hideTitle": {
                "_type_": "boolean",
              },
              "showMenu": {
                "_type_": "boolean",
              },
              "visible": {
                "_type_": "boolean",
              },
            }
          },
          "tableButtons": {
            "_type_": "object",
            "_itemSchema_": {
              "_type_": "object",
              "_strictKeys_": true,
              "actionList": {
                "_type_": "actionList",
                "_required_": true,
              },
              "label": {
                "_type_": "label",
                "_required_": true,
              },
              "left": {
                "_type_": "any",
                "_required_": true,
              },
              "top": {
                "_type_": "any",
                "_required_": true,
              },
              "width": {
                "_type_": "any",
                "_required_": true,
              },
              "height": {
                "_type_": "any",
                "_required_": true,
              }
            }
          },
          "textBoxes": {
            "_type_": "object",
            "_itemSchema_": {
              "_type_": "object",
              "_strictKeys_": true,
              "left": {
                "_type_": "any",
                "_required_": true,
              },
              "top": {
                "_type_": "any",
                "_required_": true,
              },
              "width": {
                "_type_": "any",
                "_required_": true,
              },
              "height": {
                "_type_": "any",
                "_required_": true,
              },
              "visible": {
                "_type_": "boolean",
              },
            }
          }
        }
      },
      "phases": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_type_": "label",
            "_required_": true,
          },
          "height": {
            "_type_": "string",
            "_required_": true,
          },
        }
      },
      "phaseOrder": {
        "_type_": "array",
        "_itemSchema_": {
          "_type_": "string",
          "_memberOf_": mytypeof(gameDef?.phases) === "object" ? Object.keys(gameDef.phases) : [],
        }
      },
      "playerProperties": {
        "_type_": "object",
        "_required_": true,
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "label": {
            "_type_": "label",
          },
          "type": {
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
              }
            }
          },
          "preLoadActionList": {
            "_type_": "actionList",
          },
          "postLoadActionList": {
            "_type_": "actionList",
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
      "userSettings" :{
        "_type_": "array",
        "_itemSchema_": {
          "_type_": "object",
          "_strictKeys_": true,
          "id": {
            "_type_": "string",
            "_required_": true,
          },
          "label": {
            "_type_": "label",
            "_required_": true,
          },
          "type": {
            "_type_": "string",
            "_required_": true,
            "_memberOf_": ["boolean", "integer", "string", "dropdown", "checkbox"],
            "_memberOfPath_": `["boolean", "integer", "float", "string"]`,
          },
          "default": {
            "_type_": "any",
            "_required_": true,
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
          }
        }
      },
      "imageUrlPrefix": {
        "_type_": "object",
        "_itemSchema_": {
          "_type_": "string"
        }
      }
    });
  }
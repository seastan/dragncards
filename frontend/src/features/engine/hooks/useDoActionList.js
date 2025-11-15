import { useContext } from 'react';
import BroadcastContext from '../../../contexts/BroadcastContext';
import store from '../../../store';
import { useGameDefinition } from './useGameDefinition';
import { useSendLocalMessage } from './useSendLocalMessage';

export const useDoActionList = () => {
    const gameDef = useGameDefinition(); 
    const sendLocalMessage = useSendLocalMessage();
    const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
    //const playerUi = null; //useSelector(state => state?.playerUi)

    return (idOrList, description = null) => {
        // if (store.getState().playerUi.dragging.stackId) {
        //     sendLocalMessage("You must finish dragging before you can perform this action.");
        //     return;
        // }
        // This fuction can take either an id for an action list, in which case it
        // executes the corresponding action list in the game definition, or it can
        // take a list, which it interprests as a custom action list and executes it.
        const isList = Array.isArray(idOrList);
        var actionList = null;
        if (isList) {
            actionList = idOrList;
        } else if (!isList && gameDef?.actionLists && Object.keys(gameDef.actionLists).includes(idOrList)) {
            actionList = gameDef.actionLists[idOrList]
        }
        console.log("processedActionList ", actionList)
        if (actionList != null) {
            var processedActionList = [...actionList];
            console.log("processedActionList 1", processedActionList)
            for (var i=0; i<processedActionList.length; i++) {
                const action = processedActionList[i];
                if (action[0] === "INPUT") {
                    if (action[1] === "integer") {
                        processedActionList[i] = ["DEFINE", action[2], parseInt(prompt(action[3],action[4]))]
                    } else if (action[1] === "string") {
                        processedActionList[i] = ["DEFINE", action[2], prompt(action[3],action[4])]
                    }
                } else if (action[0] === "CONFIRM") {
                    console.log("processedActionList 2", processedActionList, i)
                    if (!window.confirm(action[1])) return;
                    else processedActionList.splice(i,1);
                    console.log("processedActionList 3", processedActionList, i)
                }
            }

            var playerUi = store.getState().playerUi;
            // Drop the droppableRefs from the playerUi object
            playerUi = {...playerUi, droppableRefs: {}}
            
            // If playerUi.playerN is null, don't send the action list
            if (!playerUi.playerN) {
                sendLocalMessage("You must be logged in and seated at the table to perform this action.");
                return;
            }

            // If playerN does not start with "player", something is wrong
            if (!playerUi.playerN.startsWith("player")) {
                sendLocalMessage("You must be seated at the table to perform this action.");
                return;
            }

            gameBroadcast("game_action", {
                action: "evaluate", 
                options: {
                    action_list: processedActionList, 
                    player_ui: playerUi,
                    description: description || null
                }
            })
        }
    }
}
import { useGameL10n } from "./useGameL10n";
import store from "../../../store";
import { useDoActionList } from "./useDoActionList";
import { usePlayerN } from "./usePlayerN";

export const useBrowseTopN = () => {
    const doActionList = useDoActionList();
    const playerN = usePlayerN();
    const gameL10n = useGameL10n();
    return (groupId, topNstr) => {    
      const state = store.getState();
      const group = state?.gameUi?.game?.groupById?.[groupId];
      const stackIds = group["stackIds"];
      const numStacks = stackIds.length;
      const groupName = gameL10n(group.label);
      var peekStackIds = [];
      var topNint = 0;
      // Set peeking based on topNstr
      var visibility = true;
      var message = ""
      if (topNstr === "All") {
        topNint = -1;
        peekStackIds = stackIds;
        message = ["LOG", "$ALIAS_N", " is looking at ", groupName, "."];
      } else if (topNstr === "None") {
        topNint = -1; 
        peekStackIds = [];
        visibility = false;
        message = ["LOG", "$ALIAS_N", " stopped looking at ", groupName, "."];
      } else if (topNstr === "X") {
        // Get integer input from the browser
        var topNprompt = window.prompt("How many cards do you want to look at?", "");
        topNint = parseInt(topNprompt) || 0;
        if (topNint > numStacks) {
          alert(`You tried to look at ${topNint} cards, but there are only ${numStacks} cards in ${groupName}.`)
          topNint = numStacks;
        }
        if (topNint < 0) topNint = 0;
        peekStackIds = stackIds.slice(0, topNint);
        message = ["LOG", "$ALIAS_N", " is looking at the top ", topNint, " cards of ", groupName, "."]
      } else {
        topNint = parseInt(topNstr) || 0;
        if (topNint > numStacks) topNint = numStacks;
        if (topNint < 0) topNint = 0;
        peekStackIds = stackIds.slice(0, topNint);
        message = ["LOG", "$ALIAS_N", " is looking at the top ", topNstr, " cards of ", groupName, "."]
      }
      const actionList = [
        message,
        ["LOOK_AT", playerN, groupId, topNint, visibility]
      ];
      doActionList(actionList);
    }
}
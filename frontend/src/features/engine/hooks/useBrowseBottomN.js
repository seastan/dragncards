import store from "../../../store";
import { useDoActionList } from "./useDoActionList";
import { usePlayerN } from "./usePlayerN";
import { useGameL10n } from "./useGameL10n";

export const useBrowseBottomN = () => {
  const doActionList = useDoActionList();
  const playerN = usePlayerN();
  const gameL10n = useGameL10n();

  return (groupId, bottomNstr) => {
    const state = store.getState();
    const group = state?.gameUi?.game?.groupById?.[groupId];
    const stackIds = group["stackIds"];
    const numStacks = stackIds.length;
    const groupName = gameL10n(group.label);

    let bottomNint = 0;
    let visibility = true;
    let message = "";

    if (bottomNstr === "All") {
      bottomNint = -1;
      message = ["LOG", "$ALIAS_N", " is looking at ", groupName, "."];
    } else if (bottomNstr === "None") {
      bottomNint = -1;
      visibility = false;
      message = ["LOG", "$ALIAS_N", " stopped looking at ", groupName, "."];
    } else if (bottomNstr === "X") {
      const bottomNprompt = window.prompt(
        "How many cards do you want to look at?",
        ""
      );

      bottomNint = parseInt(bottomNprompt) || 0;

      if (bottomNint > numStacks) {
        alert(
          `You tried to look at ${bottomNint} cards, but there are only ${numStacks} cards in ${groupName}.`
        );
        bottomNint = numStacks;
      }

      if (bottomNint < 0) bottomNint = 0;

      message = [
        "LOG",
        "$ALIAS_N",
        " is looking at the bottom ",
        bottomNint,
        " cards of ",
        groupName,
        "."
      ];
    } else {
      bottomNint = parseInt(bottomNstr) || 0;

      if (bottomNint > numStacks) bottomNint = numStacks;
      if (bottomNint < 0) bottomNint = 0;

      message = [
        "LOG",
        "$ALIAS_N",
        " is looking at the bottom ",
        bottomNstr,
        " cards of ",
        groupName,
        "."
      ];
    }

    const actionList = [
      message,
      ["LOOK_AT_BOTTOM", playerN, groupId, bottomNint, visibility]
    ];

    doActionList(
      actionList,
      `Browsed bottom ${bottomNstr} of group ${groupId}`
    );
  };
};
// Translates dnc3d engine event callbacks into dragncards action-list broadcasts.
//
// doActionList: the function returned by useDoActionList() — broadcasts to the server.
// reverseIdMap: Map<dnc3dIndex, dcCardId> (inverse of the map built in adaptGameState).
//
// The engine's regionIds in connected mode equal dragncards groupIds, so they are used
// interchangeably below.

import store from '../../../store';
import { dragnActionLists } from '../../engine/functions/dragnActionLists';

export function buildEngineCallbacks(doActionList, reverseIdMap) {
  function getGame() {
    return store.getState()?.gameUi?.game;
  }

  function dcCardIdFor(dnc3dId) {
    return reverseIdMap?.get(dnc3dId);
  }

  return {
    // Card dragged from one region to another (or repositioned within a free region).
    onCardMove: (dnc3dCardId, _fromRegionId, toRegionId, fracX, fracY, insertIdx) => {
      const dcCardId = dcCardIdFor(dnc3dCardId);
      if (!dcCardId) return;

      const game = getGame();
      if (!game) return;

      const card      = game.cardById?.[dcCardId];
      const destGroup = game.groupById?.[toRegionId];
      if (!card || !destGroup) return;

      const stackId   = card.stackId;
      const destIndex = (insertIdx != null && insertIdx >= 0)
        ? insertIdx
        : (destGroup.stackIds?.length ?? 0);

      const actionList = [
        ["LOG", "$ALIAS_N", " moved a card."],
        ["MOVE_STACK", stackId, toRegionId, destIndex],
      ];

      // Free regions need an explicit position update.
      if (fracX != null && fracY != null) {
        actionList.push(
          ["COND",
            ["DEFINED", `$GAME.stackById.${stackId}`],
            [
              ["SET", `/stackById/${stackId}/left`, fracX],
              ["SET", `/stackById/${stackId}/top`,  fracY],
            ]
          ]
        );
      }

      doActionList(actionList, `Moved card ${dcCardId} to group ${toRegionId}`);
    },

    // Card dropped onto another card — creates an attachment stack.
    // targetBaseCardId is the dnc3d integer ID of the base card of the target stack.
    onAttach: (dnc3dCardId, targetBaseCardId, side) => {
      const dcCardId   = dcCardIdFor(dnc3dCardId);
      const dcTargetId = dcCardIdFor(targetBaseCardId);
      if (!dcCardId || !dcTargetId) return;

      const game = getGame();
      if (!game) return;

      const card       = game.cardById?.[dcCardId];
      const targetCard = game.cardById?.[dcTargetId];
      if (!card || !targetCard) return;

      const sourceStackId    = card.stackId;
      const targetGroupId    = targetCard.groupId;
      const targetStackIndex = targetCard.stackIndex ?? 0;

      doActionList([
        ["LOG", "$ALIAS_N", " attached a card."],
        ["MOVE_STACK", sourceStackId, targetGroupId, targetStackIndex, { combine: side }],
      ], `Attached card ${dcCardId} to ${dcTargetId} (${side})`);
    },

    // Card clicked to flip — newSide is 'A' (front) or 'B' (back).
    onFlip: (dnc3dCardId, newSide) => {
      const dcCardId = dcCardIdFor(dnc3dCardId);
      if (!dcCardId) return;

      const game = getGame();
      const card = game?.cardById?.[dcCardId];
      if (!card) return;

      const sideName = card.sides?.[newSide]?.name ?? card.sides?.A?.name ?? 'card';

      doActionList([
        ["LOG", "$ALIAS_N", " flipped ", sideName, "."],
        ["SET", `/cardById/${dcCardId}/currentSide`, newSide],
      ], `Flipped card ${dcCardId} to side ${newSide}`);
    },

    // "N behind" badge clicked — fan the stack's hidden attachments out, or tuck
    // them back. Mirrors the look/hide-under action lists in the 2D Stack.
    onLookUnder: (dnc3dCardId, lookingUnder) => {
      const dcCardId = dcCardIdFor(dnc3dCardId);
      if (!dcCardId) return;

      const stackId = getGame()?.cardById?.[dcCardId]?.stackId;
      if (stackId == null) return;

      doActionList([
        ["LOG", "$ALIAS_N",
          lookingUnder ? " fanned out the cards under " : " hid the cards under ",
          ["FACEUP_NAME_FROM_STACK_ID", stackId], "."],
        ["SET", `/stackById/${stackId}/lookingUnder`, lookingUnder],
      ], `${lookingUnder ? 'Looked' : 'Stopped looking'} under stack ${stackId}`);
    },

    // Lightning-bolt clicked — trigger the current face's automation ability.
    // Mirrors AbilityButton.handleAbilityClick in the 2D engine.
    onTriggerAbility: (dnc3dCardId) => {
      const dcCardId = dcCardIdFor(dnc3dCardId);
      if (!dcCardId) return;

      const game = getGame();
      const card = game?.cardById?.[dcCardId];
      if (!card) return;

      const currentSide = card.currentSide || 'A';
      const ability     = card.sides?.[currentSide]?.ability ?? null;
      if (ability == null) return;

      doActionList(
        dragnActionLists.triggerAutomationAbility(ability, dcCardId, currentSide),
        `Triggered ability of card ${dcCardId}`,
      );
    },
  };
}

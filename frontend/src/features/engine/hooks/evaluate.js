import { isString } from "../../store/updateValues";

function processCode(state, card, code) {
  if (typeof code === 'string') {
    return code.replace(/\{\{(.+?)\}\}/g, (match, p1) => {
      let replacement = evaluate(state, card, p1);
      if (Array.isArray(replacement) || (typeof replacement === 'object' && replacement !== null)) {
        return JSON.stringify(replacement);
      } else {
        return String(replacement);
      }
    });
  } else {
    return code;
  }
}

export const evaluate = (state, card, code) => {
    if (Array.isArray(code) && code.length > 0) {
      console.log("code")
      if (Array.isArray(code[0])) {
          var result = state;
          for (var block in code) {
              result = evaluate(result, card, block)
          }
          return result;
      } else {
        // It's a string. Replace {{}} with values
        code = processCode(state, card, code);
        var lhs, rhs;
        switch (code[0]) {
          case "LIST":
            const result = [];
            for (var item of code.slice(1)) {
              result.push(evaluate(state, card, item))
            }
            return result;
          case "AND":
            for (var i=1; i< code.length; i++) {
              if (!evaluate(state, card, code[i])) return false;
            }
            return true;
          case "OR":
            for (var i=1; i< code.length; i++) {
              if (evaluate(state, card, code[i])) return true;
            }
            return false;
          case "EQUAL":
            return evaluate(state, card, code[1]) == evaluate(state, card, code[2])
          case "LESS_THAN":
            lhs = evaluate(state, card, code[1]) || 0;
            rhs = evaluate(state, card, code[2]) || 0;
            return lhs < rhs;
          case "GREATER_THAN":
            lhs = evaluate(state, card, code[1]) || 0;
            rhs = evaluate(state, card, code[2]) || 0;
            return lhs > rhs;
          case "LESS_EQUAL":
            lhs = evaluate(state, card, code[1]) || 0;
            rhs = evaluate(state, card, code[2]) || 0;
            return lhs <= rhs;
          case "GREATER_EQUAL":
            lhs = evaluate(state, card, code[1]) || 0;
            rhs = evaluate(state, card, code[2]) || 0;
            return lhs >= rhs;
          case "NOT_EQUAL":
            lhs = evaluate(state, card, code[1]) || 0;
            rhs = evaluate(state, card, code[2]) || 0;
            return lhs != rhs;
          case "IN_STRING":
            lhs = evaluate(state, card, code[1]) || "";
            rhs = evaluate(state, card, code[2]) || "";
            return lhs.includes(rhs);
          case "OBJ_GET_BY_PATH":
            const obj = evaluate(state, card, code[1])
            const path = evaluate(state, card, code[2])
            console.log("equal 3",code,obj,path)
            if (!path || path.length === 0) {
              return null;
            } else if (path[0] === "currentFace") {
              return obj.sides[obj.currentSide];
            } else if (path[0] === "parentCard") {
              if (!obj.parentCardId) return null;
              return state.gameUi.game.cardById[card.parentCardId];
            } else if (path[0] === "parentCardIds") {
              if (!obj.stackIds) return null;
              const stackIds = obj.stackIds;
              const parentCardIds = [];
              for (var stackId of stackIds) {
                const cardIds = state.gameUi.game.stackById[stackId].cardIds;
                if (!cardIds || cardIds.length === 0) continue;
                parentCardIds.push(cardIds[0]);
              }
              return parentCardIds;
            } else if (path[0] === "parentCards") {
              if (!obj.stackIds) return null;
              const stackIds = obj.stackIds;
              const parentCards = [];
              for (var stackId of stackIds) {
                const cardIds = state.gameUi.game.stackById[stackId].cardIds;
                if (!cardIds || cardIds.length === 0) continue;
                parentCards.push(state.gameUi.game.cardById[cardIds[0]]);
              }
              return parentCards;
            } else if (path[0].startsWith("[") && path[0].endsWith("]")) {
              const index = parseInt(path[0].substring(1, path[0].length-1));
              return obj[index];
            } else if (path.length === 1) {
              console.log("equal 4",obj[path[0]])
              return obj[path[0]];
            } else {
              const newObj = obj[path[0]];
              const newPath = path.slice(1);
              newPath.unshift("LIST");
              console.log("equal 4",newObj,newPath)
              return evaluate(state, card, ["OBJ_GET_BY_PATH", newObj, newPath])
            }
        }
      }
    } else { // value
      if (code === "$GAME")
        return state.gameUi.game;
      else if (code === "$PLAYER_N")
        return state.playerUi.playerN;
      else if (code === "$ACTIVE_CARD")
        return card;
      else if (code === "$ACTIVE_FACE")
        return card.sides[card.currentSide];
      else if (code === "$ACTIVE_TOKENS")
        return card.tokens;
      else if (isString(code) && code.startsWith("$") && code.includes(".")) {
        const list = code.split('.')
        const obj = evaluate(state, card, list[0])
        const newList = list.slice(1);
        newList.unshift("LIST")
        return evaluate(state, card, ["OBJ_GET_BY_PATH", obj, newList])
      } else {
        return code;
      }
    }
  }
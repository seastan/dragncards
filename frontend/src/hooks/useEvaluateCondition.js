import { useSelector } from "react-redux";
import store from "../store";

export const useEvaluateCondition = () => {
  const state = useSelector(state => state);

  const isPath = (path) => {
    return Array.isArray(path) && ["_GAME", "_ACTIVE_CARD", "_ACTIVE_FACE", "_ITEM"].includes(path[0]);
  }

  const getValueFromKeylistSegment = (object, keylistSegment) => {
    //console.log("testcase",object, keylistSegment)
    if (!Array.isArray(keylistSegment)) return null;
    if (keylistSegment.length === 0) return null;
    const key = keylistSegment[0];
    if (keylistSegment.length === 1) return object[key];
    else {
      keylistSegment.shift();
      return getValueFromKeylistSegment(object[key], keylistSegment);
    }
  }

  const getValueFromKeylist = (object, keylist) => {
    //console.log("testcase",object, keylist)
    if (!Array.isArray(keylist)) return null;
    if (keylist.length === 0) return null;
    const key = keylist[0];
    if (key === "playerUi") {
      keylist.shift();
      return getValueFromKeylistSegment(state.playerUi, keylist);
    } else return getValueFromKeylistSegment(state.gameUi.game, keylist);
  }

  const getNestedValue = (object, path) => {
    console.log("eval getNestedValue",object,path)
    if (isPath(path)) {
      const keylist = getKeylistFromPath(object, path);
      return getValueFromKeylist(object, keylist);
    } else {
      const value = path;
      return value;
    }
  }
  
  const flattenPath = (object, path) => {
    const flattened = [];
    for (var key of path) {
      if (Array.isArray(key)) {
        flattened.push(getNestedValue(object, key));
      } else if (key === "_ACTIVE_CARD") {
        flattened.push(...flattenPath(state, ["_GAME", "cardById", ["_GAME", "playerUi", "activeCardId"]]));
      } else if (key === "_ACTIVE_FACE") {
        flattened.push(...flattenPath(state, ["_ACTIVE_CARD", "sides", ["_ACTIVE_CARD", "currentSide"]]));
      } else {
        flattened.push(key);
      }
    }
    return flattened;
  }
  
  const getKeylistFromPath = (object, path) => {
    const flatPath = flattenPath(object, path)
    console.log("eval flattened ", path," to ",flatPath)
    flatPath.shift();
    //console.log("eval getKeylistFromPath", flatPath)
    return flatPath;
  }

  const evaluateCondition = (condition) => {
    // console.log("testcase0", getNestedValue(state, ["_GAME", "cardById"]))
    // console.log("testcase1", getNestedValue(state, ["_GAME", "cardById", "afb7e686715f"]))
    // console.log("testcase2", getNestedValue(state, ["_GAME", "cardById", "afb7e686715f", "inPlay"]))
    console.log("eval",condition)
    if (condition.length === 3) {
      var lhs = condition[0]
      const operator = condition[1]
      var rhs = condition[2]
      console.log("eval operator",operator,["AND","OR"].includes(operator))
      lhs = ["AND","OR"].includes(operator) ? lhs : getNestedValue(state, lhs)
      rhs = ["AND","OR"].includes(operator) ? rhs : getNestedValue(state, rhs)
      console.log("eval lhs", lhs)
      console.log("eval rhs", rhs)
      switch (operator) {
        case "==":
          return lhs == rhs;
        case "!=":
          return lhs != rhs;
        case ">":
          return (typeof lhs === "number") && (typeof rhs === "number") && lhs > rhs;
        case "<":
          return (typeof lhs === "number") && (typeof rhs === "number") && lhs < rhs;
        case ">=":
          return  (typeof lhs === "number") && (typeof rhs === "number") && lhs >= rhs;
        case "<=":
          return  (typeof lhs === "number") && (typeof rhs === "number") && lhs <= rhs;
        case "IN_STRING":
          return  (typeof lhs === "string") && (typeof rhs === "string") && rhs.includes(lhs);
        case "CONTAINS_IN_STRING":
          return (typeof lhs === "string") && (typeof rhs === "string") && rhs.includes(lhs);
        case "IN_LIST":
          return Array.isArray(rhs) && rhs.includes(lhs);
        case "CONTAINS_IN_LIST":
          return Array.isArray(lhs) && lhs.includes(rhs);
        case "AND":
          return evaluateCondition(lhs) && evaluateCondition(rhs);
        case "OR":
          return evaluateCondition(lhs) || evaluateCondition(rhs);
        default:
          return false;
      }
    } else return false;
  }
  return evaluateCondition;
}
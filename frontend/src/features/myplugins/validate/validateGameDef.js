import exp from "constants"
import { sub } from "date-fns"

export const gameDefTypeError = (path, expected, actual) => {
  return `Invalid type for ${path}. Expected ${expected}, got ${actual}`
}
export const gameDefMissingError = (path, key) => {
  return `Missing required key in ${path}: ${key}`
}

export const mytypeof = (val) => {
  if (Array.isArray(val)) {
      return "array";
  } else if (val === null) {
      return "null";
  } else if (val instanceof Date) {
      return "date";
  } else if (typeof val === "function") {
      return "function";
  } else if (val instanceof Object) {
      return "object";
  } else if (Number.isNaN(val)) {
      return "NaN";
  } else if (Number.isInteger(val)) {
      return "integer";
  } else if (typeof val === "number") {
      if (!isFinite(val)) {
          return "infinity";
      } else {
          return "float";
      }
  } else if (typeof val === "string") {
      return "string";
  } else if (typeof val === "boolean") {
      return "boolean";
  } else if (typeof val === "undefined") {
      return "undefined";
  } else {
      return "unknown";
  }
}

const doesTypeMatch = (exp, act) => {
  if (exp === "any") {
    return true;
  } else if (exp === act) {
    return true;
  } else if (exp === "float" && act === "integer") {
    return true;
  } else if (exp === "actionList" && act === "array") {
    return true;
  } else if (exp === "actionList" && act === "string") {
    return true;
  } else if (exp === "code") {
    return true;
  } else if (exp === "option" && act === "string") {
    return true;
  } else {
    return false;
  }
}

const camelCaseToSentence = (str) => {
  // Split on capitalized letters, add spaces, and capitalize first letter of each word
  var splitStr = str.split(/(?=[A-Z])/).map(function(word, index) {
      // Capitalize the first letter of the word and join it with the rest of the string
      word = word.charAt(0).toUpperCase() + word.slice(1);
      
      // For words that are purely numbers, we don't add a space before them
      if (!isNaN(word)) {
          return word;
      }
      
      // For the rest of the words, we add a space before them
      return " " + word;
  });

  // Join all the words together and trim the leading space
  return splitStr.join("").trim();
}

export const validateSchema = (gameDef, path, data, schema, errors) => {
  // console.log(`Validating ${path}...`);
  // console.log(`Schema: ${schema}`);
  // Check if schema is undefined
  if (schema === undefined) {
    errors.push(`Undefined schema for ${path}`);
    return;
  }
  
  // Get expected type
  const expectedType = schema._type_;

  // If type is any, return
  if (expectedType === "any") return;

  // Check for label
  if (expectedType === "label") {
    if (mytypeof(data) !== "string") {
      errors.push(gameDefTypeError(path, "string", mytypeof(data)));
      return;
    }
    if (data.startsWith("id:")) {
      // Cut out "id:" and check if the remaining string is a valid id
      const labelId = data.substring(3);
      if (!gameDef.labels[labelId]) {
        if (errors[0] !== "Missing label ids (and suggestions):") errors.unshift("Missing label ids (and suggestions):");
        //errors.push(`Invalid label in ${path}: "${data}". "${labelId}" must be present in gameDef.labels.`);
        errors.splice(1, 0, `"${labelId}": {"English": "${camelCaseToSentence(labelId)}"},`);
        return;
      }
    }
    return;
  }

  // Handle groupId
  if (expectedType === "groupId") {
    if (mytypeof(data) !== "string") {
      errors.push(`Invalid key in ${path}: "${data}". Key must be present in gameDef.groups.`);
      return;
    }
    // Replace "{playerN}" or "{playerN+#}" with "player1"
    var reformattedGroupId = data.replace(/{playerN+(\+\d+)?}/, "player1");
    // Replace "playerN" or "playerN+#" with "player1"
    reformattedGroupId = reformattedGroupId.replace(/playerN+(\+\d+)?/, "player1");
    // Check if the group is in gameDef.groups
    if (!gameDef.groups[reformattedGroupId]) {
      errors.push(`Invalid key in ${path}: "${data}". Key must be present in gameDef.groups.`);
      return;
    }
    return;
  }

  // Check type mismatch
  if (doesTypeMatch(expectedType, mytypeof(data)) == false) {
 
      // Check if nullable
      if (schema._nullable_ && data === null) {
          return;
      }

      // Incorrect type
      errors.push(gameDefTypeError(path, expectedType, mytypeof(data)));
      return;
  }

  // TODO: Check for memberOf
  if (schema._memberOf_ && !schema._memberOf_.includes(data)) {
      
    // Special exception for loadGroupIds - you can start a group with "playerN" 
    // even if it is not in gameDef.groups, and it will be resolved at load time.
    if (path.includes("loadGroupId") && data.startsWith("playerN"))
      return;

    errors.push(`Invalid key in ${path}: "${data}". Key must be present in ${schema._memberOfPath_}.`);
    return;
}

  // TODO: Validate actionList
  if (expectedType === "actionList") {
    return;
  }  
  // TODO: Validate code
  if (expectedType === "code") {
    return;
  }

  // Matching type, now treat based on type
  if (mytypeof(data) === "object") {

    // Check if all keys are valid
    for (var [key, item] of Object.entries(data)) {

      // Ignore underscore keys
      if (key.startsWith("_")) continue;
    
      // Do not allow any extra keys
      if (schema._strictKeys_ && !schema[key]) {
          errors.push(`Invalid key in ${path}: ${key}. Valid keys are: ${Object.keys(schema).filter(k => !k.startsWith("_")).join(", ")}`);
          continue;
      }

      // If key is in the schema, use that key's schema
      if (schema[key]) {
        // Some data types are defined in the game definition itself
        const subSchema = {...schema[key]};
        if (subSchema._type_ === "selfType") {
          subSchema._type_ = data.type;
        }
        // Validate the nested part of the game definition
        validateSchema(gameDef, `${path}.${key}`, item, subSchema, errors);
      } else if (!schema._itemSchema_) {
        // If there is no item schema, then this is an error
        errors.push(`Invalid key in ${path}: ${key}. Valid keys are: ${Object.keys(schema).filter(k => !k.startsWith("_")).join(", ")}.`);
      // Otherwise, use the general item schema
      } else {
        // Validate the nested part of the game definition
        validateSchema(gameDef, `${path}.${key}`, item, schema._itemSchema_, errors);
      }
    }

    // Check if all required keys are present
    for (var [key, item] of Object.entries(schema)) {

      // Ignore underscore keys
      if (key.startsWith("_")) continue;

      //console.log(key, item);
      if (item._required_ && data[key] === undefined) {
          errors.push(`Missing required key in ${path}: ${key}`);
      }
    }
  }

  else if (mytypeof(data) === "array") {

    // Check if all keys are valid
    for (var i=0; i<data.length; i++) {
      const item = data[i];
      // Validate the nested part of the game definition
      validateSchema(gameDef, `${path}[${i}]`, item, schema._itemSchema_, errors);
    }
  }

}
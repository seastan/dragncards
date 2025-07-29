import { validateSchema } from "./validate/validateGameDef";
import { isObject } from "../store/updateValues";


export const readFileAsText = (file) => {
  return new Promise(function(resolve,reject){
    let fr = new FileReader();

    fr.onload = function(){
        resolve(fr.result);
    };

    fr.onerror = function(){
        reject(fr);
    };

    fr.readAsText(file);
  });
}


export const deepMerge = (obj1, obj2) => {
// If they are already equal, we are done
if (obj1 === obj2) return;
// If obj1 does not exist, set it to obj2
if (!obj1) {
  obj1 = obj2;
  return;
}
// The we loop through obj2 properties and update obj1
for (var p in obj2) {
  // Ignore prototypes
  if (!obj2.hasOwnProperty(p)) continue;
  // If property does not exists in obj1, add it to obj1
  if (!obj1.hasOwnProperty(p)) {
    obj1[p] = obj2[p];
    continue;
  }
  // Both objects have the property
  // If they have the same strict value or identity then no need to update
  if (obj1[p] === obj2[p]) continue;
  // Objects are not equal. We need to examine their data type to decide what to do
  if (Array.isArray(obj1[p]) && Array.isArray(obj2[p])) {
    console.log("Merging arrays: ",p, obj1[p], obj2[p])
    // Both values are arrays. Concatenate them.
    obj1[p] = [...obj1[p], ...obj2[p]];
    console.log("Merged arrays: ",p, obj1[p])
  } else if (isObject(obj1[p]) && isObject(obj2[p])) {
    // Both values are objects
    deepMerge(obj1[p], obj2[p]);
  }
}
} 

const removeComments = (json) => {
  let insideString = false;
  let result = '';
  
  for (let i = 0; i < json.length; i++) {
    let currentChar = json[i];
    let nextChar = json[i + 1];

    // Toggle the insideString flag when encountering unescaped double quotes
    if (currentChar === '"' && json[i - 1] !== '\\') {
      insideString = !insideString;
    }

    // If we're not inside a string, and we encounter //, ignore the comment
    if (!insideString && currentChar === '/' && nextChar === '/') {
      // Skip to the end of the line
      while (i < json.length && json[i] !== '\n') {
        i++;
      }
      continue;
    }

    result += currentChar;
  }
  
  return result;
};

export const mergeJSONs = (jsonList) => {
  const objList = jsonList.map((json, idx) => {
    try {
      return JSON.parse(removeComments(json));
    } catch (error) {
      throw new Error(`Error parsing JSON in file: ${jsonList[idx].fileName}, ${error.message}`);
    }
  });

  const mergedObj = mergeObjects(objList);
  return mergedObj;
}

export const mergeObjects = (objList) => {
  const obj0 = objList[0];
  for (var i = 1; i < objList.length; i++) {
    deepMerge(obj0, objList[i]);
  }
  return obj0;
}

export const stringTo2DArray = (inputString) => {
    // Split the input string into tokens using the tab character
    const tokens = inputString.split('\t');
  
    // Determine the number of columns based on the number of tabs in the header row
    const numColumns = inputString.split('\n')[0].split('\t').length;
  
    // Initialize an empty 2D array and the current row array
    const array2D = [];
    let currentRow = [];

    console.log("tsv tokens", tokens)
  
    // Iterate through each token
    for (let token of tokens) {
      if (currentRow.length === numColumns - 1) {
        console.log("tsv last token in row", token, token==="")
        // If token does not contain '\n', push the token
        const values = token.split('\n');
        // if (values.length < 2) {
        //   throw new Error(`Invalid TSV format at the end of line: ${array2D.length + 2}`);
        // }
        console.log("tsv last values in row", values)
        // Trim the last value, rejoin the rest
        const prefix = values.slice(0, values.length - 1).join('\n');
        const suffix = values[values.length - 1];
        currentRow.push(prefix);
        console.log("tsv currentRow", currentRow)
        array2D.push(currentRow);
        currentRow = [suffix];
      } else {
        currentRow.push(token);
      }
  
    }
  
    // Add the last row to the 2D array if it has the correct number of columns
    if (currentRow.length === numColumns) {
      array2D.push(currentRow);
    }
  
    return array2D;
  }


export const processArrayOfRows = (gameDef, arrayOfRows) => {

    const cardDb = {};
    var multiSidedDbId = undefined;
    var multiSidedFace = "A";
    const errors = [];
    for (var rows of arrayOfRows) {
      const header0 = rows[0];
      if (!header0.includes("databaseId")) throw new Error("Missing databaseId column.")
      if (!header0.includes("name")) throw new Error("Missing name column.")
      if (!header0.includes("imageUrl")) throw new Error("Missing imageUrl column.")
      if (!header0.includes("cardBack")) throw new Error("Missing cardBack column.")
      if (!header0.includes("type")) throw new Error("Missing type column.")
      const header0Str = JSON.stringify(header0);
      const headerStr = JSON.stringify(rows[0]);
      if (headerStr !== header0Str) throw new Error("File headers do not match.")
      console.log(`Processing file with ${rows.length} rows and headers: `, header0)
      for (var i=1; i<rows.length; i++) {
        const row = rows[i];
        const face = {};
        for (var j=0; j<header0.length; j++) {
            const colName = header0[j].replace(/\r$/, '');
            face[colName] = row[j].replace(/\r$/, '');
        }
        // If face.type is missing, add an error
        if (!face["type"] || face["type"] === "") {
          errors.push(`Missing type for ${face.name}`)
        }
        // If face.type is not in gameDef.cardTypes, add an error
        if (gameDef && face["type"] && !Object.keys(gameDef?.cardTypes).includes(face["type"])) {
          errors.push(`type ${face.type} for ${face.name} not found in gameDef.cardTypes`)
        }
        const dbId = face.databaseId;
        console.log("Processing face: ", face)
        console.log({dbId, multiSidedDbId})
        // Is this a multi-side of a previous card?
        if (dbId === multiSidedDbId) {
          // If database_id is not in db, raise an error
          if (!cardDb[dbId]) throw new Error(`databaseId ${dbId} not found in cardDb`)
          cardDb[dbId][multiSidedFace] = face;
          if (multiSidedFace === "B") {
            multiSidedFace = "C";
          } else if (multiSidedFace === "C") {
            multiSidedFace = "D";
          } else if (multiSidedFace === "D") {
            multiSidedFace = "E";
          } else if (multiSidedFace === "E") {
            multiSidedFace = "F";
          } else if (multiSidedFace === "F") {
            multiSidedFace = "G";
          } else if (multiSidedFace === "G") {
            multiSidedFace = "H";
          } else if (multiSidedFace === "H") {
            multiSidedFace = "I";
          } else {
            throw new Error(`Too many sides for databaseId ${dbId}`)
          }
        } else {
          if (cardDb[dbId]) {
            // If database_id is already in db, raise an error
            throw new Error(`Duplicate databaseId ${dbId} for a non-multi_sided card`)
          }
          const faceA = face;
          var faceB = {};
          for (var key of header0) {
              faceB[key] = null;
          }
          if (gameDef && faceA.cardBack !== "multi_sided") {
            if (!gameDef?.cardBacks || !Object.keys(gameDef.cardBacks).includes(faceA.cardBack)) throw new Error(`cardBack for ${faceA.name} (${faceA.cardBack}) not found in gameDef.cardBacks`)
          }
          faceB["name"] = faceA.cardBack;
          cardDb[faceA.databaseId] = {
              "A": faceA,
              "B": faceB
          }
          console.log("Adding card to cardDb: ", cardDb[faceA.databaseId])
          if (faceA.cardBack === "multi_sided") {
            multiSidedDbId = faceA.databaseId;
            multiSidedFace = "B";
          } else {
            multiSidedDbId = undefined;
            multiSidedFace = "A";
          }
        }
        
      }
    }
    return {errors, cardDb};
}

export const importCardDbTsv = async (gameDef, files) => {
  let status = "fail";
  let messages = [];
  let cardDb = null;

  // Abort if there were no files selected
  if (!files.length) {
    messages.push("No files selected.");
    return { status, messages, cardDb };
  }

  let readers = [];

  // Abort if there were no files selected
  if(!files.length) return;

  // Store promises in array
  for(let i = 0; i < files.length; i++){
      readers.push(readFileAsText(files[i]));
  }

  // Trigger Promises
  try {
    const tsvList = await Promise.all(readers);
    console.log("unmerged", tsvList);
    const arrayOfRows = []; // Each element is a 2D array representing a TSV file

    for (const tsvString of tsvList) {
      console.log("tsvString", tsvString);
      try {
        const rows = stringTo2DArray(tsvString);
        console.log("tsvString rows", rows);
        arrayOfRows.push(rows);
      } catch (err) {
        console.log("Error", err);
        if (err.message.includes("data does not include separator"))
          messages.push("Invalid file format. Make sure the data is tab-separated.");
        return { status, messages, cardDb };
      }
    }

    // Processing the array of rows
    const result = processArrayOfRows(gameDef, arrayOfRows);
    console.log("result", result);
    if (result.errors.length) {
      messages.push(...result.errors);
      return { status, messages, cardDb };
    } else {
      cardDb = result.cardDb;
      messages.push(`Card database uploaded successfully: ${Object.keys(cardDb).length} cards.`);
      status = "success";
    }

  } catch (err) {
    messages.push(err.message);
  }

  return { status, messages, cardDb };
};


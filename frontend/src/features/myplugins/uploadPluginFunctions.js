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

export const mergeJSONs = (jsonList) => {
  // Convert to list of objects
  console.log("merging objects 1: ", jsonList.length)
  const objList = jsonList.map(json => JSON.parse(json));
  // Merge the objects
  console.log("merging objects 2: ", objList)
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
  
    // Iterate through each token
    for (let token of tokens) {
      // Split the token into values based on newline characters
      const values = token.split('\n');
  
      // Add the first value to the current row
      currentRow.push(values[0]);
  
      // If there are more values, it means there's a new row
      for (let i = 1; i < values.length; i++) {
        // Add the current row to the 2D array if it has the correct number of columns
        if (currentRow.length === numColumns) {
          array2D.push(currentRow);
        }
  
        // Start a new row with the current value
        currentRow = [values[i]];
      }
    }
  
    // Add the last row to the 2D array if it has the correct number of columns
    if (currentRow.length === numColumns) {
      array2D.push(currentRow);
    }
  
    return array2D;
  }


export const processArrayOfRows = (inputs, plugin, arrayOfRows, errors) => {

    const gameDef = plugin?.gameDef || inputs.gameDef;
    const cardDb = {};
    var multiSidedDbId = "";
    var multiSidedFace = "A";
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
      console.log("Processing file with headers: ", header0)
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
        if (face["type"] && !Object.keys(gameDef?.cardTypes).includes(face["type"])) {
          errors.push(`type ${face.type} for ${face.name} not found in gameDef.cardTypes`)
        }
        const dbId = face.databaseId;
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
          const faceA = face;
          var faceB = {};
          for (var key of header0) {
              faceB[key] = null;
          }
          if (faceA.cardBack !== "multi_sided") {
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
            multiSidedDbId = "";
            multiSidedFace = "A";
          }
        }
        
      }
    }
    return cardDb;
}

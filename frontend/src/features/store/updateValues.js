export const isObject = (item) => {
  return (typeof item === "object" && !Array.isArray(item) && item !== null);
}

export const isString = (item) => {
  return (typeof item === 'string' || item instanceof String);
}
  
export const arraysEqual = (a, b) => {
  /* WARNING: only works for arrays of primitives */
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const updateByDelta = (obj, delta_with_metadata, direction) => {
  if (delta_with_metadata === null) return;
  // Ignore _delta_metadata
  const delta = {...delta_with_metadata};
  delete delta._delta_metadata;

  // The we loop through delta properties and update obj
  for (var p in delta) { 
    // Ignore prototypes
    if (!delta.hasOwnProperty(p)) continue; 
    if (isObject(delta[p])) {
      updateByDelta(obj[p],delta[p], direction)
    } else {    
      const newVal = direction === "undo" ? delta[p][0] : delta[p][1];
      if (newVal === ":removed") {
        delete obj[p];
      } else {
        obj[p] = newVal;
      }
    }
  }
}

// export const updateByDelta = (map, delta, direction) => {
//   // Check if both map and delta are objects
//   if (isObject(map) && isObject(delta)) {
//     // Remove the 'unix_ms' key from delta
//     delete delta.unix_ms;

//     // Loop over keys in delta and apply the changes to the map
//     return Object.keys(delta).reduce((acc, k) => {
//       if (typeof delta[k] === 'object' && delta[k] !== null && !Array.isArray(delta[k])) {
//         // If the value is an object, apply applyDelta recursively
//         acc[k] = applyDelta(map[k] || {}, delta[k], direction);
//       } else {
//         // If the value is an array, apply the undo or redo operation
//         const newVal = direction === 'undo' ? delta[k][0] : delta[k][1];
//         if (newVal === ':removed') {
//           // If the new value is ':removed', delete the key from the map
//           delete acc[k];
//         } else {
//           // Otherwise, update the value in the map
//           acc[k] = newVal;
//         }
//       }
//       return acc;
//     }, {...map});
//   } else {
//     // If either map or delta isn't an object, return map as it is
//     return map;
//   }
// }

  
export const deepUpdate = (obj1, obj2) => {
  // If they are already equal, we are done
  if (obj1 === obj2) return;
  // If obj1 does not exist, set it to obj2
  if (!obj1) {
    obj1 = obj2;
    return;
  }
  // // Optimize sides
  // if (!obj2 && obj1?.A && obj2?.B) {
  //   console.log("not updating",obj1,obj2)
  //   return;
  // }
  // If obj2 does not exist, update obj1
  if (!obj2) {
    obj1 = obj2;
    return;
  }
  // Don't update obj1 if obj2 was actually submitted to the backend before obj1's most recent update.
  // if (obj1?.lastUpdated && submittedTimestamp && obj1.lastUpdated > submittedTimestamp) {
  //   return;
  // }
  // First we delete properties from obj1 that no longer exist
  for (var p in obj1) {
    //// Ignore prototypes
    //if (!obj1.hasOwnProperty(p)) continue;
    // If property no longer exists in obj2, delete it from obj1
    if (!obj2.hasOwnProperty(p)) {
      delete obj1[p]
      continue;
    }
  }
  // The we loop through obj2 properties and update obj1
  for (var p in obj2) {
    // Ignore prototypes
    //if (!obj2.hasOwnProperty(p)) continue;
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
      // Both values are arrays
      if (!arraysEqual(obj1[p],obj2[p])) {
        // Arrays are not equal, so update
        obj1[p] = obj2[p];
      }
    } else if (isObject(obj1[p]) && isObject(obj2[p])) {
      // Both values are objects
      deepUpdate(obj1[p], obj2[p]);
    } else if (p === "sides" && obj2[p] === null) {
      // Sides are static, they should never change, so most of the time the backend sends them as null
      continue; 
    } else {
      // One of the values is not an object/array, so it's a basic type and should be updated
      obj1[p] = obj2[p];
    }
  }
} 
  
const updateValue = (obj, update) => {
  const updateLength = update.length;
  if (updateLength === 2) {
    obj[update[0]] = update[1];
    const unix_ms = Math.floor(Date.now());
    obj["lastUpdated"] = unix_ms;
    console.log("objupdate",obj["lastUpdated"], update[0], update[1])
  } else if (updateLength > 2) {
    console.log("objupdate",obj, update[0], update.slice(1))
    updateValue(obj[update[0]], update.slice(1));
  }
}

export const updateValues = (obj, updates) => {
  for (var update of updates) updateValue(obj, update);
}
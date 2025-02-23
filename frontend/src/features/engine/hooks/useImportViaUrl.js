import { useGameDefinition } from "./useGameDefinition";
import { usePlayerN } from "./usePlayerN";
import { useImportLoadList } from "./useImportLoadList";
import { useDoActionList } from "./useDoActionList";
import { el } from "date-fns/locale";
import { useCardDb } from "./useCardDb";

export const useImportViaUrl = () => {
  const playerN = usePlayerN();
  const importLoadList = useImportLoadList();
  const gameDef = useGameDefinition();
  const doActionList = useDoActionList();
  const cardDb = useCardDb();
  return async () => {
    if (gameDef["pluginName"].includes("LotR Living Card Game")) {
      await importViaUrlRingsDb(importLoadList, doActionList, playerN);
    } else if (gameDef["pluginName"].includes("Marvel Champions: The Card Game")) {
      await importViaUrlMarvelCdb(importLoadList, doActionList, playerN, cardDb);
    } else if (gameDef["pluginName"].includes("Earthborne Rangers")) {
      await importViaUrlRangersDb(importLoadList, doActionList, playerN, cardDb);
    } else if (gameDef["pluginName"].includes("Arkham Horror Living Card Game")) {
      await importViaUrlArkhamDb(importLoadList, doActionList, playerN, cardDb);
    } else {
      alert("Importing via URL is not yet supported for this game. Please request this feature on Discord.");
    }
  }
}

const importViaUrlRingsDb = async (importLoadList, doActionList, playerN) => {
  const ringsDbUrl = prompt("Paste full RingsDB URL","");
  if (!ringsDbUrl.includes("ringsdb.com")) {
    alert("Only importing from MarvelCDB is supported at this time.");
    return;
  }
  if (ringsDbUrl.includes("/fellowship/")) {
    alert("Fellowship import not yet supported.");
    return;
  }
  const ringsDbDomain = ringsDbUrl.includes("test.ringsdb.com") ? "test" : "ringsdb";
  var ringsDbType;
  if (ringsDbUrl.includes("/decklist/")) ringsDbType = "decklist";
  else if (ringsDbUrl.includes("/deck/")) ringsDbType = "deck";
  if (!ringsDbType) {
    alert("Invalid URL");
    return;
  }
  var splitUrl = ringsDbUrl.split( '/' );
  const typeIndex = splitUrl.findIndex((e) => e === ringsDbType)
  if (splitUrl && splitUrl.length <= typeIndex + 2) {
    alert("Invalid URL");
    return;
  }
  const ringsDbId = splitUrl[typeIndex + 2];
  return loadRingsDb(importLoadList, doActionList, playerN, ringsDbDomain, ringsDbType, ringsDbId);
}

const importViaUrlArkhamDb = async (importLoadList, doActionList, playerN) => {
  const arkhamDbUrl = prompt("Paste full ArkhamDB/arkham.build URL","");
  if (!arkhamDbUrl.includes("arkhamdb.com") && !arkhamDbUrl.includes("arkham.build")) {
    alert("Only importing from ArkhamDB or arkhamdb.com is supported at this time.");
    return;
  }
  var arkhamDbType;
  var typeIndexMod = 2;
  if (arkhamDbUrl.includes("arkhamdb.com") && arkhamDbUrl.includes("/decklist/")) arkhamDbType = "decklist";
  else if (arkhamDbUrl.includes("arkhamdb.com") && arkhamDbUrl.includes("/deck/")) arkhamDbType = "deck";
  else if (arkhamDbUrl.includes("arkham.build") && arkhamDbUrl.includes("/view/")) { arkhamDbType = "view"; typeIndexMod = 1; }
  else if (arkhamDbUrl.includes("arkham.build") && arkhamDbUrl.includes("/share/")) { arkhamDbType = "share"; typeIndexMod = 1; }
  if (!arkhamDbType) {
    alert("Invalid URL");
    return;
  }
  var splitUrl = arkhamDbUrl.split( '/' );
  const typeIndex = splitUrl.findIndex((e) => e === arkhamDbType)
  if (splitUrl && splitUrl.length <= typeIndex + typeIndexMod) {
    alert("Invalid URL");
    return;
  }
  const arkhamDbId = splitUrl[typeIndex + typeIndexMod];
  return loadArkhamDb(importLoadList, doActionList, playerN, arkhamDbType, arkhamDbId);
}

const importViaUrlMarvelCdb = async (importLoadList, doActionList, playerN, cardDb) => {
  const dbUrl = prompt("Paste full MarvelCDB URL","");
  if (!dbUrl.includes("marvelcdb.com")) {
    alert("Only importing from MarvelCDB is supported at this time.");
    return;
  }
  const dbDomain = "marvelcdb";
  var dbType;
  if (dbUrl.includes("/decklist/")) dbType = "decklist";
  else if (dbUrl.includes("/deck/")) dbType = "deck";
  if (!dbType) {
    alert("Invalid URL");
    return;
  }
  var splitUrl = dbUrl.split( '/' );
  const typeIndex = splitUrl.findIndex((e) => e === dbType)
  if (splitUrl && splitUrl.length <= typeIndex + 2) {
    alert("Invalid URL");
    return;
  }
  const dbId = splitUrl[typeIndex + 2];
  return loadMarvelCdb(importLoadList, doActionList, playerN, dbDomain, dbType, dbId, cardDb);
}

const importViaUrlRangersDb = async (importLoadList, doActionList, playerN, cardDb) => {
  const dbUrl = prompt("Paste full RangersDB URL","");
  if (!dbUrl.includes("rangersdb.com")) {
    alert("Only importing from RangersDB is supported at this time.");
    return;
  }
  const dbDomain = "rangersdb";
  var dbType = "decks";
  var splitUrl = dbUrl.split( '/' );
  const typeIndex = splitUrl.findIndex((e) => e === dbType)
  if (splitUrl && splitUrl.length <= typeIndex + 2) {
    alert("Invalid URL");
    return;
  }
  const dbId = splitUrl[typeIndex + 2];
  return loadRangersDb(importLoadList, doActionList, playerN, dbDomain, dbType, dbId, cardDb);
}


export const loadRingsDb = (importLoadList, doActionList, playerN, ringsDbDomain, ringsDbType, ringsDbId) => {
  doActionList(["LOG", "$ALIAS_N", " is importing a deck from RingsDB."]);
  const urlBase = ringsDbDomain === "test" ? "https://test.ringsdb.com/api/" : "https://www.ringsdb.com/api/"
  const url = ringsDbType === "decklist" ? urlBase+"public/decklist/"+ringsDbId+".json" : urlBase+"oauth2/deck/load/"+ringsDbId;
  console.log("Fetching ", url);
  fetch(url)
  .then(response => response.json())
  .then((jsonData) => {
    // jsonData is parsed json object received from url
    const slots = jsonData.slots;
    const sideslots = jsonData.sideslots;
    var loadList = [];
    var fetches = [];
    Object.keys(slots).forEach((slot, slotIndex) => {
      const quantity = slots[slot];
      const slotUrl = urlBase+"public/card/"+slot+".json"
      fetches.push(fetch(slotUrl)
        .then(response => response.json())
        .then((slotJsonData) => {
          // jsonData is parsed json object received from url
          console.log("ringsdbimport", slotJsonData.name, slotJsonData)
          if (slotJsonData.name.includes("MotK")) {
            alert("You will need to search your deck for your MotK hero.")
          } else if (slotJsonData.octgnid) {
            const type = slotJsonData.type_name;
            var loadGroupId = (type === "Hero" || type === "Contract") ? playerN+"Play1" : playerN+"Deck";
            if (slotJsonData.text.includes("Encounter")) loadGroupId = playerN+"Sideboard";
            console.log("ringsdbimport", slotJsonData.name, slotJsonData)
            loadList.push({'databaseId': slotJsonData.octgnid, 'quantity': quantity, 'loadGroupId': loadGroupId});
          } else {
            alert("Encountered unknown card ID for "+slotJsonData.name)
          }
        })
        .catch((error) => {
          // handle your errors here
          console.error("Could not find card", slot);
        })
      )
    })
    Object.keys(sideslots).forEach((slot, slotIndex) => {
      const quantity = sideslots[slot];
      const slotUrl = urlBase+"public/card/"+slot+".json"
      fetches.push(fetch(slotUrl)
        .then(response => response.json())
        .then((slotJsonData) => {
          // jsonData is parsed json object received from url
          if (slotJsonData.octgnid) {
            const loadGroupId = playerN+"Sideboard";
            loadList.push({'databaseId': slotJsonData.octgnid, 'quantity': quantity, 'loadGroupId': loadGroupId});
          } else {
            alert("Encountered unknown card ID for "+slotJsonData.name)
          }
        })
        .catch((error) => {
          // handle your errors here
          console.error("Could not find card", slot);
        })
      )
    })
    Promise.all(fetches).then(function() {
      console.log("loadList 1", loadList)
      importLoadList(loadList);
    });
  })
  .catch((error) => {
    // handle your errors here
    alert("Error loading deck. If you are attempting to load an unpublished deck, make sure you have link sharing turned on in your RingsDB profile settings.")
  })
}

export const loadArkhamDb = (importLoadList, doActionList, playerN, arkhamDbType, arkhamDbId) => {
  const arkhamBuild = arkhamDbType === "view" || arkhamDbType === "share";
  doActionList(["LOG", "$ALIAS_N", " is importing a deck from " + (arkhamBuild ? "arkham.build" : "ArkhamDB") + "."]);
  const urlBase = arkhamBuild ? "https://api.arkham.build/v1/public/share/" : "https://arkhamdb.com/api/public/";
  const url = urlBase + (arkhamBuild ? arkhamDbId : arkhamDbType + "/" + arkhamDbId);
  console.log("Fetching ", url);
  fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    credentials: "omit"
  })
  .then(response => {
    return response.json()
  })
  .then((jsonData) => {
    // jsonData is parsed json object received from url

    var meta = null;

    if (jsonData?.meta && jsonData?.meta?.length > 0) {
      meta = JSON.parse(jsonData?.meta);
    }

    var loadList = [];

    if (jsonData?.investigator_code) {
      var ic = jsonData?.investigator_code;
      var af = meta?.alternate_front;
      var ab = meta?.alternate_back;
      var afl = af ? af.length : 0;
      var abl = ab ? ab.length : 0;
      if (afl > 0 && abl > 0 && af === ab) {
        loadList.push({'databaseId': af, 'quantity': 1, 'loadGroupId': "playerNInvestigator"});
      } else if (afl > 0 && abl > 0) {
        loadList.push({'databaseId': af + ab, 'quantity': 1, 'loadGroupId': "playerNInvestigator"});
      } else if (afl > 0) {
        loadList.push({'databaseId': af + ic, 'quantity': 1, 'loadGroupId': "playerNInvestigator"});
      } else if (abl > 0) {
        loadList.push({'databaseId': ic + ab, 'quantity': 1, 'loadGroupId': "playerNInvestigator"});
      } else {
        loadList.push({'databaseId': ic, 'quantity': 1, 'loadGroupId': "playerNInvestigator"});
      }
    }
    const slots = jsonData?.slots;
    if (slots) {
      for (const [slot, quantity] of Object.entries(slots)) {
        loadList.push({'databaseId': slot, 'quantity': quantity, 'loadGroupId': "playerNDeck"});
      }
    }
    const sideSlots = jsonData?.sideSlots;
    if (sideSlots) {
      for (const [slot, quantity] of Object.entries(sideSlots)) {
        loadList.push({'databaseId': slot, 'quantity': quantity, 'loadGroupId': "playerNSideDeck"});
      }
    }
    var metaActionList = [];
    const extraDeck = meta?.extra_deck;
    if (extraDeck) {
      metaActionList.push(["INCREASE_VAL", "/playerData/" + playerN + "/arkham/showExtraDeck", 1]);
      for (const slot of extraDeck.split(',')) {
        loadList.push({'databaseId': slot, 'quantity': 1, 'loadGroupId': "playerNExtraDeck"});
      }
    }
    metaActionList.push(["SET", "/playerData/" + playerN + "/arkham/deckCustomizable", {}]);
    metaActionList.push(["SET", "/playerData/" + playerN + "/arkham/deckAttachments", {}]);
    if (meta) {
      for (const [key, value] of Object.entries(meta)) {
        if (key.startsWith("cus_")) {
          metaActionList.push(["SET", "/playerData/" + playerN + "/arkham/deckCustomizable/" + key.substring(4), {}]);
          for (const customization of value.split(',')) {
            const customizationValues = customization.split('|');
            const customizationKey = customizationValues.shift();
            customizationValues.unshift("LIST");
            metaActionList.push(["SET", "/playerData/" + playerN + "/arkham/deckCustomizable/" + key.substring(4) + "/" + customizationKey, customizationValues]);
          }
        } else if (key.startsWith("attachments_")) {
          const attachments = value.split(',');
          attachments.unshift("LIST");
          metaActionList.push(["SET", "/playerData/" + playerN + "/arkham/deckAttachments/" + key.substring(12), attachments]);
        }
      }
    }
    const taboo_id = jsonData?.taboo_id;
    if(taboo_id) {
      metaActionList.push(["SET", "/playerData/" + playerN + "/arkham/tabooId", taboo_id]);
    }
    doActionList(metaActionList);
    importLoadList(loadList);
  })
  .catch((error) => {
    // handle your errors here
    alert("Error loading deck. If you are attempting to load an unpublished deck, make sure you have sharing turned on in your " + (arkhamBuild ? "arkham.build deck" : "ArkhamDB profile") + " settings.")
  })
}


export const loadMarvelCdb = (importLoadList, doActionList, playerN, dbDomain, dbType, dbId, cardDb) => {
  doActionList(["LOG", "$ALIAS_N", " is importing a deck from MarvelCDB."]);

  // Generate a mapping from marcelcdbId to databaseId
  const marvelcdbIdTodatabaseId = {};
  Object.keys(cardDb).forEach((databaseId, _databaseIdIndex) => {
    const cardDetails = cardDb[databaseId];
    for (var [side, details] of Object.entries(cardDetails)) {
      if (details.marvelcdbId) {
        marvelcdbIdTodatabaseId[details.marvelcdbId] = databaseId;
      }
    }
  })

  const urlBase = "https://marvelcdb.com/api";
  const url = `${urlBase}/public/${dbType}/${dbId}.json`;// dbType === "decklist" ? urlBase+"public/decklist/"+dbId+".json" : urlBase+"oauth2/deck/load/"+dbId;
  
  fetch(url)
  .then(response => response.json())
  .then((jsonData) => {
    console.log("card db import response", jsonData)
    const itentityCode = jsonData.hero_code;
    const slots = jsonData.slots;
    var loadList = [];
    if (itentityCode && marvelcdbIdTodatabaseId[itentityCode]) {
      const databaseId = marvelcdbIdTodatabaseId[itentityCode];
      loadList.push({'databaseId': databaseId, 'quantity': 1, 'loadGroupId': playerN+"Play1"});
    } else {
      alert("Encountered missing or unknown card ID q identity")
    }
    var fetches = [];
    Object.keys(slots).forEach((slot, slotIndex) => {
      console.log("card db import", slot, slots[slot])
      const quantity = slots[slot];
      const slotUrl = urlBase+"/public/card/"+slot+".json"
      fetches.push(fetch(slotUrl)
        .then(response => response.json())
        .then((slotJsonData) => {
          console.log("card db import", slotJsonData.name, slotJsonData)
          // If slotJsonData.code is in the marvelcdbIdTodatabaseId mapping, use that databaseId
          if (slotJsonData.code && marvelcdbIdTodatabaseId[slotJsonData.code]) {
            const databaseId = marvelcdbIdTodatabaseId[slotJsonData.code];
            // We could add some code here if we want to handle certain car types differently
            loadList.push({'databaseId': databaseId, 'quantity': quantity, 'loadGroupId': playerN+"Deck"});
          } else {
            alert(`Encountered unknown card ID (${slotJsonData.code}) for ${slotJsonData.name}`)
          }
        })
        .catch((error) => {
          // handle your errors here
          console.error("Could not find card", slot);
        })
      )
    })
    Promise.all(fetches).then(function() {
      console.log("card db import loadList", loadList)
      importLoadList(loadList);
    });
  })
  .catch((error) => {
    // handle your errors here
    alert("Error loading deck. If you are attempting to load an unpublished deck, make sure you have link sharing turned on in your RingsDB profile settings.")
  })
}



export const loadRangersDb = (importLoadList, doActionList, playerN, dbDomain, dbType, dbId, cardDb) => {
  doActionList(["LOG", "$ALIAS_N", " is importing a deck from RangersDB."]);
  
  fetch('https://gapi.rangersdb.com/v1/graphql', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `{                                                                                                                                           
          rangers_deck_by_pk(                                                                                                                               
            id: ${dbId}                                                                                                                                        
        ) {                                                                                                                                               
          meta                                                                                                                                            
          awa                                                                                                                                             
          spi                                                                                                                                             
          fit                                                                                                                                             
          foc                                                                                                                                             
          slots                                                                                                                                           
          side_slots                                                                                                                                      
          extra_slots                                                                                                                                     
        }                                                                                                                                                 
      }`
    })
  })                
  .then(res => res.json())
  .then(json => {
    // Convert the object to a string with indentation for readability                                                                                    
    console.log(JSON.stringify(json, null, 2));
    const jsonData = json.data.rangers_deck_by_pk;
    const loadList = [];
    const role = jsonData.meta.role;
    loadList.push({'databaseId': role, 'quantity': 1, 'loadGroupId': playerN+"Role"});
    const slots = jsonData.slots;
    for (const [slot, quantity] of Object.entries(slots)) {
      loadList.push({'databaseId': slot, 'quantity': quantity, 'loadGroupId': playerN+"Deck"});
    }
    const sideSlots = jsonData.side_slots;
    for (const [slot, quantity] of Object.entries(sideSlots)) {
      loadList.push({'databaseId': slot, 'quantity': quantity, 'loadGroupId': playerN+"Sideboard"});
    }
    const extraSlots = jsonData.extra_slots;
    for (const [slot, quantity] of Object.entries(extraSlots)) {
      loadList.push({'databaseId': slot, 'quantity': quantity, 'loadGroupId': playerN+"Sideboard"});
    }
    const awa = jsonData.awa;
    const spi = jsonData.spi;
    const fit = jsonData.fit;
    const foc = jsonData.foc;
    var aspectCardId = null;
    Object.keys(cardDb).forEach((databaseId, _databaseIdIndex) => {
      const details = cardDb[databaseId]?.A;
      console.log("rangersdbimportsides", details)
      if (parseInt(details.AWA) === awa && parseInt(details.SPI) === spi && parseInt(details.FIT) === fit && parseInt(details.FOC) === foc) {
        aspectCardId = databaseId;
      }
    })
    if (aspectCardId) {
      loadList.push({'databaseId': aspectCardId, 'quantity': 1, 'loadGroupId': playerN+"Aspect"});
    }
    importLoadList(loadList);
    console.log("rangersdbimport", loadList)
  });


  // const urlBase = "https://rangersdb.com/api";
  // const url = `${urlBase}/public/${dbType}/${dbId}.json`;// dbType === "decklist" ? urlBase+"public/decklist/"+dbId+".json" : urlBase+"oauth2/deck/load/"+dbId;
  
  // fetch(url)
  // .then(response => response.json())
  // .then((jsonData) => {
  //   console.log("card db import response", jsonData)
  //   const itentityCode = jsonData.investigator_code;
  //   const slots = jsonData.slots;
  //   var loadList = [];
  //   if (itentityCode && marvelcdbIdTodatabaseId[itentityCode]) {
  //     const databaseId = marvelcdbIdTodatabaseId[itentityCode];
  //     loadList.push({'databaseId': databaseId, 'quantity': 1, 'loadGroupId': playerN+"Play1"});
  //   } else {
  //     alert("Encountered missing or unknown card ID for identity")
  //   }
  //   var fetches = [];
  //   Object.keys(slots).forEach((slot, slotIndex) => {
  //     console.log("card db import", slot, slots[slot])
  //     const quantity = slots[slot];
  //     const slotUrl = urlBase+"/public/card/"+slot+".json"
  //     fetches.push(fetch(slotUrl)
  //       .then(response => response.json())
  //       .then((slotJsonData) => {
  //         console.log("card db import", slotJsonData.name, slotJsonData)
  //         // If slotJsonData.code is in the marvelcdbIdTodatabaseId mapping, use that databaseId
  //         if (slotJsonData.code && marvelcdbIdTodatabaseId[slotJsonData.code]) {
  //           const databaseId = marvelcdbIdTodatabaseId[slotJsonData.code];
  //           // We could add some code here if we want to handle certain car types differently
  //           loadList.push({'databaseId': databaseId, 'quantity': quantity, 'loadGroupId': playerN+"Deck"});
  //         } else {
  //           alert(`Encountered unknown card ID (${slotJsonData.code}) for ${slotJsonData.name}`)
  //         }
  //       })
  //       .catch((error) => {
  //         // handle your errors here
  //         console.error("Could not find card", slot);
  //       })
  //     )
  //   })
  //   Promise.all(fetches).then(function() {
  //     console.log("card db import loadList", loadList)
  //     importLoadList(loadList);
  //   });
  // })
  // .catch((error) => {
  //   // handle your errors here
  //   alert("Error loading deck. If you are attempting to load an unpublished deck, make sure you have link sharing turned on in your RingsDB profile settings.")
  // })
}
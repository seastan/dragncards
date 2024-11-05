import React, { useContext, useEffect, useState } from "react";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlugin } from "./hooks/usePlugin";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faDownload, faPlay, faSave, faShare, faTimes, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import axios from "axios";
import { useSelector } from "react-redux";
import { RotatingLines } from "react-loader-spinner";
import { keyClass } from "./functions/common";
import { keyStyle } from "./functions/common";
import { useGameL10n } from "./hooks/useGameL10n";
import { useImportLoadList } from "./hooks/useImportLoadList";
import { useSendLocalMessage } from "./hooks/useSendLocalMessage";
import { useSiteL10n } from "../../hooks/useSiteL10n";

export const DeckbuilderCurrent = React.memo(({
  currentGroupId, 
  setCurrentGroupId, 
  numChanges, 
  setNumChanges, 
  doFetchHash, 
  setHoverCardDetails, 
  modifyDeckList, 
  currentDeck, 
  setCurrentDeck
}) => {
  const gameDef = useGameDefinition();
  const playerN = useSelector(state => state?.playerUi?.playerN)
  const authOptions = useAuthOptions();
  const deckbuilder = gameDef.deckbuilder;
  const commonSpawnGroups = deckbuilder.spawnGroups;
  const importLoadList = useImportLoadList();
  const gameL10n = useGameL10n();
  const cardDb = usePlugin()?.card_db || {};
  const sendLocalMessage = useSendLocalMessage();
  const siteL10n = useSiteL10n();
  const [showAllGroups, setShowAllGroups] = useState(false);
  
  const allSpawnGroups = () => {
    const allGroups = [];
    const allKeys = [];
    for (var [groupId, _value] of Object.entries(gameDef.groups)) {
      allKeys.push(groupId);
      allGroups.push({"loadGroupId": groupId, "label": groupId})
      // If the groupId begins with player1, add a playerN version
      if (groupId.includes("player1")) {
        const playerNversion = groupId.replace("player1", "playerN");
        if (!allKeys.includes(playerNversion)) {
          allKeys.push(playerNversion);
          allGroups.push({"loadGroupId": playerNversion, "label": groupId.replace("player1", "my")})
        }
      }
    }
    // Sort the groups by label
    allGroups.sort((a, b) => (a.label > b.label) ? 1 : -1)
    return allGroups;
  }

  const spawnGroups = showAllGroups ? allSpawnGroups() : commonSpawnGroups;

  useEffect(() => {
    if (numChanges > 10) {
      saveCurrentDeck(false);
      setNumChanges(0);
    }
  }, [numChanges]);

  console.log("Rendering DeckbuilderCurrent", currentDeck);
  if (Object.keys(cardDb).length === 0) return(
    <div className="bg-gray-800" style={{width:"20%"}}>
      <div className="flex h-full w-full items-center justify-center">
        <RotatingLines
          height={100}
          width={100}
          strokeColor="white"/>
      </div>
    </div>
  )

  const saveCurrentDeck = async() => {
    const updateData = {deck: currentDeck}
    console.log("myDecks writing", updateData)
    const res = await axios.patch(`/be/api/v1/decks/${currentDeck.id}`, updateData, authOptions);
    setNumChanges(0);
    doFetchHash((new Date()).toISOString());
  }

  const setDeckPublic = async(val) => {
    const newDeck = {...currentDeck, public: val}
    const updateData = {deck: newDeck}
    console.log("myDecks writing", updateData)
    const res = await axios.patch(`/be/api/v1/decks/${currentDeck.id}`, updateData, authOptions);
    setNumChanges(0);
    setCurrentDeck(newDeck);
    doFetchHash((new Date()).toISOString());
    if (val) sendLocalMessage(newDeck.name + " " + siteL10n("isNowPublic"));
    else sendLocalMessage(newDeck.name + " " + siteL10n("isNowPrivate"));
  }

  const playCurrentDeck = async() => {
  //  const detailedLoadList = [];
    console.log("playing 1", currentDeck.load_list);
    const formattedLoadList = currentDeck.load_list.map((loadListItem) => {
      return({
        ...loadListItem,
        loadGroupId: loadListItem.loadGroupId.replace("playerN", playerN)
      })
    })
    console.log("playing 2", currentDeck.load_list);
    importLoadList(formattedLoadList)
    //dispatch(setShowModal(null))
  }

  const deleteCurrentDeck = async() => {
    const result = window.confirm("Delete this deck?")
    if (!result) return;
    const updateData = {deck: currentDeck}
    console.log("myDecks writing")
    const res = await axios.delete(`/be/api/v1/decks/${currentDeck.id}`, updateData, authOptions);
    setNumChanges(0);
    doFetchHash((new Date()).toISOString());
    setCurrentDeck({});
  }

  const exportCurrentDeck = () => {
    const exportList = [];
    for (var loadListItem of currentDeck.load_list) {
      exportList.push({
        ...loadListItem,
        "_name": cardDb[loadListItem.databaseId]?.A?.name,
      })
    }
    const exportName = currentDeck.name;
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportList, null, 2));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".txt");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  return(
      <div className="bg-gray-800" style={{width:"20%"}}>
        <div className="justify-center p-2 m-2 text-white">
          <div className="justify-center">
            <input 
              autoFocus 
              type="text"
              id="deckNameInput" 
              name="deckNameInput" 
              className="rounded w-full text-black" 
              placeholder={"Deck Name"}
              value={currentDeck.name}
              onChange={(event) => setCurrentDeck({...currentDeck, name: event.target.value})}/>       
          </div>
          <div className="flex justify-center">
            <div className="m-1">
              <div 
                className={keyClass + " m-2 hover:bg-gray-400 cursor-pointer"} 
                style={keyStyle}
                onClick={()=>{saveCurrentDeck()}}>
                  <FontAwesomeIcon icon={faSave}/>
              </div>   
              <div 
                className={keyClass + " m-1 hover:bg-gray-400 cursor-pointer"} 
                style={keyStyle}
                onClick={()=>{playCurrentDeck()}}>
                  <FontAwesomeIcon icon={faPlay}/>
              </div>  
              <div 
                className={keyClass + " m-1 hover:bg-gray-400 cursor-pointer"} 
                style={keyStyle}
                onClick={()=>{exportCurrentDeck()}}>
                  <FontAwesomeIcon icon={faDownload}/>
              </div>
              <div 
                className={keyClass + (currentDeck.public ? " m-1 hover:bg-red-400 bg-red-700 cursor-pointer" : " m-1 hover:bg-gray-400 cursor-pointer")}
                style={keyStyle}
                onClick={()=>{setDeckPublic(!currentDeck.public)}}>
                    <FontAwesomeIcon icon={faShare}/>
              </div>
              <div 
                className={keyClass + " m-1 hover:bg-gray-400 cursor-pointer"} 
                style={keyStyle}
                onClick={()=>{deleteCurrentDeck()}}>
                  <FontAwesomeIcon icon={faTrash}/>
              </div>
            </div>
          </div>
        </div>
        
        {spawnGroups?.map((groupInfo, _groupIndex) => {
          const groupId = groupInfo.loadGroupId;
          const groupLength = currentDeck?.load_list?.filter(obj => obj.loadGroupId === groupId).length;
          return(
            <div>
              <div 
                className={"text-white pl-3 py-1 mt-2 cursor-pointer " + (currentGroupId === groupId ? "bg-red-800" : "bg-gray-900")}
                onClick={() => setCurrentGroupId(groupId)}>
                {gameL10n(groupInfo.label)} ({groupLength})
              </div>
              {currentDeck?.load_list?.map((loadListItem, index) => {
                const databaseId = loadListItem.databaseId;
                if (loadListItem.loadGroupId === groupId)
                return(
                  <div className="relative p-1 bg-gray-700 text-white"
                    onMouseMove={() => {setHoverCardDetails({...cardDb[databaseId], leftSide: false})}}
                    onMouseLeave={() => setHoverCardDetails(null)}>
                    <div
                      className={keyClass + " hover:bg-gray-400 cursor-pointer"}
                      style={keyStyle}
                      onClick={()=>modifyDeckList({...loadListItem, quantity: -loadListItem.quantity}, index)}>
                        <FontAwesomeIcon icon={faTrash}/>
                    </div>
                    <div className="inline-block px-2 max-w-1/2">{loadListItem._name}</div>
                    <div className="absolute p-1 right-0 top-0">
                      <div
                        className={keyClass + " hover:bg-gray-400 cursor-pointer"}
                        style={keyStyle}
                        onClick={()=>modifyDeckList({...loadListItem, quantity: -1}, index)}>
                          <FontAwesomeIcon icon={faChevronLeft}/>
                      </div>
                      <div className="inline-block px-2">{currentDeck.load_list[index].quantity}</div>
                      <div
                        className={keyClass + " hover:bg-gray-400 cursor-pointer"}
                        style={keyStyle}
                        onClick={()=>modifyDeckList({...loadListItem, quantity: 1}, index)}>
                          <FontAwesomeIcon icon={faChevronRight}/>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        <div className="flex justify-center m-2 text-white">
          <div onClick={() => setShowAllGroups(!showAllGroups)} className="py-1 px-2 bg-gray-900 cursor-pointer">
            {showAllGroups ? "Show Common Groups" : "Show All Groups"}
          </div>
        </div>
      </div>
    )
})
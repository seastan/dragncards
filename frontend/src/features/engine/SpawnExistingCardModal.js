import React, {useContext, useEffect, useState} from "react";
import ReactModal from "react-modal";
import { useDispatch, useSelector } from "react-redux";
import useProfile from "../../hooks/useProfile";
import { setShowModal, setTyping } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import BroadcastContext from "../../contexts/BroadcastContext";
import { usePlugin } from "./hooks/usePlugin";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { useImportLoadList } from "./hooks/useImportLoadList";
import { Z_INDEX } from "./functions/common";

const RESULTS_LIMIT = 150;

export const SpawnExistingCardModal = React.memo(({}) => {
  const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
    const dispatch = useDispatch();
    const gameL10n = useGameL10n();
    const myUser = useProfile();
    const playerN = useSelector(state => state?.playerUi?.playerN);
    const plugin = usePlugin();
    const gameDef = useGameDefinition();
    const loadList = useImportLoadList();
    console.log("pluginspawn", plugin)
    const cardDb = plugin?.card_db || {};
    const doActionList = useDoActionList();
    const [loadGroupId, setLoadGroupId] = useState(gameDef?.spawnExistingCardModal?.loadGroupIds[0])

    const [spawnFilteredIDs, setSpawnFilteredIDs] = useState(Object.keys(cardDb));
    if (Object.keys(cardDb).length === 0) return;

    const numCols = gameDef.spawnExistingCardModal?.columnProperties?.length || 2;
    const vwPerCol = 8;

    const handleGroupIdChange = (event) => {
      setLoadGroupId(event.target.value);
    }

    const handleSpawnClick = (cardId) => {
        const cardDetails = cardDb[cardId];
        if (!cardDetails || !playerN) return;
        const cardList = [{'databaseId': cardId, 'quantity': 1, 'loadGroupId': loadGroupId}]
        loadList(cardList);
        doActionList(["LOG", "$ALIAS_N", " spawned "+cardDetails["A"]["name"]+"."])
    }

    const handleSpawnTyping = (event) => {
        const filteredName = event.target.value;
        const filteredIDs = [];
        Object.keys(cardDb).map((cardID, index) => {
          const cardRow = cardDb[cardID]
          const sideA = cardRow["A"]
          const cardName = sideA["name"];
          if (cardName.toLowerCase().includes(filteredName.toLowerCase())) filteredIDs.push(cardID);
        })
        setSpawnFilteredIDs(filteredIDs);
    }

    return(
      <ReactModal
        closeTimeoutMS={200}
        isOpen={true}
        onRequestClose={() => {
          dispatch(setShowModal(null));
          dispatch(setTyping(false));
        }}
        contentLabel="Spawn a card"
        overlayClassName="fixed inset-0 bg-black-50"
        className="insert-auto overflow-auto p-5 bg-gray-700 border mx-auto my-12 rounded-lg outline-none max-h-3/4"
        style={{
          overlay: {
            zIndex: Z_INDEX.Modal
          },
          content: {
            width: vwPerCol*numCols+2+"vw",
            maxWidth: "62vw",
            minWidth: "43vw",
            maxHeight: "85dvh",
            overflowY: "scroll",
          }
        }}>
        <h1 className="mb-2">{gameL10n("Spawn card")}</h1>
        <div><span className="text-white">Load group: </span>
          <select className="form-control mb-1" style={{width:"35%"}} id={"loadGroupId"} name={"loadGroupId"} onChange={(event) => handleGroupIdChange(event)}>
            {gameDef?.spawnExistingCardModal?.loadGroupIds?.map((groupId,_groupIndex) => (
              <option value={groupId}>{gameL10n(gameDef?.groups?.[groupId]?.label)}</option>
            ))}
          </select>
        </div>
        <input 
          autoFocus
          style={{width:"50%"}} 
          type="text"
          id="name" 
          name="name" 
          className="mb-6 mt-5 rounded" 
          placeholder=" Card name..." 
          onChange={handleSpawnTyping}
          onFocus={event => dispatch(setTyping(true))}
          onBlur={event => dispatch(setTyping(false))}/>
        {(spawnFilteredIDs.length) ? 
          (spawnFilteredIDs.length>RESULTS_LIMIT) ?
            <div className="text-white">Too many results</div> :
            <table 
              className="table-fixed rounded-lg w-full overflow-h-scroll"
              style={{
                width: vwPerCol*numCols+"vw",
                minWidth: "40vw",
              }
              }>
              <thead>
                <tr className="text-white bg-gray-800">
                  {gameDef.spawnExistingCardModal?.columnProperties?.map((prop, colindex) => {
                    const propLabel = gameDef.faceProperties[prop]?.label ? gameL10n(gameDef.faceProperties[prop].label) : prop;
                    return(
                      <th key={colindex} className="p-1">{propLabel}</th>
                    )
                  })}
                </tr>
              </thead>
              {spawnFilteredIDs.map((cardId, rowindex) => {
                const card = cardDb[cardId];
                const sideA = cardDb[cardId]["A"];
                return(
                  <tr key={rowindex} className="bg-gray-600 text-white cursor-pointer hover:bg-gray-500 hover:text-black" onClick={() => handleSpawnClick(cardId)}>
                    {gameDef.spawnExistingCardModal.columnProperties?.map((prop, colindex) => {
                      return(
                        <td key={colindex} className="p-1 break-words">{sideA[prop]}</td>
                      )
                    })}
                  </tr>
                );
              })}
            </table> :
            <div className="text-white">No results</div>
        }
      </ReactModal>
    )
})
import React, {useRef, useState} from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faShare, faUpload } from "@fortawesome/free-solid-svg-icons";
import useProfile from "../../hooks/useProfile";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import axios from "axios";
import { keyClass, keyStyleL, keyStyleXL } from "./functions/common";
import { keyStyle } from "./functions/common";
import { siteL10n } from "../definitions/localization";
import { useSiteL10n } from "../../hooks/useSiteL10n";

export const DeckbuilderMyDecks = React.memo(({doFetchHash, myDecks, currentDeck, setCurrentDeck}) => {
  const user = useProfile();
  const authOptions = useAuthOptions();
  const pluginId = useSelector(state => state?.gameUi?.game?.pluginId);
  const defaultName = "Untitled";
  const inputFile= useRef(null);
  const siteL10n = useSiteL10n();

  const createNewDeck = async(loadList) => {
    const updateData = {deck: {
      name: defaultName,
      author_id: user?.id,
      plugin_id: pluginId,
      load_list: loadList,
      public: false
    }}
    const res = await axios.post("/be/api/v1/decks", updateData, authOptions);
    console.log("myDecks 2", res)
    if (res.status == 200) {
      setCurrentDeck(res.data.success.deck);
    }
    doFetchHash((new Date()).toISOString());
  }

  const importNewDeck = async(event) => {
    event.preventDefault();
    const reader = new FileReader();
    reader.onload = async (event) => {
      console.log("target result", event.target.result);
      var loadList = JSON.parse(event.target.result);
      createNewDeck(loadList);
    }
    reader.readAsText(event.target.files[0]);
    inputFile.current.value = "";
  }

  return(   
      <div className="flex bg-gray-800" style={{width:"20%"}}>
        <div className="justify-center p-2 m-2 text-white w-full">
          <div className="text-xl">{siteL10n("myCustomDecks")}</div>
          <div className="my-2">
            <div 
              className={keyClass}
              style={keyStyle}
              onClick={()=>{inputFile.current.click()}}>
                <FontAwesomeIcon icon={faUpload}/>
                <input type='file' id='file' ref={inputFile} style={{display: 'none'}} onChange={importNewDeck} accept=".txt"/>
            </div> 
            <div 
              className={keyClass}
              style={keyStyle}
              onClick={()=>{createNewDeck([])}}>
                <FontAwesomeIcon icon={faPlus}/>
            </div> 
          </div>
          {myDecks?.map((deck, _index) => {
            return(
              <div 
                className={"flex justify-between relative text-white px-2 py-1 mt-2 cursor-pointer " + (deck.id === currentDeck?.id ? "bg-red-800" : "bg-gray-900")}
                onClick={() => {setCurrentDeck(deck);}}>
                <div className="p-2 inline-block">{deck.name}</div>
                {deck.public &&
                  <div className="flex items-center justify-center" style={{width: "6dvh"}}>
                    <div 
                      className={keyClass}
                      style={keyStyleXL}
                    >
                      {siteL10n("public")}
                      <input type='file' id='file' ref={inputFile} style={{display: 'none'}} onChange={importNewDeck} accept=".txt"/>
                    </div> 
                  </div>
                }
              </div>
            )
          })}
        </div>
      </div>
    )
})
import React, {useContext, useEffect, useState} from "react";
import ReactModal from "react-modal";
import { useForm } from "react-hook-form";
import Button from "../../components/basic/Button";
import Select from 'react-select'
import { setShowModal, setTyping } from "../store/playerUiSlice";
import { useDispatch, useSelector } from "react-redux";
import BroadcastContext from "../../contexts/BroadcastContext";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlugin } from "./hooks/usePlugin";
import useProfile from "../../hooks/useProfile";
import { RotatingLines } from "react-loader-spinner";
import { DeckbuilderTable } from "./DeckbuilderTable";
import { DeckbuilderCurrent } from "./DeckbuilderCurrent";
import { DeckbuilderMyDecks } from "./DeckbuilderMyDecks";
import useDataApi from "../../hooks/useDataApi";

const CardImage = ({url, top, height, leftSide}) => {
  const gameDef = useGameDefinition();
  const user = useProfile();
  var srcDefault = url;
  var srcLanguage = null;
  if (!srcDefault.startsWith('http')) {
      // Just a suffix. Let's see if we have a prefix for this language.
      const srcBase = srcDefault;
      srcDefault = gameDef?.imageUrlPrefix?.Default ? gameDef?.imageUrlPrefix?.Default + srcBase : null;
      srcLanguage = gameDef?.imageUrlPrefix?.[user?.language] ? gameDef?.imageUrlPrefix?.[user?.language] + srcBase : null;
  }
  const style = {
    top,
    height,
    borderRadius: '5%',
    MozBoxShadow: '0 0 50px 20px black',
    WebkitBoxShadow: '0 0 50px 20px black',
    boxShadow: '0 0 50px 20px black',
    zIndex: 1e6,
    position: 'fixed'
  };
  if (leftSide) {
    style.left = '0%';
  } else {
    style.right = '0%';
  }
  
  return (
    <img 
      className="fixed"
      src={srcLanguage || srcDefault} 
      onError={(e)=>{e.target.onerror = null; e.target.src=srcDefault}}
      style={style}
    />
  );
}

export const DeckbuilderModal = React.memo(({}) => {
  const dispatch = useDispatch();
  const user = useProfile();
  const gameDef = useGameDefinition();
  const deckbuilder = gameDef.deckbuilder;
  const spawnGroups = deckbuilder.spawnGroups;
  const cardDb = usePlugin()?.card_db || {};
  const pluginId = useSelector(state => state?.gameUi?.game?.pluginId);
  const [hoverCardDetails, setHoverCardDetails] = useState();
  const [currentGroupId, setCurrentGroupId] = useState(spawnGroups?.[0]?.loadGroupId);
  const [currentDeck, setCurrentDeck] = useState({});
  const [numChanges, setNumChanges] = useState(0);
  dispatch(setTyping(true));
  const myDecksUrl = `/be/api/v1/decks/${user?.id}/${pluginId}`;

  const { data, isLoading, isError, doFetchUrl, doFetchHash, setData } = useDataApi(
    myDecksUrl,
    null
  );  
  const myDecks = data?.my_decks;
  useEffect(() => {
    if (user?.id) doFetchUrl(myDecksUrl);
  }, [user]);

  if (!cardDb) return;
  console.log("builder cardDb", cardDb)
  console.log("builder myDecks", myDecks)

  const modifyDeckList = (loadListItem, existingIndex = null) => {
    // If it's already in the deck, adjust the quantity
    const deckCopy = {...currentDeck}
    console.log("modifyDeckList deckCopy", deckCopy)
    if (existingIndex !== null) {
      deckCopy.load_list[existingIndex].quantity += loadListItem.quantity; 
    }
    // See if item should be deleted
    if (existingIndex !== null && deckCopy?.load_list[existingIndex]?.quantity <= 0) {
      deckCopy.load_list.splice(existingIndex, 1);
      setHoverCardDetails(null);
    }
    // If it was not in the group already, add it to the deck
    if (existingIndex === null) {
      deckCopy.load_list.push(loadListItem);
    }
    setCurrentDeck(deckCopy);
    setNumChanges(numChanges + 1);
  }

  return(
    <ReactModal
      closeTimeoutMS={200}
      isOpen={true}
      onRequestClose={() => {
        dispatch(setShowModal(null));
        dispatch(setTyping(false));
      }}
      contentLabel="Build a deck"
      overlayClassName="fixed inset-0 bg-black-50 z-10000"
      className="relative flex insert-auto overflow-auto p-5 bg-gray-800 border mx-auto my-12 rounded-lg outline-none"
      style={{
        content: {
          width: "92vw",
          height: "85dvh",
          maxHeight: "85dvh",
          overflowY: "scroll",
        }
      }}>
      {hoverCardDetails?.A?.imageUrl && <CardImage url={hoverCardDetails.A.imageUrl} leftSide={hoverCardDetails?.leftSide} top={hoverCardDetails?.B?.imageUrl ? "0%" : "50%"} height={"50%"}/>}
      {hoverCardDetails?.B?.imageUrl && <CardImage url={hoverCardDetails.B.imageUrl} leftSide={hoverCardDetails?.leftSide} top={"50%"} height={"50%"}/>}
      {/* <h1 className="mb-2">Spawn a custom card</h1> */}
      {isLoading &&
        <div className="absolute flex h-full w-full items-center justify-center opacity-80 bg-gray-800">
          <RotatingLines
            height={100}
            width={100}
            strokeColor="white"/>
        </div>
      }
      <div className="w-full h-full flex">
      
      <DeckbuilderMyDecks
        doFetchHash={doFetchHash}
        myDecks={myDecks}
        currentDeck={currentDeck}
        setCurrentDeck={setCurrentDeck}/>
      
      {currentDeck?.id && 
        <DeckbuilderCurrent
          currentGroupId={currentGroupId}
          setCurrentGroupId={setCurrentGroupId}
          modifyDeckList={modifyDeckList}
          numChanges={numChanges}
          setNumChanges={setNumChanges}
          doFetchHash={doFetchHash}
          setHoverCardDetails={setHoverCardDetails}
          currentDeck={currentDeck}
          setCurrentDeck={setCurrentDeck}/>
      }

      {currentDeck.id && 
        <DeckbuilderTable
          currentGroupId={currentGroupId}
          modifyDeckList={modifyDeckList}
          setHoverCardDetails={setHoverCardDetails}/>
      }

      </div>
      </ReactModal>
    )
})
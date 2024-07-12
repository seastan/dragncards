import React, {useContext, useEffect, useRef, useState} from "react";
import ReactModal from "react-modal";
import Button from "../../components/basic/Button";
import { setShowModal, setTyping } from "../store/playerUiSlice";
import { useDispatch, useSelector } from "react-redux";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlugin } from "./hooks/usePlugin";
import useProfile from "../../hooks/useProfile";
import useDataApi from "../../hooks/useDataApi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faUpload } from "@fortawesome/free-solid-svg-icons";
import { uploadCardDbTsv } from "../myplugins/uploadPluginFunctions";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import Axios from "axios";
import { StatusMessageBlock } from "./StatusMessageBlock";
import { RotatingLines } from "react-loader-spinner";

const RESULTS_LIMIT = 3;

const CustomCardSection = ({cardDb, loading}) => {
  return(
    <>
      {Object.keys(cardDb).length === 0 ? 
        loading ?
          <div className="flex h-full w-full items-center justify-center" style={{width:"30px", height:"30px"}}>
            <RotatingLines
              height={100}
              width={100}
              strokeColor="white"/>
          </div>
          :
          <div>
            No cards found.
          </div>
        :
        <CustomCardList cardDb={cardDb}/>
      }
    </>
  )
}
    

const CustomCardList = ({cardDb}) => {
  return(
    <div className="overflow-y-scroll bg-gray-600" style={{width: "600px", maxHeight: "300px"}}>
      <div key={"header"} className="flex bg-gray-900 p-2">
        <div style={{width:"200px"}}>Database ID</div>
        <div style={{width:"200px"}}>Side A Name</div>
        <div style={{width:"200px"}}>Side A Type</div>
      </div>
      {Object.keys(cardDb).map((cardId) => {
        const cardDetails = cardDb[cardId];
        const databaseId = cardDetails.A.databaseId;
        // If databaseId is more than 10 characters, truncate it and return ...<last 7 characters>
        const cardIdDisplay = databaseId.length > 10 ? databaseId.slice(0, 3) + "..." + databaseId.slice(-7) : databaseId;
        return (
          <div key={cardId} className="flex p-1">
            <div style={{width:"200px"}}>{cardIdDisplay}</div>
            <div style={{width:"200px"}}>{cardDetails.A.name}</div>
            <div style={{width:"200px"}}>{cardDetails.A.type}</div>
          </div>
        )
      })}
    </div>
  )
}

const createTsv = (gameDef, cardDb) => {
  const cardTypes = Object.keys(gameDef.cardTypes);
  const cardTypeCount = {};
  for (var cardType of cardTypes) cardTypeCount[cardType] = 0;
  const databaseIds = Object.keys(cardDb);
  const columnNames = Object.keys(cardDb[databaseIds[0]].A);
  // Remove databaseId, cardBack, imageUrl, and type
  columnNames.splice(columnNames.indexOf("databaseId"), 1);
  columnNames.splice(columnNames.indexOf("cardBack"), 1);
  columnNames.splice(columnNames.indexOf("name"), 1);
  columnNames.splice(columnNames.indexOf("type"), 1);
  columnNames.splice(columnNames.indexOf("imageUrl"), 1);
  // Prepend databaseId, cardBack, imageUrl, and type
  columnNames.unshift("imageUrl");
  columnNames.unshift("type");
  columnNames.unshift("name");
  columnNames.unshift("cardBack");
  columnNames.unshift("databaseId");
  let fullTsv = columnNames.join("\t") + "\n";
  console.log("cardTsv 0", fullTsv)
  var totalCount = 0;
  for (var cardId of Object.keys(cardDb)) {
    let cardTsv = "";
    const card = cardDb[cardId];
    const sideA = card.A;
    const sideB = card.B;
    const sideAType = sideA.type;
    const sideBType = sideB.type;
    if (sideAType && cardTypeCount[sideAType] !== undefined && cardTypeCount[sideAType] <= RESULTS_LIMIT)
      cardTypeCount[sideAType] += 1;
    else continue;
    
    totalCount += 1;
    const typeCount = cardTypeCount[sideAType];
    for (var columnName of columnNames) {
      if (columnName === "databaseId") cardTsv += `exampledatabaseid${totalCount}\t`;
      else if (columnName === "name") cardTsv += `Example ${sideAType} ${typeCount}\t`;
      else if (columnName === "imageUrl") cardTsv += `https://some-site-where-i-uploated-my-card-image.com/example-suffix-${totalCount}.jpg\t`;
      else cardTsv += sideA[columnName] + "\t";
    }
    cardTsv = cardTsv.slice(0, -1);
    cardTsv += "\n";

    if (sideBType) {
      for (var columnName of columnNames) {
        if (columnName === "databaseId") cardTsv += `exampledatabaseid${totalCount}\t`;
        else if (columnName === "name") cardTsv += `Example ${sideBType} ${typeCount} B\t`;
        else if (columnName === "imageUrl") cardTsv += `https://some-site-where-i-uploated-my-card-image.com/example-suffix-${totalCount}.jpg\t`;
        else cardTsv += sideB[columnName] + "\t";
      }
      cardTsv = cardTsv.slice(0, -1);
      cardTsv += "\n";
    }

    if (card.C) continue;
    console.log("cardTsv 5", cardTsv)

    fullTsv += cardTsv;
  }
  return fullTsv;
}

export const CustomContentModal = React.memo(({}) => {
  const dispatch = useDispatch();
  const user = useProfile();
  const authOptions = useAuthOptions();
  const gameDef = useGameDefinition();
  const cardDb = usePlugin()?.card_db || {};
  const pluginId = useSelector(state => state?.gameUi?.game?.pluginId);
  const inputFileCardDbPrivate = useRef(null);
  const inputFileCardDbPublic = useRef(null);
  const [errorMessageCardDbPrivate, setErrorMessageCardDbPrivate] = useState([]);
  const [errorMessageCardDbPublic, setErrorMessageCardDbPublic] = useState([]);
  const [successMessageCardDbPrivate, setSuccessMessageCardDbPrivate] = useState([]);
  const [successMessageCardDbPublic, setSuccessMessageCardDbPublic] = useState([]);
  const [customCardDbPublic, setCustomCardDbPublic] = useState({});
  const [customCardDbPrivate, setCustomCardDbPrivate] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomContent = async () => {
      const res = await Axios.get(`/be/api/custom_content/${user?.id}/${pluginId}`, authOptions);
      
      if (res?.data?.success) {
        console.log("custom content 3", res?.data)

        if (res?.data?.public_card_db) setCustomCardDbPublic(res?.data?.public_card_db);
        if (res?.data?.private_card_db) setCustomCardDbPrivate(res?.data?.private_card_db);
      }
      setLoading(false);
    }
    if (user?.id && pluginId) fetchCustomContent();
  }, [user, pluginId]);

  dispatch(setTyping(true));
  // const myCustomContentUrl = `/be/api/v1/custom_content/${user?.id}/${pluginId}`;

  // const { data, isLoading, isError, doFetchUrl, doFetchHash, setData } = useDataApi(
  //   myCustomContentUrl,
  //   null
  // ); 
  // useEffect(() => {
  //   if (user?.id) doFetchUrl(myCustomContentUrl);
  // }, [user]);

  if (!cardDb) return;
  
  const loadFileCardDbPublic = () => {
    inputFileCardDbPublic.current.click();
  }

  const loadFileCardDbPrivate = () => {
    inputFileCardDbPrivate.current.click();
  }

  const downloadTsv = () => {
    const tsvContent = createTsv(gameDef, cardDb);
    const blob = new Blob([tsvContent], { type: "text/tab-separated-values;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "example-cards.tsv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleTsvUpload = async (event, mode) => {
    console.log("custom content 0", event, mode)
    const setError = mode === "private" ? setErrorMessageCardDbPrivate : setErrorMessageCardDbPublic;
    const setSuccess = mode === "private" ? setSuccessMessageCardDbPrivate : setSuccessMessageCardDbPublic;
    const setCustomCardDb = mode === "private" ? setCustomCardDbPrivate : setCustomCardDbPublic;
    setError([]);
    const files = event.target.files;
    console.log("custom content 1", files)

    if (files.length > 0) {
      const result = await uploadCardDbTsv(gameDef, files);
      console.log("custom content 2", result)
      
      if (result.status === 'success') {
        console.log("Card database uploaded successfully", result);
      } else {
        setError(result.messages);
      }
    } else {
      setError(["No files selected."]);
    }
    const updateData = {
      plugin_id: pluginId,
      card_db: cardDb,
      public: mode === "public",
      author_id: user?.id,
    };

    const res = await Axios.post("/be/api/custom_content", updateData, authOptions);
    const writtenCardDb = res?.data?.data?.card_db;
    if (writtenCardDb) {
      setCustomCardDb(writtenCardDb)
      setError([]);
      setSuccess([res?.data?.success?.message])
    }
    else if (res?.data?.errror?.message) {
      setSuccess([]);
      setError([res?.data?.errror.message])
    }
    else {
      setSuccess([]);
      setError(["Unknown error"])
    }
  };


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
      className="relative insert-auto overflow-auto p-5 bg-gray-800 border mx-auto my-12 rounded-lg outline-none text-white"
      style={{
        content: {
          width: "92vw",
          height: "85vh",
          maxHeight: "85vh",
          overflowY: "scroll",
        }
      }}>
      <h1 className="my-2">Custom Cards</h1>
      
      <div style={{width:"300px"}}>
        <Button isPrimary onClick={downloadTsv}>
          <FontAwesomeIcon icon={faDownload} className="mr-2"/>
          Download Example Template (.tsv)
        </Button>
      </div>

      <h2 className="my-2">Public</h2>
      <CustomCardSection cardDb={customCardDbPublic} loading={loading}/>
        
      <div className="text-black py-1"style={{width:"300px"}}>
        <Button onClick={() => loadFileCardDbPublic()}>
          <FontAwesomeIcon icon={faUpload} className="mr-2"/>
          Upload Public Cards (.tsv)
          <input type='file' multiple id='file' ref={inputFileCardDbPublic} style={{display: 'none'}} onChange={(e) => handleTsvUpload(e, "public")} accept=".tsv"/>
        </Button>
        <StatusMessageBlock successMessages={successMessageCardDbPublic} errorMessages={errorMessageCardDbPublic}/>
      </div>

      <h2 className="my-2">Private</h2>
      <CustomCardSection cardDb={customCardDbPrivate} loading={loading}/>

      {user?.supporter_level < 3 ? (
        <div className="text-black" style={{width:"300px"}}>
          <Button onClick={() => dispatch(setShowModal("patreon"))}>
            <div className="flex w-full justify-center">
              <div>Unlock</div>
              <img className="pl-2" style={{height: "20px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg"/>
            </div>
          </Button>
        </div>
      ) : (
        <div className="text-black py-1" style={{width:"300px"}}>
        <Button onClick={() => loadFileCardDbPrivate()}>
            <FontAwesomeIcon icon={faUpload} className="mr-2"/>
            Upload Private Cards (.tsv)
            <input type='file' multiple id='file' ref={inputFileCardDbPrivate} style={{display: 'none'}} onChange={(e) => handleTsvUpload(e, "private")} accept=".tsv"/>
          </Button>
          <StatusMessageBlock successMessages={successMessageCardDbPrivate} errorMessages={errorMessageCardDbPrivate}/>
        </div>
      )}


    </ReactModal>
  )
})

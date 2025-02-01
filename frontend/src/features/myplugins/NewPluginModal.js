import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactModal from "react-modal";
import Button from "../../components/basic/Button";
import useProfile from "../../hooks/useProfile";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import useForm from "../../hooks/useForm";
import useAuth from "../../hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { mergeJSONs, readFileAsText } from "./PluginFileImport";
import { processArrayOfRows, stringTo2DArray, useProcessArrayOfRows } from "./uploadPluginFunctions";
import { validateSchema } from "./validate/validateGameDef";
import { getGameDefSchema } from "./validate/getGameDefSchema";
const { convertCSVToArray } = require('convert-csv-to-array');
const converter = require('convert-csv-to-array');

ReactModal.setAppElement("#root");

export const NewPluginModal = ({ isOpen, closeModal }) => {
  const user = useProfile();
  const { authToken, renewToken, setAuthAndRenewToken } = useAuth();
  const authOptions = useMemo(
    () => ({
      headers: {
        Authorization: authToken,
      },
    }),
    [authToken]
  );
  const [checked, setChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const [validGameDef, setValidGameDef] = useState(false);
  const [validCardDb, setValidCardDb] = useState(false);
  const [errorMessageGameDef, setErrorMessageGameDef] = useState("");
  const [errorMessageCardDb, setErrorMessageCardDb] = useState("");

  const [successMessageGameDef, setSuccessMessageGameDef] = useState("");
  const [successMessageCardDb, setSuccessMessageCardDb] = useState("");
  const l10n = useSiteL10n();

  const inputFileGameDef = useRef(null);
  const inputFileCardDb = useRef(null);

  const { inputs, handleSubmit, handleInputChange, setInputs } = useForm(async () => {
    console.log("inputs", inputs);
    if (!inputs.gameDef.pluginName || inputs.gameDef.pluginName.length == 0) {
      setErrorMessage("Invalid plugin name");
      return;
    }
/*     if (!inputs.gameDef) {
      setErrorMessage("No game definition specified.");
      return;
    }
    if (!inputs.cardDb) {
      setErrorMessage("No card database specified.");
      return;
    } */
    const updateData = {
      plugin: {
        name: inputs.gameDef.pluginName,
        author_id: user?.id,
        game_def: inputs.gameDef,
        card_db: inputs.cardDb,
        public: inputs.public || false,
      },
    };
    //const res = await axios.post("/be/api/v1/profile/update", data);

    setSuccessMessage("");
    setErrorMessage("");
    setLoadingMessage("Please wait...");
    console.log("auth 1", updateData, authOptions);
    const res = await axios.post("/be/api/myplugins", updateData, authOptions);
    console.log("res 1", res);
    setLoadingMessage("Finished.");
    if (
      res.status === 200
    ) {
      setSuccessMessage("Plugin created.");
      setErrorMessage("");
      setLoadingMessage("");
      closeModal();
    } else {
      setSuccessMessage("");
      setErrorMessage("Error."); 
      setLoadingMessage("");
    }
    
  });

  const uploadGameDefJson = async(event) => {
    event.preventDefault();
    const files = event.target.files;
    let readers = [];
  
    // Abort if there were no files selected
    if(!files.length) return;
  
    // Store promises in array
    for(let i = 0; i < files.length; i++){
        readers.push(readFileAsText(files[i]));
    }
    
    // Trigger Promises
    Promise.all(readers).then((jsonList) => {
      console.log("unmerged",jsonList);
      const mergedJSONs = mergeJSONs(jsonList);
      console.log("mergedJSONs", mergedJSONs)
      const errors = []
      validateSchema(mergedJSONs, "gameDef", mergedJSONs, getGameDefSchema(mergedJSONs), errors);
      if (errors.length === 0) {
        setSuccessMessageGameDef(`Game definition uploaded successfully: ${mergedJSONs.pluginName}`);
        setErrorMessageGameDef("");
        setValidGameDef(true);
        setInputs({...inputs, gameDef: mergedJSONs});
      } else {
        // Join all errors into a single string with line separators
        const errorMessage = errors.join("\n");
        // Set the error message
        setErrorMessageGameDef(`${errorMessage}`)
        setValidGameDef(false);
      }
    });
    inputFileGameDef.current.value = "";
  }

  const uploadCardDbTsv = async(event) => {
    event.preventDefault();
    const files = event.target.files;
    let readers = [];
  
    // Abort if there were no files selected
    if(!files.length) return;
  
    // Store promises in array
    for(let i = 0; i < files.length; i++){
        readers.push(readFileAsText(files[i]));
    }
    
    // Trigger Promises
    Promise.all(readers).then((tsvList) => {
      console.log("unmerged",tsvList);
      const arrayOfRows = []; // Each element is a 2D array representing a tsv file
      for (var tsvString of tsvList) { 
        console.log("tsvString", tsvString)
        try {
          const rows = stringTo2DArray(tsvString);
          console.log("tsvString rows", rows)
          arrayOfRows.push(rows)
        } catch(err) {
          console.log("err",err)
          var message = "Error";
          if (err.message.includes("data does not include separator")) message += ": Invalid file format. Make sure the data is tab-separated."
          setErrorMessageCardDb(message);
          return;
        }
      }
      try {
        const cardDb = processArrayOfRows(inputs, null, arrayOfRows);
        setSuccessMessageCardDb(`Card database uploaded successfully: ${Object.keys(cardDb).length} cards.`);
        setErrorMessageCardDb("");
        setValidCardDb(true);
        setInputs({...inputs, cardDb: cardDb});
      } catch(err) {
        setErrorMessageCardDb("Error: "+err.message);
      }
    });
    inputFileGameDef.current.value = "";
  }

  const loadFileGameDef = () => {
    inputFileGameDef.current.click();
  }
  const loadFileCardDb = () => {
    inputFileCardDb.current.click();
  }

  const downloadGameDefJson = () => {
    const exportName = inputs.gameDef.pluginName.replaceAll(" ", "-");
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inputs.gameDef));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
  
  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={isOpen}
      onRequestClose={closeModal}
      contentLabel="New Plugin"
      overlayClassName="fixed inset-0 bg-black-50 z-50"
      className="insert-auto p-5 bg-gray-700 border mx-auto my-12 rounded-lg outline-none"
      style={{
        overlay: {
        },
        content: {
          width: '500px',
        }
      }}
    >
      
      <h1 className="mb-2">New Plugin</h1>

      <form action="POST" onSubmit={handleSubmit}>
        <fieldset>{/* 
            <label className="block text-sm font-bold mb-2 mt-4">
              Game Name
            </label>
            <input
              name="plugin_name"
              className="form-control w-full mb-2"
              onChange={handleInputChange}
              value={inputs.plugin_name || ""}
            /> */}
          <label className="block text-sm font-bold mb-2 mt-4 text-white">
            Game definition (.json)
          </label>
          <label className="block text-xs mb-2 text-white">
            You may upload multiple jsons at once that define different aspects of the game and they will be merged automatically.
          </label>
          <Button onClick={() => loadFileGameDef()}>
            {l10n("Load game definition (.json)")}
            <input type='file' multiple id='file' ref={inputFileGameDef} style={{display: 'none'}} onChange={uploadGameDefJson} accept=".json"/>
          </Button>
          {successMessageGameDef && (
            <div className="alert alert-info mt-4">{successMessageGameDef}</div>
          )}
          {errorMessageGameDef && (
            <div className="alert alert-danger mt-4">{errorMessageGameDef}</div>
          )}
          <label className="block text-sm font-bold mb-2 mt-4 text-white">
            Card database (.tsv)
          </label>
          <label className="block text-xs mb-2 text-white">
            You may upload multiple tab-separated-value (.tsv) files at once that define different cards and they will be merged automatically. Eech file must share the same header information. A valid game definition must be uploaded first.
          </label>
          <Button disabled={!validGameDef} onClick={() => loadFileCardDb()}>
            {l10n("Load card database (.tsv)")}
            <input type='file' multiple id='file' ref={inputFileCardDb} style={{display: 'none'}} onChange={uploadCardDbTsv} accept=".tsv"/>
          </Button>
          {successMessageCardDb && (
            <div className="alert alert-info mt-4">{successMessageCardDb}</div>
          )}
          {errorMessageCardDb && (
            <div className="alert alert-danger mt-4">{errorMessageCardDb}</div>
          )}
          <label className="block text-sm font-bold mb-2 mt-4 text-white">
            Visibility
          </label>
          <div className="w-full">
            <div className="p-1 float-left w-1/2">
          <Button isPrimary={inputs.public} onClick={() => setInputs({...inputs, public: true})}>
            {inputs.public && <FontAwesomeIcon className="" icon={faCheck}/>} Public
          </Button>
          </div>
          <div className="p-1 float-left w-1/2">
          <Button isPrimary={!inputs.public}  onClick={() => setInputs({...inputs, public: false})}>
            {!inputs.public && <FontAwesomeIcon className="" icon={faCheck}/>} Private
          </Button>
          </div>
          </div>
          <Button disabled={!validGameDef || !validCardDb} isSubmit isPrimary className="mt-4">
            Create Plugin
          </Button>
          {successMessage && (
            <div className="alert alert-info mt-4">{successMessage}</div>
          )}
          {errorMessage && (
            <div className="alert alert-danger mt-4">{errorMessage}</div>
          )}
          {loadingMessage && (
            <div className="alert alert-info mt-4">{loadingMessage}</div>
          )}
        </fieldset>
      </form>
{/*       <Button onClick={(event) => {uploadGameDefJson(event)}} isPrimary className="mx-2 mt-2">Upload</Button>
 */}
    </ReactModal>
  );
};
export default NewPluginModal;

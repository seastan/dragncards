import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactModal from "react-modal";
import { Redirect } from "react-router";
import Button from "../../../components/basic/Button";
import { useSiteL10n } from "../../../hooks/useSiteL10n";
import useForm from "../../../hooks/useForm";
import useAuth from "../../../hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { mergeJSONs, processArrayOfRows, readFileAsText, stringTo2DArray } from "../uploadPluginFunctions";
import { validateSchema } from "../validate/validateGameDef";
import { getGameDefSchema } from "../validate/getGameDefSchema";
import useProfile from "../../../hooks/useProfile";

import tar from 'tar-stream';
import fs from 'fs';
import gunzip from 'gunzip-maybe';
import pako from 'pako';
import Tar from 'tar-js';
import JSZip from 'jszip';


ReactModal.setAppElement("#root");


export const EditPluginModal = ({ plugin, closeModal, doFetchHash}) => {
  console.log("Rendering EditPluginModal", plugin)
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
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const [validGameDef, setValidGameDef] = useState(false);
  const [errorMessagesGameDef, setErrorMessagesGameDef] = useState([]);
  const [warningMessagesGameDef, setWarningMessagesGameDef] = useState([]);
  const [errorMessageCardDb, setErrorMessageCardDb] = useState([]);

  const [successMessageGameDef, setSuccessMessageGameDef] = useState("");
  const [successMessageCardDb, setSuccessMessageCardDb] = useState("");
  const siteL10n = useSiteL10n();

  const inputFileGameDef = useRef(null);
  const inputFileCardDb = useRef(null);

  const [createRoomAfter, setCreateRoomAfter] = useState(true);
  const [roomSlugCreated, setRoomSlugCreated] = useState(null);

  const createRoom = async (pluginId, pluginName, pluginVersion) => {
    console.log("Creating Room",pluginId, pluginName, pluginVersion)
    const data = { 
      room: { 
        name: "", 
        user: user?.id, 
        privacy_type: 'private',
      },
      game_options: {
        plugin_id: pluginId,
        plugin_version: pluginVersion,
        plugin_name: pluginName,
        replay_uuid: null,
        external_data: null
      }
    };
    try {
      console.log("Creating room 1",data)
      const res = await axios.post("/be/api/v1/games", data);
      console.log("Creating room 2",res)
      if (res.status !== 201) {
        throw new Error("Room not created");
      }
      const room = res.data.success.room;
      console.log("room created", room)
      setRoomSlugCreated(room.slug);
    } catch (err) {
      console.log("Error creating room", err)
    }
  };


  const { inputs, handleSubmit, handleInputChange, setInputs } = useForm(async () => {
    console.log("inputs", inputs);
    if (inputs.gameDef && (!inputs.gameDef.pluginName || inputs.gameDef.pluginName.length == 0)) {
      setErrorMessage("Invalid plugin name");
      return;
    }
    setSuccessMessage("");
    setErrorMessage("");
    setLoadingMessage("Please wait...");

    var res;

    
    if (plugin === null) {
      // Create new plugin
      const updateData = {
        plugin: {
          name: inputs.gameDef.pluginName,
          author_id: user?.id,
          game_def: inputs.gameDef,
          card_db: inputs.cardDb,
          repo_url: inputs.repoUrl,
          public: inputs.public || false,
          version: 1,
        }
      }
      res = await axios.post("/be/api/myplugins", updateData, authOptions);
    } else {
      // Update existing plugin
      const newPlugin = {
        id: plugin.id,
        version: plugin.version + 1,
        repo_url: inputs.repoUrl,
        public: inputs.public,
      }
      if (inputs.gameDef) newPlugin.game_def = inputs.gameDef;
      if (inputs.gameDef?.pluginName) newPlugin.name = inputs.gameDef.pluginName;
      if (inputs.cardDb) newPlugin.card_db = inputs.cardDb;

      const updateData = {
        plugin: newPlugin
      };
      res = await axios.patch("/be/api/myplugins/"+plugin.id, updateData, authOptions);
    }

    if (
      res.status === 200
    ) {
      console.log("res pluginupdate", res);
      doFetchHash((new Date()).toISOString());
      setSuccessMessage("Plugin updated.");
      setErrorMessage("");
      setLoadingMessage("");
      if (createRoomAfter) createRoom(res.data.plugin.id, res.data.plugin.name, res.data.plugin.version);
      else closeModal();
    } else {
      setSuccessMessage("");
      setErrorMessage("Error."); 
      setLoadingMessage("");
    }
  });

  useEffect(() => {
    if (inputs && plugin) setInputs({...inputs, public: plugin.public, repoUrl: plugin.repo_url});
  },[])


  if (roomSlugCreated != null) {
    return <Redirect push to={`/room/${roomSlugCreated}`} />;
  }

  const uploadGameDefJson = async (event) => {
    event.preventDefault();
    const files = event.target.files;
    let readers = [];
  
    // Abort if there were no files selected
    if (!files.length) return;
  
    // Helper function to read files as text
    const readFileAsText = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    };
  
    // Helper function to extract JSON files from a zip archive
    const extractJsonFilesFromZip = async (file) => {
      return new Promise((resolve, reject) => {
        const jsonFiles = [];
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const zipData = new Uint8Array(reader.result);
            const zip = new JSZip();
            zip.loadAsync(zipData).then(() => {
              const filePromises = Object.values(zip.files)
                .filter((file) => file.name.endsWith('.json'))
                .map((file) => file.async('text'));
    
              Promise.all(filePromises)
                .then((contents) => {
                  jsonFiles.push(...contents);
                  resolve(jsonFiles);
                })
                .catch((error) => {
                  reject(error);
                });
            }).catch((error) => {
              reject(error);
            });
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
    };
  
    // Process files
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      // Handle zip file
      try {
        const jsonList = await extractJsonFilesFromZip(files[0]);
        // wait for 2 seconds
        //await new Promise(resolve => setTimeout(resolve, 2000));
        
        handleJsonList(jsonList);
      } catch (error) {
        setErrorMessagesGameDef([`Error extracting JSON files from zip: ${error.message}`]);
      }
    } else {
      // Handle individual JSON files
      for (let i = 0; i < files.length; i++) {
        readers.push(readFileAsText(files[i]));
      }
  
      // Trigger Promises
      Promise.all(readers).then(handleJsonList).catch(error => {
        setErrorMessagesGameDef([`Error reading JSON files: ${error.message}`]);
      });
    }
  
    inputFileGameDef.current.value = "";
  };
  
  // Function to handle the list of JSON strings
  const handleJsonList = (jsonList) => {
    console.log("unmerged", jsonList.length);
    var mergedJSONs;
    try {
      mergedJSONs = mergeJSONs(jsonList);
      console.log("mergedJSONs", mergedJSONs)
      const errors = [];
      validateSchema(mergedJSONs, "gameDef", mergedJSONs, getGameDefSchema(mergedJSONs), errors);
      if (errors.length === 0) {
        setSuccessMessageGameDef(`Game definition uploaded successfully: ${mergedJSONs.pluginName}`);
        setErrorMessagesGameDef([]);
        setValidGameDef(true);
        setInputs({...inputs, gameDef: mergedJSONs});
      } else {
        // Set the error message
        const labelSchema = "";
        setErrorMessagesGameDef(errors);
        setValidGameDef(false);
      }
      if (plugin && mergedJSONs.pluginName !== plugin.name) {
        setWarningMessagesGameDef([`Warning: Plugin name mismatch between existing definition (${plugin.name}) and uploaded definition (${mergedJSONs.pluginName}). Confirm that you are editing the appropriate plugin.`]);
      }
    } catch (error) {
      setErrorMessagesGameDef([`Invalid JSON file(s): ${error.message}`]);
    }
  };

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
      const errors = []
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
          setErrorMessageCardDb([message]);
          return;
        }
      }
      try {
        const cardDb = processArrayOfRows(inputs, plugin, arrayOfRows, errors);
        setSuccessMessageCardDb(`Card database uploaded successfully: ${Object.keys(cardDb).length} cards.`);
        setErrorMessageCardDb(errors);
        setInputs({...inputs, cardDb: cardDb});
      } catch(err) {
        setErrorMessageCardDb([err.message]);
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

  var changesMade = plugin ? ((inputs.public !== plugin.public) || (inputs.repoUrl !== plugin.repo_url) || inputs.gameDef || inputs.cardDb) : (inputs.gameDef || inputs.cardDb);

  const canSubmit = changesMade && errorMessagesGameDef.length === 0 && errorMessageCardDb.length === 0;

  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={true}
      onRequestClose={closeModal}
      contentLabel="New Plugin"
      overlayClassName="fixed inset-0 bg-black-50 z-50 overflow-y-scroll"
      className="insert-auto p-5 bg-gray-700 border mx-auto my-12 rounded-lg outline-none"
      style={{
        overlay: {
        },
        content: {
          width: '500px',
        }
      }}
    >
      
      <h1 className="">{plugin ? siteL10n("Edit") : siteL10n("New")} {siteL10n(" Plugin")}</h1>
      <div className="text-white text-sm">{plugin?.name}</div>

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
            {siteL10n("Game definition (.json, .zip)")}
          </label>
          <label className="block text-xs mb-2 text-white">
            {siteL10n("You may upload multiple jsons at once that define different aspects of the game and they will be merged automatically.")}
          </label>
          <Button onClick={() => loadFileGameDef()}>
            {siteL10n("Load game definition (.json)")}
            <input type='file' multiple id='file' ref={inputFileGameDef} style={{display: 'none'}} onChange={uploadGameDefJson} accept=".json,.zip"/>
          </Button>
          {successMessageGameDef && (
            <div className="alert alert-info mt-1 text-xs p-1 pl-3">{successMessageGameDef}</div>
          )}
          {warningMessagesGameDef.length > 0 && (
            warningMessagesGameDef.map((message, i) => (
              <div index={i} className="alert alert-warning mt-1 text-xs p-1 pl-3">{message}</div>
            ))
          )}
          {errorMessagesGameDef.length > 0 && (
            errorMessagesGameDef.map((message, i) => (
              <div index={i} className="alert alert-danger mt-1 text-xs p-1 pl-3">{message}</div>
            ))
          )}
          <label className="block text-sm font-bold mb-2 mt-4 text-white">
            {siteL10n("Card database (.tsv)")}
          </label>
          <label className="block text-xs mb-2 text-white">
            {siteL10n("You may upload multiple tab-separated-value (.tsv) files at once that define different cards and they will be merged automatically. Each file must share the same header information. A valid game definition must be uploaded first.")}
          </label>
          <Button disabled={!validGameDef} onClick={() => loadFileCardDb()}>
            {plugin ? siteL10n("(Optional) Update card database (.tsv)") : siteL10n("Upload card database (.tsv)")}
            <input type='file' multiple id='file' ref={inputFileCardDb} style={{display: 'none'}} onChange={uploadCardDbTsv} accept=".tsv"/>
          </Button>
          <label className="block text-sm font-bold mb-2 mt-4 text-white">
            {siteL10n("GitHub Repository URL")}
          </label>
          <label className="block text-xs mb-2 text-white">
            {siteL10n("Optional. See documentation for how you can use this to get immediate feedback during plugin development.")}
          </label>
          <input
            name="repoUrl"
            className="form-control w-full mb-2"
            onChange={handleInputChange}
            value={inputs.repoUrl || ""}
          />
          {successMessageCardDb && (
            <div className="alert alert-info mt-1 text-xs p-1 pl-3">{successMessageCardDb}</div>
          )}
          {errorMessageCardDb.length > 0 && (
            errorMessageCardDb.map((message, i) => (
              <div index={i} className="alert alert-danger mt-1 text-xs p-1 pl-3">{message}</div>
            ))
          )}
          <label className="block text-sm font-bold mb-2 mt-4 text-white">
          {siteL10n("Visibility")}
          </label>
          <div className="w-full">
            <div className="p-1 float-left w-1/2">
              <Button isPrimary={inputs.public} onClick={() => setInputs({...inputs, public: true})}>
                {inputs.public && <FontAwesomeIcon className="" icon={faCheck}/>} {siteL10n("Public")}
              </Button>
            </div>
            <div className="p-1 float-left w-1/2">
              <Button isPrimary={!inputs.public}  onClick={() => setInputs({...inputs, public: false})}>
                {!inputs.public && <FontAwesomeIcon className="" icon={faCheck}/>} {siteL10n("Private")}
              </Button>
            </div>
          </div> 
          <Button disabled={!canSubmit} isSubmit={canSubmit} className="mt-4">
          {plugin ? siteL10n("Update Plugin") : siteL10n("Create Plugin")}
          </Button>
          <span className="flex items-center mt-2">
            <input
              name="createRoomAfter"
              type="checkbox"
              className="h-6 w-6 m-1"
              onChange={(event) => setCreateRoomAfter(event.target.checked)}
              checked={createRoomAfter}
            />
            <label className="text-sm text-white ml-1">
              {siteL10n("createPrivateRoomAfter")}
            </label>
          </span>
          {changesMade && <div className="alert alert-info mt-4">{siteL10n("You have unsaved changes.")}</div>}
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
export default EditPluginModal;

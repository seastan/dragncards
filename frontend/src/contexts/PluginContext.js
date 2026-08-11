import React, { createContext, useState, useEffect, useRef } from 'react';
import { RotatingLines } from 'react-loader-spinner';
import { useSelector } from 'react-redux';
import useDataApi from '../hooks/useDataApi';
import pako from 'pako';


export const PluginContext = createContext();

export const decompressPluginData = (data) => {
  // Step 1: Decode the Base64 string
  console.log('decompressPluginData', data)
  try {
    const decodedData = atob(data);
    
    // Step 2: Convert the decoded string to Uint8Array
    const charData = decodedData.split('').map((x) => x.charCodeAt(0));
    const binData = new Uint8Array(charData);
    
    // Step 3: Decompress the data using pako
    const decompressedData = pako.inflate(binData, { to: 'string' });
    
    // Step 4: Parse JSON
    const pluginData = JSON.parse(decompressedData);

    return pluginData;
  } catch (e) {
    console.warn('Failed to decompress plugin data:', e);
    return null;
  }
}


const LOADING_TIPS = [
  "Overflowing regions can be converted to fan-type via their hamburger menu.",
  "View regions that are not on the table via the View menu.",
  "Games autosave to your profile after every round. Press Ctrl+S to trigger a save manually.",
  "Hold Tab to bring up the list of hotkeys.",
  "Don't like an automation? Turn it off in your preferences.",
  "Press Shift+Tab to quickly bring up your preferences.",
  "Click on any log message in the chat window to rewind the game to that point.",
  "Playing on a touchscreen? Save the site to your home screen to remove the browser's navigation bar.",
  'Check out decks made by the community under "Load public custom deck".',
];

export const PluginProvider = ({ children }) => {
  const pluginId = useSelector(state => state?.gameUi?.game?.pluginId);
  const pluginVersion = useSelector(state => state?.gameUi?.game?.pluginVersion);
  const [plugin, setPlugin] = useState(null); 
  const { data, isLoading, isError, doFetchUrl, doFetchHash, setData, progressEvent } = useDataApi(
    '/be/api/plugins/' + pluginId,
    null,
    false
  );
  const percentLoaded = progressEvent?.total ? Math.round(progressEvent.loaded / progressEvent.total * 100) : 0;

  const [retrievedFromStorage, setRetrievedFromStorage] = useState(false); // Flag to track data source
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length));
  const tipTimerRef = useRef(null);

  useEffect(() => {
    tipTimerRef.current = setInterval(() => {
      setTipIndex(i => (i + 1) % LOADING_TIPS.length);
    }, 5000);
    return () => clearInterval(tipTimerRef.current);
  }, []);

  useEffect(() => {
    const compressedData = localStorage.getItem(`pluginData_${pluginId}`);
    if (compressedData) {
      const pluginData = decompressPluginData(compressedData);
      if (pluginData?.version === pluginVersion) {
        setPlugin(pluginData);
        setRetrievedFromStorage(true); // Set the flag
        console.log('Retrieved data from localStorage');
        return;
      }
    }
    doFetchHash((new Date()).toISOString());
  }, [pluginId, pluginVersion]);

  useEffect(() => {
    if (data) {//} && !retrievedFromStorage) {  // Check the flag before writing
      try {
        const pluginData = decompressPluginData(data);
        console.log('pluginData', pluginData);
        setPlugin(pluginData);

        localStorage.setItem(`pluginData_${pluginId}`, data);
      } catch (e) {
        console.warn('Failed to save data in localStorage:', e);
      }
    }
    setRetrievedFromStorage(false);  // Reset the flag for the next round
  }, [data, pluginId, pluginVersion]);

  return (
    <PluginContext.Provider value={{ plugin: plugin, isLoading, progressEvent: progressEvent }}>
      {retrievedFromStorage === false && (isLoading || plugin?.game_def == null) ? (
        <div className="absolute text-white flex flex-col h-full w-full items-center justify-center opacity-80 bg-gray-800 gap-6">
          <div className="relative flex items-center justify-center">
            <RotatingLines height={100} width={100} strokeColor="white" />
            <div className="absolute">{percentLoaded}%</div>
          </div>
          <div className="text-center text-gray-300 text-sm max-w-sm px-4">
            <span className="font-semibold text-white">Tip: </span>{LOADING_TIPS[tipIndex]}
          </div>
        </div>
      ) : (
        children
      )}
    </PluginContext.Provider>
  );
};

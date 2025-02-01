import React, { createContext, useState, useEffect } from 'react';
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
        <div className="absolute text-white flex h-full w-full items-center justify-center opacity-80 bg-gray-800">
          <RotatingLines height={100} width={100} strokeColor="white" />
          <div className="absolute">{percentLoaded}%</div>
        </div>
      ) : (
        children
      )}
    </PluginContext.Provider>
  );
};

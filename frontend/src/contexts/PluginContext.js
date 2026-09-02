import React, { createContext, useState, useEffect, useRef } from 'react';
import { RotatingLines } from 'react-loader-spinner';
import { useSelector } from 'react-redux';
import useDataApi from '../hooks/useDataApi';
import pako from 'pako';
import { readPluginCache, writePluginCache, purgeLegacyPluginCache } from './pluginCache';


export const PluginContext = createContext();

// The wire format is base64(gzip(json)). Decoding is split from inflating so the
// gzip bytes can be handed straight to the cache without a second pass, and so a
// cache hit skips base64 entirely - it stores the bytes, not the encoding.
export const base64ToBytes = (data) => {
  try {
    const binary = atob(data);
    // Indexed fill rather than split('').map(): on a payload of this size the
    // latter builds two multi-million-element intermediate arrays.
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch (e) {
    console.warn('Failed to decode plugin data:', e);
    return null;
  }
}

export const inflatePluginBytes = (bytes) => {
  try {
    return JSON.parse(pako.inflate(bytes, { to: 'string' }));
  } catch (e) {
    console.warn('Failed to decompress plugin data:', e);
    return null;
  }
}

export const decompressPluginData = (data) => {
  const bytes = base64ToBytes(data);
  return bytes ? inflatePluginBytes(bytes) : null;
}


const LOADING_TIPS = [
  "Overflowing regions can be converted to fan-type via their hamburger menu.",
  "View regions that are not on the table via the View menu.",
  "Games autosave to your profile after every round. Press Ctrl+S to trigger a save manually.",
  "Hold Tab to bring up the list of hotkeys.",
  "Don't like an automation? Turn it off in your preferences.",
  "Press Shift+Tab to quickly bring up your preferences.",
  "Press Ctrl+RightArrow (or Ctrl+LeftArrow) to hop to the next vacant seat.",
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

  // One-time cleanup of the old localStorage cache this replaced.
  useEffect(() => { purgeLegacyPluginCache(); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bytes = await readPluginCache(pluginId);
      if (cancelled) return;
      if (bytes) {
        const pluginData = inflatePluginBytes(bytes);
        if (pluginData?.version === pluginVersion) {
          setPlugin(pluginData);
          setRetrievedFromStorage(true); // Set the flag
          console.log('Retrieved plugin data from cache');
          return;
        }
      }
      if (!cancelled) doFetchHash((new Date()).toISOString());
    })();
    return () => { cancelled = true; };
  }, [pluginId, pluginVersion]);

  useEffect(() => {
    if (data) {//} && !retrievedFromStorage) {  // Check the flag before writing
      const bytes = base64ToBytes(data);
      const pluginData = bytes ? inflatePluginBytes(bytes) : null;
      console.log('pluginData', pluginData);
      setPlugin(pluginData);
      // Caching is best-effort and deliberately runs after setPlugin, so a
      // storage failure can never stop the plugin from loading.
      if (bytes) writePluginCache(pluginId, bytes);
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

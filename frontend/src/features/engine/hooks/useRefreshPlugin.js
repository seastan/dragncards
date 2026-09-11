import { useContext, useEffect } from 'react';
import { useSendLocalMessage } from './useSendLocalMessage';
import Axios from 'axios';
import { useAuthOptions } from '../../../hooks/useAuthOptions';
import store from '../../../store';
import { getBackEndPlayerUi } from '../functions/common';
import BroadcastContext from '../../../contexts/BroadcastContext';
import { useDispatch, useSelector } from 'react-redux';
import { setPluginRepoUpdateGameDef } from '../../store/playerUiSlice';

export const useRefreshPlugin = () => {
  const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
  const dispatch = useDispatch();
  const sendLocalMessage = useSendLocalMessage();
  const authOptions = useAuthOptions();
  const pluginRepoUpdateAutoRefresh = useSelector(state => state.playerUi.pluginRepoUpdateAutoRefresh);
  const pluginRepoUpdateGameDef = useSelector(state => state.playerUi.pluginRepoUpdateGameDef);

  useEffect(() => {
    if (pluginRepoUpdateAutoRefresh && pluginRepoUpdateGameDef) {
      refreshPlugin();
    }
  }, [pluginRepoUpdateAutoRefresh, pluginRepoUpdateGameDef]);

  const refreshPlugin = async () => {
    const pluginId = store.getState().gameUi.game.pluginId;
    const pluginVersion = store.getState().gameUi.game.pluginVersion;
    if (!pluginRepoUpdateGameDef) {
      sendLocalMessage("New plugin data not present.");
      return;
    }

    const newPlugin = {
      id: pluginId,
      version: pluginVersion + 1,
      game_def: pluginRepoUpdateGameDef,
    };

    const updateData = {
      plugin: newPlugin
    };
    dispatch(setPluginRepoUpdateGameDef(null));
    sendLocalMessage("Updating plugin...", "info", false);
    try {
      const res = await Axios.patch("/be/api/myplugins/"+pluginId, updateData, authOptions);
      if (res.status === 200) {
        sendLocalMessage("Plugin updated successfully.", "success");

        var playerUi = getBackEndPlayerUi(store.getState());
        gameBroadcast("reset_game", {options: {player_ui: playerUi, save: false}});

      } else {
        sendLocalMessage("Failed to update plugin.", "error");
      }
    } catch (err) {
      // Everyone in the room receives the plugin-repo-update broadcast, but
      // only the plugin's author may actually write it back (403 otherwise).
      console.log("Error updating plugin", err);
      if (err?.response?.status === 403) {
        sendLocalMessage("Only the plugin author can update this plugin.", "error");
      } else {
        sendLocalMessage("Failed to update plugin.", "error");
      }
    }
  };

  return refreshPlugin;
};

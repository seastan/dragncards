import { useContext } from 'react';
import { PluginContext } from '../../../contexts/PluginContext';

export const usePlugin = () => {
  const { plugin } = useContext(PluginContext);
  return plugin;
};
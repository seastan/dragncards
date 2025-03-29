import { usePlugin } from './usePlugin';
import useProfile from '../../../hooks/useProfile';

export const useThisPluginSettings = () => {
  const plugin = usePlugin();
  const user = useProfile();
  const thisPluginSettings = user?.plugin_settings?.[plugin.id] || {};
  return thisPluginSettings;
};
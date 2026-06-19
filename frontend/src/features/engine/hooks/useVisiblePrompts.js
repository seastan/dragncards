import { useMemo } from "react";
import { useSelector } from "react-redux";
import { usePlayerN } from "./usePlayerN";
import { useThisPluginSettings } from "./useThisPluginSettings";
import { usePlugin } from "./usePlugin";

export const useVisiblePrompts = () => {
    const playerN = usePlayerN();
    const thisPluginSettings = useThisPluginSettings();
    const plugin = usePlugin();
    const serverDontShowAgainPromptIds = thisPluginSettings?.game?.dontShowAgainPromptIds || {};

    // Read from localStorage so the setting is available immediately on page load,
    // before the async profile fetch completes and populates thisPluginSettings.
    const localDontShowAgainPromptIds = useMemo(() => {
      try {
        return JSON.parse(localStorage.getItem(`dontShowAgainPromptIds_${plugin?.id}`) || "{}");
      } catch { return {}; }
    }, [plugin?.id]);

    const dontShowAgainPromptIds = useMemo(() => ({
      ...localDontShowAgainPromptIds,
      ...serverDontShowAgainPromptIds,
    }), [localDontShowAgainPromptIds, serverDontShowAgainPromptIds]);

    const prompts = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.prompts) || {};

    const visiblePrompts = useMemo(() => {
      const newPrompts = {};
      Object.keys(prompts).forEach(key => {
        const prompt = prompts[key];
        if (!(prompt?.visible === false || dontShowAgainPromptIds?.[prompt.promptId] === true)) {
          newPrompts[key] = prompt;
        }
      });
      return newPrompts;
    }, [prompts, dontShowAgainPromptIds]);

    return visiblePrompts;
  };
  
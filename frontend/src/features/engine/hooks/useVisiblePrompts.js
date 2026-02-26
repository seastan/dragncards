import { useMemo } from "react";
import { useSelector } from "react-redux";
import { usePlayerN } from "./usePlayerN";
import { useThisPluginSettings } from "./useThisPluginSettings";

export const useVisiblePrompts = () => {
    const playerN = usePlayerN();
    const thisPluginSettings = useThisPluginSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const dontShowAgainPromptIds = thisPluginSettings?.game?.dontShowAgainPromptIds || {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
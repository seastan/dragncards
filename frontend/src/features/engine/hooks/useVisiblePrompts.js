import { useSelector } from "react-redux";
import { usePlayerN } from "./usePlayerN";
import { useThisPluginSettings } from "./useThisPluginSettings";

export const useVisiblePrompts = () => {
    const playerN = usePlayerN();
    const thisPluginSettings = useThisPluginSettings();
    const dontShowAgainPromptIds = thisPluginSettings?.game?.dontShowAgainPromptIds || {};
    const prompts = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.prompts) || {};
    console.log("useVisiblePrompts", prompts, thisPluginSettings);
    const newPrompts = {};
    Object.keys(prompts).forEach(key => {
        const prompt = prompts[key];
        if (prompt?.visible === false || dontShowAgainPromptIds?.[prompt.promptId] === true) {
            // Don't show this prompt
        } else {
            // Show this prompt
            newPrompts[key] = prompt;
        }
    });
    return newPrompts;
}
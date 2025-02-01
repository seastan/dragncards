import { useSelector } from "react-redux";
import useProfile from "../../../hooks/useProfile";
import { useGameDefinition } from "./useGameDefinition";
import { usePlugin } from "./usePlugin";
import { useVisibleFace } from "./useVisibleFace";
import { useVisibleSide } from "./useVisibleSide";

export const useVisibleFaceSrc = (cardId) => {
    const user = useProfile();
    const plugin = usePlugin();
    const gameDef = useGameDefinition();
    const visibleSide = useVisibleSide(cardId);
    const visibleFace = useVisibleFace(cardId);
    const databaseId = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.databaseId);

    if (!visibleFace) return null;

    const altArt = user?.plugin_settings?.[plugin?.id]?.altArt?.[databaseId]?.[visibleSide];
    const altBack = user?.plugin_settings?.[plugin?.id]?.altArt?.[visibleFace.name];

    if (altArt) return { src: altArt, default: null };
    if (altBack) return { src: altBack, default: null };

    const srcBase = visibleFace.imageUrl;


    if (!srcBase) {
        // No url, so must be a card back
        return {src: gameDef?.cardBacks?.[visibleFace.name]?.imageUrl, default: null }
    } else {
        // Card has a url. Let's see if it's a full url or just a suffix
        if (srcBase.startsWith('http')) {
            // Full url. Nothing to do here.
            return {src: srcBase, default: null }
        } else {
            // Just a suffix. Let's see if we have a prefix for this language.
            const srcDefault = gameDef?.imageUrlPrefix?.Default ? gameDef?.imageUrlPrefix?.Default + srcBase : null;
            const srcLanguage = gameDef?.imageUrlPrefix?.[user?.language] ? gameDef?.imageUrlPrefix?.[user?.language] + srcBase : null;
            if (srcLanguage) return {src: srcLanguage, default: srcDefault}
            else return {src: srcDefault, default: srcDefault }
        }
    }
}
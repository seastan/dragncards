import { useSelector } from "react-redux";
import useProfile from "../../../hooks/useProfile";
import { applyImageUrlPrefix } from "../functions/common";
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

    // If the face has no url of its own, it must be a card back, so use the url
    // from the card back definition. Either way the url may be a full url or
    // just a suffix that needs a language-specific prefix.
    const srcBase = visibleFace.imageUrl || gameDef?.cardBacks?.[visibleFace.name]?.imageUrl;

    return applyImageUrlPrefix(srcBase, gameDef, user?.language);
}

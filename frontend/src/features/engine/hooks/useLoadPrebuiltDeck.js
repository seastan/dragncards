import { useGameDefinition } from './useGameDefinition';
import { useDoActionList } from './useDoActionList';
import { useSendLocalMessage } from './useSendLocalMessage';

export const useLoadPrebuiltDeck = () => {
    const gameDef = useGameDefinition();
    const doActionList = useDoActionList();
    const sendLocalMessage = useSendLocalMessage();

    return (deckId) => {
        const deck = gameDef.preBuiltDecks[deckId];
        if (deck) {
            sendLocalMessage("Loading "+deck.label+"...");
            doActionList([
                ["LOG", `{{$ALIAS_N}} loaded ${deck.label}.`],
                ["LOAD_CARDS", deckId]
            ])
        } else {
            alert("Deck not found");
        }
    }

};
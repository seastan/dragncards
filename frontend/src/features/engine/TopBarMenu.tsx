import React, { useContext, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import store from "../../store";
import { Menu, MenuItem, SubMenu } from "../../components/basic/Menu";
import {
  setRandomNumBetween,
  setShowModal,
  setAutoLoadedDecks,
  setDropdownMenu,
  setActiveCardId,
} from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import BroadcastContext from "../../contexts/BroadcastContext";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { getBackEndPlayerUi, getRandomIntInclusive } from "./functions/common";
import { useImportLoadList } from "./hooks/useImportLoadList";
import { loadMarvelCdb, loadRingsDb, useImportViaUrl } from "./hooks/useImportViaUrl";
import { useIsHost } from "./hooks/useIsHost";
import { usePlayerN } from "./hooks/usePlayerN";
import { useCardDb } from "./hooks/useCardDb";
import useProfile from "../../hooks/useProfile";

export const TopBarMenu = React.memo(() => {
  const { gameBroadcast } = useContext(BroadcastContext) as any;
  const history = useHistory();
  const gameL10n = useGameL10n();
  const siteL10n = useSiteL10n();
  const gameDef = useGameDefinition();
  const doActionList: any = useDoActionList();
  const importViaUrl = useImportViaUrl();
  const importLoadList = useImportLoadList();
  const cardDb = useCardDb();
  const user: any = useProfile();

  const isHost = useIsHost();
  const playerN = usePlayerN();
  const randomNumBetween = useSelector((state: any) => state?.playerUi?.randomNumBetween);
  const gameOptions = useSelector((state: any) => state?.gameUi?.game?.options);
  const autoLoadedDecksGame = useSelector((state: any) => state?.gameUi?.game?.autoLoadedDecks);
  const autoLoadedDecksPlayer = useSelector((state: any) => state?.playerUi?.autoLoadedDecks);
  const pluginId = useSelector((state: any) => state?.gameUi?.game?.pluginId);

  const dispatch = useDispatch();
  const inputFileDeck = useRef<HTMLInputElement>(null);
  const inputFileGame = useRef<HTMLInputElement>(null);

  const handleMenuClick = (data: any) => {
    if (!playerN) {
      alert(siteL10n("pleaseSit"));
      return;
    }
    if (data.action === "clear_table") {
      // Reset game
      const playerUi = getBackEndPlayerUi(store.getState());
      doActionList(data.actionList, `Cleared the table`);
      gameBroadcast("reset_game", { options: { player_ui: playerUi } });
    } else if (data.action === "reset_and_reload") {
      // Reload cards
      const playerUi = getBackEndPlayerUi(store.getState());
      doActionList(data.actionList, `Cleared the table and reloaded cards`);
      gameBroadcast("reset_and_reload", { options: { player_ui: playerUi } });
    } else if (data.action === "close_room") {
      // Mark status
      const playerUi = getBackEndPlayerUi(store.getState());
      // Save replay
      doActionList(data.actionList, `Closed the room`);
      // Close room
      history.push("/profile");
      gameBroadcast("close_room", { options: { player_ui: playerUi } });
    } else if (data.action === "load_deck") {
      loadFileDeck();
    } else if (data.action === "load_url") {
      importViaUrl();
    } else if (data.action === "unload_my_deck") {
      doActionList(["UNLOAD_CARDS", "$PLAYER_N"], `Unloaded all cards for player ${playerN}`);
    } else if (data.action === "unload_shared_cards") {
      doActionList(["UNLOAD_CARDS", "shared"], `Unloaded all shared cards`);
    } else if (data.action === "random_coin") {
      const result = getRandomIntInclusive(0, 1);
      if (result) doActionList(["LOG", "$ALIAS_N", " flipped heads."], `Flipped a coin for player ${playerN}`);
      else doActionList(["LOG", "$ALIAS_N", " flipped tails."]);
    } else if (data.action === "random_number") {
      const max = parseInt(prompt("Random number between 1 and...", randomNumBetween) || "");
      if (max >= 1) {
        dispatch(setRandomNumBetween(max));
        const result = getRandomIntInclusive(1, max);
        doActionList(
          ["LOG", "$ALIAS_N", " chose a random number (1-" + max + "): " + result],
          `Chose a random number for player ${playerN}`
        );
      }
    } else if (data.action === "spawn_existing") {
      dispatch(setShowModal("card"));
    } else if (data.action === "developer_tools") {
      dispatch(setShowModal("developer"));
    } else if (data.action === "spawn_deck") {
      dispatch(setShowModal("prebuilt_deck"));
    } else if (data.action === "spawn_public_deck") {
      dispatch(setShowModal("public_deck"));
    } else if (data.action === "download") {
      downloadGameAsJson();
    } else if (data.action === "downloadReplay") {
      downloadReplayAsJson();
    } else if (data.action === "load_o8d") {
      loadFileDeck();
    } else if (data.action === "load_game") {
      loadFileGame();
    } else if (data.action === "layout") {
      let actionList: any[];
      if (data.playerI === "shared") {
        actionList = [
          ["LOG", "$ALIAS_N", " changed the layout for everyone to " + gameL10n(data.value.label) + "."],
          ["SET_LAYOUT", "shared", data.value.layoutId],
          ["SET", "/numPlayers", data.value.numPlayers ? data.value.numPlayers : "$GAME.numPlayers"],
        ];
      } else {
        actionList = [
          ["LOG", "$ALIAS_N", " changed the layout for themselves to " + gameL10n(data.value.label) + "."],
          ["SET_LAYOUT", playerN, data.value.layoutId],
        ];
      }
      doActionList(actionList, `Changed layout to ${data.value.layoutId} for player ${data.playerI}`);
    } else if (data.action === "set_num_players") {
      const actionList = [
        ["LOG", "$ALIAS_N", " changed the number of players to " + data.value.numPlayers + "."],
        ["SET", "/numPlayers", data.value.numPlayers],
        ["SET_LAYOUT", "shared", data.value.layoutId],
      ];
      doActionList(actionList, `${playerN} set number of players to ${data.value.numPlayers}`);
    }
  };

  const loadFileDeck = () => {
    inputFileDeck.current?.click();
  };

  const loadFileGame = () => {
    inputFileGame.current?.click();
  };

  const uploadGameOrReplayJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const reader = new FileReader();
    reader.onload = async (event: any) => {
      var replayObj = null;
      try {
        replayObj = JSON.parse(event.target.result);
      } catch (e) {
        alert("Replay must be a valid JSON file."); // error in the above string (in this case, yes)!
      }
      if (replayObj) {
        if (replayObj.game && replayObj.deltas) {
          // Update the saved game to have the current pluginId
          if (pluginId !== replayObj.game.pluginId) {
            // Ask the user if they want to proceed
            const proceed = window.confirm(
              "The uploaded replay uses a different plugin ID than the current room. Loading it may crash your room. Proceed anyway?"
            );
            if (!proceed) return;
            replayObj.game.pluginId = pluginId;
          }
          gameBroadcast("set_replay", { replay: replayObj });
          gameBroadcast("send_alert", { message: `${user.alias} uploaded a replay.` });
        } else if (replayObj.roomSlug) {
          const game = replayObj;
          // Update the saved game to have the current pluginId
          if (pluginId !== game.pluginId) {
            // Ask the user if they want to proceed
            const proceed = window.confirm(
              "The uploaded game uses a different plugin ID than the current room. Loading it may crash your room. Proceed anyway?"
            );
            if (!proceed) return;
            game.pluginId = pluginId;
          }
          gameBroadcast("game_action", {
            action: "set_game",
            options: { game: game, description: "Game loaded from JSON file." },
          });
          gameBroadcast("send_alert", { message: `${user.alias} uploaded a game.` });
        } else {
          alert("Uploaded JSON file does not look like a valid game or replay.");
        }
      }
    };
    reader.readAsText(event.target.files![0]);
    inputFileGame.current!.value = "";
  };

  const sectionToLoadGroupId = (section: string) => {
    const mapping = gameDef.o8dImport.o8dSectionToLoadGroupId;
    const otherLoadGroupId = gameDef.o8dImport.otherGroupId;
    if (mapping[section]) return mapping[section];
    else return otherLoadGroupId;
  };

  const loadDeckFromXmlText = (xmlText: string) => {
    if (!gameDef.o8dImport) {
      alert("This game does not support o8d import.");
      return;
    }

    var parseString = require("xml2js").parseString;
    parseString(xmlText, function (err: any, deckJSON: any) {
      if (!deckJSON) return;
      const sections = deckJSON.deck.section;
      var loadList: any[] = [];
      sections.forEach((section: any) => {
        const sectionName = section["$"].name;
        const cards = section.card;
        if (!cards) return;
        cards.forEach((card: any) => {
          const cardDbId = card["$"].id;
          const quantity = parseInt(card["$"].qty);
          loadList.push({
            databaseId: cardDbId,
            quantity: quantity,
            loadGroupId: sectionToLoadGroupId(sectionName),
          });
        });
      });
      importLoadList(loadList);
    });
  };

  const loadO8D = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const reader = new FileReader();
    reader.onload = async (event: any) => {
      const xmlText = event.target.result;
      loadDeckFromXmlText(xmlText);
    };
    reader.readAsText(event.target.files![0]);
    inputFileDeck.current!.value = "";
  };

  const downloadGameAsJson = () => {
    const state: any = store.getState();
    const exportObj = state.gameUi.game;
    const exportName = state.gameUi.roomSlug + "_game";
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    gameBroadcast("send_alert", { message: `${user.alias} downloaded the game.` });
  };

  const downloadReplayAsJson = () => {
    if (user.supporter_level < 3) {
      dispatch(setShowModal("patreon"));
      dispatch(setDropdownMenu(null));
      dispatch(setActiveCardId(null));
      return;
    }

    const state: any = store.getState();
    const exportObj = {
      game: state.gameUi.game,
      deltas: state.gameUi.deltas,
    };
    const exportName = state.gameUi.roomSlug + "_replay";
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    gameBroadcast("send_alert", { message: `${user.alias} downloaded the replay.` });
  };

  useEffect(() => {
    if (autoLoadedDecksGame !== true && autoLoadedDecksPlayer !== true && gameOptions?.externalData) {
      const externalData = gameOptions.externalData;
      const domain = externalData.domain;
      const type = externalData.type;
      const id = externalData.id;
      doActionList(["SET", "/autoLoadedDecks", true], "Set autoLoadedDecks to true");
      dispatch(setAutoLoadedDecks(true));
      if (domain === "ringsdbtest") {
        loadRingsDb(importLoadList, doActionList, playerN, "test", type, id);
      } else if (domain === "ringsdb") {
        loadRingsDb(importLoadList, doActionList, playerN, "ringsdb", type, id);
      } else if (domain === "marvelcdb") {
        loadMarvelCdb(importLoadList, doActionList, playerN, "marvelcdb", type, id, cardDb);
      }
    }
  }, [autoLoadedDecksGame]);

  return (
    <>
      {/* Hidden file inputs, triggered via refs by the menu items. Kept always
          mounted (in a hidden <li> so the menubar only contains list items). */}
      <li role="none" hidden>
        <input type="file" ref={inputFileDeck} hidden onChange={loadO8D} accept=".o8d" />
        <input type="file" ref={inputFileGame} hidden onChange={uploadGameOrReplayJson} accept=".json" />
      </li>

      <Menu label={siteL10n("menu")}>
        <SubMenu label={siteL10n("load")}>
          <MenuItem onClick={() => handleMenuClick({ action: "spawn_deck" })}>
            {siteL10n("loadPrebuiltDeck")}
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick({ action: "spawn_public_deck" })}>
            {siteL10n("loadPublicCustomDeck")}
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick({ action: "load_url" })}>
            {siteL10n("Load via URL")}
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick({ action: "load_o8d" })}>
            {siteL10n("loadO8D")}
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick({ action: "load_game" })}>
            {siteL10n("loadGameOrReplayJson")}
          </MenuItem>
        </SubMenu>

        <SubMenu label={siteL10n("unload")}>
          <MenuItem onClick={() => handleMenuClick({ action: "unload_my_deck" })}>
            {siteL10n("unloadMyCards")}
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick({ action: "unload_shared_cards" })}>
            {siteL10n("unloadSharedCards")}
          </MenuItem>
        </SubMenu>

        {isHost && (
          <SubMenu label={siteL10n("numberOfPlayers")}>
            {gameDef.playerCountMenu?.map((menuOption: any, i: number) => (
              <MenuItem key={i} onClick={() => handleMenuClick({ action: "set_num_players", value: menuOption })}>
                {gameL10n(menuOption.label)}
              </MenuItem>
            ))}
          </SubMenu>
        )}

        <MenuItem onClick={() => handleMenuClick({ action: "spawn_existing" })}>
          {siteL10n("spawnCard")}
        </MenuItem>

        <SubMenu label={siteL10n("random")}>
          <MenuItem onClick={() => handleMenuClick({ action: "random_coin" })}>{siteL10n("coin")}</MenuItem>
          <MenuItem onClick={() => handleMenuClick({ action: "random_number" })}>{siteL10n("number")}</MenuItem>
        </SubMenu>

        <SubMenu label={siteL10n("dragnOptions")}>
          <MenuItem onClick={() => handleMenuClick({ action: "developer_tools" })}>
            {siteL10n("developerTools")}
          </MenuItem>
        </SubMenu>

        <SubMenu label={siteL10n("pluginOptions")}>
          {gameDef.pluginMenu?.options?.map((menuFunction: any, index: number) => (
            <MenuItem
              key={index}
              onClick={() => doActionList(menuFunction.actionList, `Plugin Options ${menuFunction.label}`)}
            >
              {gameL10n(menuFunction.label)}
            </MenuItem>
          ))}
        </SubMenu>

        <SubMenu label={siteL10n("download")}>
          <MenuItem onClick={() => handleMenuClick({ action: "download" })}>{siteL10n("gameStateJson")}</MenuItem>
          <MenuItem onClick={() => handleMenuClick({ action: "downloadReplay" })}>{siteL10n("fullReplay")}</MenuItem>
        </SubMenu>

        {isHost && (
          <SubMenu label={siteL10n("clearTable")}>
            {gameDef["clearTableOptions"]?.map((option: any, index: number) => (
              <MenuItem key={index} onClick={() => handleMenuClick({ action: "clear_table", actionList: option.actionList })}>
                {gameL10n(option.label)}
              </MenuItem>
            ))}
          </SubMenu>
        )}

        {isHost && (
          <SubMenu label={siteL10n("resetDecks")}>
            {gameDef["clearTableOptions"]?.map((option: any, index: number) => (
              <MenuItem key={index} onClick={() => handleMenuClick({ action: "reset_and_reload", actionList: option.actionList })}>
                {gameL10n(option.label)}
              </MenuItem>
            ))}
          </SubMenu>
        )}

        {isHost && (
          <SubMenu label={siteL10n("closeRoom")}>
            {gameDef["clearTableOptions"]?.map((option: any, index: number) => (
              <MenuItem key={index} onClick={() => handleMenuClick({ action: "close_room", actionList: option.actionList })}>
                {gameL10n(option.label)}
              </MenuItem>
            ))}
          </SubMenu>
        )}
      </Menu>
    </>
  );
});

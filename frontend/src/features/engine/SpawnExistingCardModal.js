import React, {useContext, useState} from "react";
import ReactModal from "react-modal";
import { useDispatch, useSelector } from "react-redux";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useProfile from "../../hooks/useProfile";
import { setShowModal, setTyping } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import BroadcastContext from "../../contexts/BroadcastContext";
import { usePlugin } from "./hooks/usePlugin";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { useImportLoadList } from "./hooks/useImportLoadList";
import { Z_INDEX } from "./functions/common";

const RESULTS_LIMIT = 150;

// Card faces are keyed A..H; we search every side that has a name so a card can
// be found by its back name too.
const SIDE_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const normalize = (str) =>
  (str || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export const SpawnExistingCardModal = React.memo(({}) => {
  const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
  const dispatch = useDispatch();
  const gameL10n = useGameL10n();
  const myUser = useProfile();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const plugin = usePlugin();
  const gameDef = useGameDefinition();
  const loadList = useImportLoadList();
  const cardDb = plugin?.card_db || {};
  const doActionList = useDoActionList();
  const [loadGroupId, setLoadGroupId] = useState(gameDef?.spawnExistingCardModal?.loadGroupIds?.[0]);
  // Each match is {cardId, side}: the side whose name matched (and that will be
  // loaded face-up). Start empty so nothing renders until the user searches.
  const [matches, setMatches] = useState([]);
  const [searchString, setSearchString] = useState("");

  if (Object.keys(cardDb).length === 0) return null;

  const columnProperties = gameDef.spawnExistingCardModal?.columnProperties || ["name"];

  const handleSpawnClick = (cardId, side) => {
    const cardDetails = cardDb[cardId];
    if (!cardDetails || !playerN) return;
    const cardName = cardDetails[side]?.name || cardDetails["A"]?.name;
    const cardListItem = {databaseId: cardId, quantity: 1, loadGroupId};
    // Only override the starting side when it isn't the default A, so normal
    // spawns keep relying on the group's defaultSideUp.
    if (side && side !== "A") cardListItem.currentSide = side;
    loadList([cardListItem]);
    doActionList(
      ["LOG", "$ALIAS_N", " spawned " + cardName + "."],
      `Spawn card ${cardId}: ${cardName}`,
      true
    );
  };

  const handleSpawnTyping = (event) => {
    const value = event.target.value;
    setSearchString(value);
    const needle = normalize(value);
    if (!needle) {
      setMatches([]);
      return;
    }
    const newMatches = [];
    for (const cardId of Object.keys(cardDb)) {
      const cardRow = cardDb[cardId];
      // Prefer a side A match (the canonical face); otherwise take the first
      // other side whose name matches, so that side is the one we load.
      let matchedSide = null;
      for (const side of SIDE_KEYS) {
        const face = cardRow[side];
        if (!face || !face.name) continue;
        if (normalize(face.name).includes(needle)) {
          matchedSide = side;
          break;
        }
      }
      if (matchedSide) newMatches.push({cardId, side: matchedSide});
    }
    setMatches(newMatches);
  };

  const inputBaseBorder = "#374151";
  const renderResults = () => {
    if (matches.length === 0) {
      return (
        <div style={{color: "#9ca3af", fontSize: "0.95rem", padding: "12px 0", textAlign: "center"}}>
          {searchString ? "No results" : "Start typing to search cards"}
        </div>
      );
    }
    if (matches.length > RESULTS_LIMIT) {
      return (
        <div style={{color: "#9ca3af", fontSize: "0.95rem", padding: "12px 0", textAlign: "center"}}>
          Too many results
        </div>
      );
    }
    return (
      <div style={{borderRadius: "6px", overflow: "hidden", border: "1px solid #374151"}}>
        <table style={{width: "100%", borderCollapse: "collapse", fontSize: "0.95rem"}}>
          <thead>
            <tr style={{backgroundColor: "#1f2937"}}>
              {columnProperties.map((prop, colindex) => {
                const propLabel = gameDef.faceProperties?.[prop]?.label
                  ? gameL10n(gameDef.faceProperties[prop].label)
                  : prop;
                return (
                  <th
                    key={colindex}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      color: "#9ca3af",
                      fontWeight: 500,
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>
                    {propLabel}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {matches.map(({cardId, side}, rowindex) => {
              const face = cardDb[cardId][side];
              const bgColor = rowindex % 2 === 0 ? "#374151" : "#1f2937";
              return (
                <tr
                  key={cardId + "-" + side}
                  style={{backgroundColor: bgColor, cursor: "pointer", transition: "background 0.15s"}}
                  onClick={() => handleSpawnClick(cardId, side)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#4b5563"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = bgColor}>
                  {columnProperties.map((prop, colindex) => (
                    <td key={colindex} style={{padding: "8px 12px", color: "white", wordBreak: "break-word"}}>
                      {face?.[prop]}
                      {prop === "name" && side !== "A" && (
                        <span style={{marginLeft: "6px", color: "#9ca3af", fontSize: "0.8rem"}}>
                          (Side {side})
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={true}
      onRequestClose={() => {
        dispatch(setShowModal(null));
        dispatch(setTyping(false));
      }}
      contentLabel="Spawn a card"
      overlayClassName="fixed inset-0 bg-black-50"
      className="insert-auto bg-gray-800 border border-gray-600 mx-auto mt-12 rounded-lg outline-none"
      style={{
        overlay: {
          zIndex: Z_INDEX.Modal
        },
        content: {
          width: "44vw",
          minWidth: "360px",
          maxWidth: "760px",
          maxHeight: "85dvh",
          overflowY: "auto",
        }
      }}>
      <div style={{padding: "20px 24px 8px 24px", borderBottom: "1px solid #374151"}}>
        <h1 style={{margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "white", letterSpacing: "-0.01em"}}>
          Spawn Card
        </h1>
        <p style={{margin: "4px 0 0 0", fontSize: "0.8rem", color: "#9ca3af"}}>
          Search by either side's name and click to add it to the game
        </p>
      </div>
      <div style={{padding: "12px 24px 20px 24px"}}>
        <div style={{marginBottom: "12px"}}>
          <div style={{fontSize: "0.8rem", color: "#9ca3af", marginBottom: "6px"}}>
            Load group
          </div>
          <div style={{display: "flex", flexWrap: "wrap", gap: "6px"}}>
            {gameDef?.spawnExistingCardModal?.loadGroupIds?.map((groupId, _groupIndex) => {
              const isSelected = groupId === loadGroupId;
              return (
                <button
                  key={groupId}
                  type="button"
                  onClick={() => setLoadGroupId(groupId)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.875rem",
                    backgroundColor: isSelected ? "#b91c1c" : "#1f2937",
                    border: "1px solid " + (isSelected ? "#ef4444" : "#374151"),
                    color: isSelected ? "white" : "#d1d5db",
                    fontWeight: isSelected ? 600 : 400,
                    borderRadius: "6px",
                    cursor: "pointer",
                    outline: "none",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "#374151"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "#1f2937"; }}>
                  {gameL10n(gameDef?.groups?.[groupId]?.label)}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{position: "relative", marginBottom: "12px"}}>
          <FontAwesomeIcon
            icon={faSearch}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6b7280",
              fontSize: "0.85rem",
              pointerEvents: "none",
            }}
          />
          <input
            autoFocus
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              fontSize: "0.875rem",
              backgroundColor: "#1f2937",
              border: "1px solid " + inputBaseBorder,
              color: "white",
              borderRadius: "6px",
              outline: "none",
              boxSizing: "border-box",
            }}
            type="text"
            id="name"
            name="name"
            placeholder="Card name..."
            value={searchString}
            onChange={handleSpawnTyping}
            onFocus={(e) => { dispatch(setTyping(true)); e.target.style.borderColor = "#6b7280"; }}
            onBlur={(e) => { dispatch(setTyping(false)); e.target.style.borderColor = inputBaseBorder; }}
          />
        </div>
        {renderResults()}
      </div>
    </ReactModal>
  );
})

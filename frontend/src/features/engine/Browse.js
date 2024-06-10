import React, { useContext, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { DroppableRegion } from "./DroppableRegion";
import { useBrowseTopN } from "./hooks/useBrowseTopN";
import { setValues } from "../store/gameUiSlice";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { setDropdownMenu, setTyping } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { DEFAULT_CARD_Z_INDEX, getParentCardsInGroup } from "./functions/common";
import Draggable from "react-draggable";
import { useCardScaleFactor } from "./hooks/useCardScaleFactor";

const isNormalInteger = (val) => {
  var n = Math.floor(Number(val));
  return n !== Infinity && n === val && n >= 0;
}

const browseWidth = "98%";
const browseLeft = "1%";

export const Browse = React.memo(({}) => {
  const dispatch = useDispatch();
  const gameL10n = useGameL10n();
  const gameDef = useGameDefinition();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const groupId = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.id);
  const browseGroupTopN = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.topN);
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const cardScaleFactor = useCardScaleFactor();
  const region = {type: "fan", direction: "horizontal", groupId: groupId, layerIndex: 9, left: browseLeft, width: "65%", top: "50%", height: `${cardScaleFactor*1.1 + 3}vh`, top: "50%"};
  const game = useSelector(state => state?.gameUi?.game);
  const parentCards = getParentCardsInGroup(game, groupId);
  const [searchForProperty, setSearchForProperty] = useState('All');
  const [searchForText, setSearchForText] = useState('');
  const stackIds = group?.["stackIds"] || [];
  const numStacks = stackIds.length;
  const browseTopN = useBrowseTopN();
  const doActionList = useDoActionList();
  var filterButtons = gameDef?.browse?.filterValuesSideA;
  filterButtons = ["All", ...filterButtons, "Other"];
  var pairedFilterButtons = filterButtons?.reduce((acc, curr, i) => {
    if (i % 2 === 0) {
      acc.push([curr, filterButtons[i + 1]]);
    }
    return acc;
  }, [])

  if (!group) return;
  console.log("Rendering Browse", groupId, region, browseGroupTopN)

  const handleBarsClick = (event) => {
    event.stopPropagation();
    const dropdownMenu = {
        type: "group",
        group: group,
        title: gameL10n(gameDef.groups[groupId].label)
    }
    dispatch(setDropdownMenu(dropdownMenu));
  }

  // This allows the deck to be hidden instantly upon close (by hiding the top card)
  // rather than waiting to the update from the server
  const stopPeekingTopCard = () => {
    if (numStacks === 0) return null;
    const stackId0 = stackIds[0];
    const cardIds = game["stackById"][stackId0]["cardIds"];
    const cardId0 = cardIds[0];
    const updates = [["game", "cardById", cardId0, "peeking", playerN, false]];
    dispatch(setValues({updates: updates})) 
  }

  const handleCloseClick = (option) => {
    if (playerN) {
      if (option === "shuffle") closeAndShuffle();
      else if (option === "order") closeAndOrder();
      else if (option === "peeking") closeAndPeeking();
    }
    setSearchForText('');
    setSearchForProperty('All');
  }

  const closeAndShuffle = () => {
    const actionList = [
      ["LOG", "$ALIAS_N", " closed ", gameL10n(group.label)+"."],
      ["SET", "/playerData/$PLAYER_N/browseGroup/id", null],
      ["FOR_EACH_VAL", "$STACK_ID", `$GROUP_BY_ID.${groupId}.stackIds`,
        [
          ["VAR", "$CARD_ID", "$STACK_BY_ID.$STACK_ID.cardIds.[0]"],
          ["SET", "/cardById/$CARD_ID/peeking/$PLAYER_N", false]
        ]
      ],
      ["LOG", "$ALIAS_N", " shuffled ", gameL10n(group.label)+"."],
      ["SHUFFLE_GROUP", groupId]
    ];
    doActionList(actionList);
    if (group?.onCardEnter?.currentSide === "B") stopPeekingTopCard();
  }

  const closeAndOrder = () => {
    const actionList = [
      ["LOG", "$ALIAS_N", " closed ", gameL10n(group.label)+"."],
      ["SET", "/playerData/$PLAYER_N/browseGroup/id", null],
      ["FOR_EACH_VAL", "$STACK_ID", `$GROUP_BY_ID.${groupId}.stackIds`,
        [
          ["VAR", "$CARD_ID", "$STACK_BY_ID.$STACK_ID.cardIds.[0]"],
          ["SET", "/cardById/$CARD_ID/peeking/$PLAYER_N", false]
        ]
      ]
    ];
    doActionList(actionList);
    if (group?.onCardEnter?.currentSide === "B") stopPeekingTopCard();
  }

  const closeAndPeeking = () => {
    const actionList = [
      ["SET", "/playerData/$PLAYER_N/browseGroup/id", null],
      ["LOG", "$ALIAS_N", " is still peeking at ", gameL10n(group.label)+"."],
    ];
    doActionList(actionList);
  }

  const handleSelectClick = (event) => {
    const topNstr = event.target.value;
    browseTopN(group.id, topNstr)
  }

  const handleInputTyping = (event) => {
    setSearchForText(event.target.value);
  }

  // If browseGroupTopN not set, or equal to "All" or "None", show all stacks
  var browseGroupTopNint = isNormalInteger(browseGroupTopN) ? parseInt(browseGroupTopN) : numStacks;
  if (browseGroupTopNint < 0) browseGroupTopNint = numStacks;
  if (browseGroupTopNint > numStacks) browseGroupTopNint = numStacks;
  var filteredStackIndices = [...Array(browseGroupTopNint).keys()];
  
  // Filter by selected card type
  if (searchForProperty === "Other") {
      filteredStackIndices = filteredStackIndices.filter((stackIndex) => {
        const stackId = stackIds[stackIndex];
        const propertyValue = parentCards[stackIndex]?.sides?.A?.[gameDef?.browse?.filterPropertySideA];
        const isValueOther = !gameDef?.browse?.filterValuesSideA?.includes(propertyValue);
        const isPeekingOrCurrentSideA = (
          parentCards[stackIndex].peeking[playerN] || 
          parentCards[stackIndex].currentSide === "A"
        );
        return stackId && isPeekingOrCurrentSideA && isValueOther
      });
  } else if (searchForProperty !== "All") 
    filteredStackIndices = filteredStackIndices.filter((stackIndex) => (
      stackIds[stackIndex] && 
      parentCards[stackIndex]?.sides?.A?.[gameDef?.browse?.filterPropertySideA] === searchForProperty &&
      (parentCards[stackIndex]?.peeking?.[playerN] || parentCards[stackIndex]?.currentSide === "A") 
  ));  

  if (searchForText) {
    const properties = gameDef.browse.textPropertiesSideA;
    filteredStackIndices = filteredStackIndices.filter((stackIndex) => {
      const stackId = stackIds[stackIndex];
      const card = parentCards[stackIndex]?.sides?.A;
      const isCardMatching = properties.some((prop) =>
        card?.[prop]?.toLowerCase().includes(searchForText.toLowerCase())
      );
      const isPeekingOrCurrentSideA = (
        parentCards[stackIndex].peeking[playerN] || 
        parentCards[stackIndex].currentSide === "A"
      );
      return stackId && isCardMatching && isPeekingOrCurrentSideA;
    });
  }

  return(
    //<Draggable handle="strong">
    <div className="absolute rounded-lg bg-gray-700 w-full" 
      style={{
        left: region.left,
        width: browseWidth,
        top: region.top,
        height: region.height,
        zIndex: 2*DEFAULT_CARD_Z_INDEX+2,
        boxShadow: "0 0 10px 5px rgba(0,0,0,0.6)"
      }}>
      <strong className="bg-gray-600 w-full text-gray-300 flex justify-center items-center" style={{height: "3vh", borderTopLeftRadius: "1vh", borderTopRightRadius: "1vh"}}>
        <FontAwesomeIcon onClick={(event) => handleBarsClick(event)}  className="cursor-pointer hover:text-white" icon={faBars}/>
        <span className="px-2">{gameL10n(gameDef.groups[group.id].label)}</span>
      </strong>
      
      <div className="w-full" style={{height: `calc(100% - 3vh)`}}>
        <div className="h-full float-left" style={{width: "70%"}}>        
          <div
            className="relative h-full float-left select-none text-gray-300"
            style={{width:"1.7vh"}}>
              <div className="relative w-full h-full">
                <span 
                  className="absolute pb-2 overflow-hidden" 
                  style={{fontSize: "1.5vh", top: "50%", left: "50%", transform: `translate(-50%, -70%) rotate(90deg)`, whiteSpace: "nowrap"}}>
                  (Top)
                </span>
              </div>
          </div>
          <div className="h-full" style={{marginLeft: "1.7vh", width: "calc(100% - 1.7vh)"}}>
            <DroppableRegion
              groupId={groupId}
              region={region}
              selectedStackIndices={filteredStackIndices}
            />
          </div>
        </div>
  
        <div className="float-left p-1 pl-2 h-full select-none" style={{left:"70%", width:"20%"}}>
              
          <div className="h-1/5 w-full">
            <div className="h-full float-left w-1/2 px-0.5">
              <select 
                name="numFaceup" 
                id="numFaceup"
                className="form-control w-full bg-gray-900 text-white border-0 h-full px-1 py-0"
                onChange={handleSelectClick}>
                <option value="" disabled selected>{gameL10n("Peek at...")}</option>
                <option value="None">{gameL10n("None")}</option>
                <option value="All">{gameL10n("All")}</option>
                <option value="5">{gameL10n("Top 5")}</option>
                <option value="10">{gameL10n("Top 10")}</option>
              </select>
            </div>
            <div className="h-full float-left w-1/2 px-0.5">
              <input
                type="text"
                name="name"
                id="name"
                placeholder="Search.."
                className="form-control w-full bg-gray-900 text-white border-0 h-full px-1"
                onFocus={event => dispatch(setTyping(true))}
                onBlur={event => dispatch(setTyping(false))}
                onChange={handleInputTyping}
              />
            </div>
          </div>
          {pairedFilterButtons.map((row, rowIndex) => {
            return(
              <div className="w-full text-white text-center" style={{height: `calc(100% / ${pairedFilterButtons.length+1})`}}>
                {row.map((item, itemIndex) => {
                  return(
                    <div className="h-full float-left w-1/2 p-0.5">
                      <div className={"h-full w-full flex items-center justify-center hover:bg-gray-600 rounded" + (searchForProperty === item ? " bg-red-800" : " bg-gray-800")}
                        onClick={() => setSearchForProperty(item)}>    
                        {gameL10n(row[itemIndex])}
                      </div>
                    </div>
                  )
                })}
            </div>
            )})
          }
        </div>

        <div className="h-full float-left p-1 select-none" style={{left: "90%", width: "10%"}}>
          <div className="h-1/4 w-full text-white text-center">
            <div className="h-full float-left w-full p-0.5">
              <div className="h-full w-full">   
                Close &
              </div>
            </div>
          </div>
          {[["Shuffle", "shuffle"],
            ["Keep order", "order"],
            ["Keep peeking", "peeking"]
            ].map((row, rowIndex) => {
              if (!playerN && row[1] === "shuffle") return;
              if (!playerN && row[1] === "peeking") return; 
              return(
                <div className="h-1/4 w-full text-white text-center">
                  <div className="h-full float-left w-full p-0.5">
                    <div className="flex h-full w-full bg-gray-800 hover:bg-gray-600 rounded items-center justify-center"
                      onClick={(event) => handleCloseClick(row[1])}>    
                      {gameL10n(row[0])}
                    </div>
                  </div>
                </div>
              )})
            }
        </div>
      </div>
    </div>
    //</Draggable>
  )
})

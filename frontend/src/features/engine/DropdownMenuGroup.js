import React from "react";
import { faArrowUp, faArrowDown, faRandom, faChevronRight, faCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DropdownItem, GoBack, EMBEDDED_MENU_STYLE } from "./DropdownMenuHelpers";
import "../../css/custom-dropdown.css";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlayerIList } from "./hooks/usePlayerIList";
import { useBrowseTopN } from "./hooks/useBrowseTopN";
import { dragnActionLists } from "./functions/dragnActionLists";
import { setActiveCardId, setDropdownMenu } from "../store/playerUiSlice";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { useGameL10n } from "./hooks/useGameL10n";
import { Z_INDEX } from "./functions/common";

const DropdownMoveTo = ({ destGroupId, origGroupId, numStacks, handleDropdownClick, siteL10n }) => {
  return (
    <div className="menu">
      <GoBack goToMenu="moveTo" clickCallback={handleDropdownClick}/>
      <DropdownItem
        leftIcon={<FontAwesomeIcon icon={faArrowUp}/>}
        action={dragnActionLists.moveAllStacksTo(origGroupId, destGroupId, numStacks, "top")}
        clickCallback={handleDropdownClick}>
        {siteL10n("Top")}
      </DropdownItem>
      <DropdownItem
        leftIcon={<FontAwesomeIcon icon={faRandom}/>}
        action={dragnActionLists.moveAllStacksTo(origGroupId, destGroupId, numStacks, "shuffle")}
        clickCallback={handleDropdownClick}>
        {siteL10n("Shuffle in")}
      </DropdownItem>
      <DropdownItem
        leftIcon={<FontAwesomeIcon icon={faArrowDown}/>}
        action={dragnActionLists.moveAllStacksTo(origGroupId, destGroupId, numStacks, "bottom")}
        clickCallback={handleDropdownClick}>
        {siteL10n("Bottom")}
      </DropdownItem>
    </div>
  )
}

export const DropdownMenuGroup = React.memo(({
  embedded = false,
  mouseX,
  mouseY,
  menuHeight,
  handleDropdownClick,
  calcHeight,
  activeMenu,
}) => {
  const siteL10n = useSiteL10n();
  const gameL10n = useGameL10n();
  const dispatch = useDispatch();
  const dropdownMenu = useSelector(state => state?.playerUi?.dropdownMenu);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const playerIList = usePlayerIList();
  const menuGroup = dropdownMenu.group;
  const gameDef = useGameDefinition();
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[menuGroup.id]);
  const numStacks = group?.stackIds?.length || 0;
  const browseTopN = useBrowseTopN();
  const choicesTopN = gameDef.groupMenu?.peekAtTopN || [5,10];

  const regionEntry = useSelector(state => {
    const regions = state?.gameUi?.game?.playerData?.[playerN]?.layout?.regions;
    if (!regions) return null;
    for (const [key, region] of Object.entries(regions)) {
      if (!region.groupId) continue;
      const resolvedId = region.groupId.replace(/playerN/g, playerN);
      if (resolvedId === menuGroup.id) return { key, type: region.type };
    }
    return null;
  }, shallowEqual);

  const windowHeight = window.innerHeight;
  const left = mouseX < (window.innerWidth/2)  ? mouseX + windowHeight * 0.01 : mouseX - windowHeight * 0.36;
  const rawTop = mouseY < (window.innerHeight/2) ? mouseY - windowHeight * 0.1 : mouseY - windowHeight * 0.5;
  const top = Math.min(rawTop, window.innerHeight - (menuHeight || 0) - 8);

  const actionListShuffle = [
    ["SHUFFLE_GROUP", menuGroup.id],
    ["LOG", "$ALIAS_N", " shuffled ", group.label]
  ]

  const topCardId = useSelector(state => {
    const stackId = state?.gameUi?.game?.groupById?.[menuGroup.id]?.stackIds?.[0];
    return stackId ? state?.gameUi?.game?.stackById?.[stackId]?.cardIds?.[0] : null;
  });
  const topCardTitle = useSelector(state => {
    const card = state?.gameUi?.game?.cardById?.[topCardId];
    return card?.sides?.[card?.currentSide]?.name || "";
  });
  const selectTopCard = () => {
    dispatch(setActiveCardId(topCardId));
    dispatch(setDropdownMenu({ type: "card", cardId: topCardId, title: topCardTitle, visible: true }));
  };

  const handleLookAtClick = (dropdownOptions) => {
    browseTopN(menuGroup.id, dropdownOptions.topN);
    dispatch(setDropdownMenu(null));
  }
  

  return (
    <div 
      className="dropdown" 
      style={embedded ? EMBEDDED_MENU_STYLE : { height: menuHeight, zIndex: Z_INDEX.DropdownMenu, top: top, left: left }}>
        <div className="menu-title">{dropdownMenu.title}</div>
        {activeMenu === "main" &&
        <div className="menu">
          {/* Mobile card sheet only: a tap on a pile opens this menu rather
              than the top card's, so offer the card from here. */}
          {embedded && topCardId &&
            <DropdownItem clickCallback={selectTopCard}>Select top card</DropdownItem>
          }
          {gameDef?.groupMenu?.suppress?.includes("Shuffle") ? null :
            <DropdownItem action={actionListShuffle} clickCallback={handleDropdownClick}>{siteL10n("Shuffle")}</DropdownItem>
          }
          {group?.menuOptions?.map((option, _index) => {
            return(
              <DropdownItem action={option.actionList} clickCallback={handleDropdownClick}>{gameL10n(option.label)}</DropdownItem>
            )
          })}
          {gameDef?.groupMenu?.options?.map((option, _index) => {
            return(
              <DropdownItem action={option.actionList} clickCallback={handleDropdownClick}>{gameL10n(option.label)}</DropdownItem>
            )
          })}
          
          {gameDef?.groupMenu?.suppress?.includes("Browse") ? null :
            <DropdownItem topN="None" clickCallback={handleLookAtClick}>{siteL10n("Browse")}</DropdownItem>
          }
          {gameDef?.groupMenu?.suppress?.includes("Look at top") ? null :
            choicesTopN.map((topN, _index) => {
              return(
                <DropdownItem topN={topN} clickCallback={handleLookAtClick}>{siteL10n("Look at top") + " " + topN}</DropdownItem>
              )
            })
          }
          {gameDef?.groupMenu?.suppress?.includes("Look at top X") ? null :
            <DropdownItem topN="X" clickCallback={handleLookAtClick}>{siteL10n("Look at top X")}</DropdownItem>
          }
          {gameDef?.groupMenu?.suppress?.includes("Choose Random") ? null :
            <DropdownItem action={dragnActionLists.chooseRandom(menuGroup.id)} clickCallback={handleDropdownClick}>{siteL10n("Choose Random")}</DropdownItem>
          }
          {regionEntry?.type === "row" && !gameDef?.groupMenu?.suppress?.includes("Convert to Fan") &&
            <DropdownItem
              action={[["SET", `/playerData/$PLAYER_N/layout/regions/${regionEntry.key}/type`, "fan"]]}
              clickCallback={handleDropdownClick}>
              {siteL10n("Convert to Fan")}
            </DropdownItem>
          }
          {regionEntry?.type === "fan" && !gameDef?.groupMenu?.suppress?.includes("Convert to Row") &&
            <DropdownItem
              action={[["SET", `/playerData/$PLAYER_N/layout/regions/${regionEntry.key}/type`, "row"]]}
              clickCallback={handleDropdownClick}>
              {siteL10n("Convert to Row")}
            </DropdownItem>
          }
          {gameDef?.groupMenu?.suppress?.includes("Set Visibility") ? null :
            <DropdownItem
              rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
              goToMenu="setVisibility"
              clickCallback={handleDropdownClick}>
              {siteL10n("setVisibility")}
            </DropdownItem>
          }
          {gameDef?.groupMenu?.suppress?.includes("Move To") ? null :
            <DropdownItem
              rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
              goToMenu="moveTo"
              clickCallback={handleDropdownClick}>
              {siteL10n("moveTo")}
            </DropdownItem>
          }
          {/* <DropdownItem
            rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
            goToMenu="more"
            clickCallback={handleDropdownClick}>
            {l10n("More")}
          </DropdownItem> */}
        </div>}

        {activeMenu === "moveTo" &&
          <div className="menu">
            <GoBack goToMenu="main" clickCallback={handleDropdownClick}/>
            <DropdownItem
              rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
              goToMenu="moveToMy"
              clickCallback={handleDropdownClick}>
              {siteL10n("My Deck")}
            </DropdownItem>
            {gameDef.groupMenu?.moveToGroupIds?.map((moveToGroupId, _moveToGroupIndex) => {
              const resolvedGroupId = moveToGroupId.replace("playerN", playerN);
              return (
                <DropdownItem
                  rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
                  goToMenu={"moveTo"+resolvedGroupId}
                  clickCallback={handleDropdownClick}>
                  {gameL10n(gameDef?.groups?.[resolvedGroupId]?.label)}
                </DropdownItem>
              )
            })}
        </div>
        }
        {activeMenu === "setVisibility" &&
          <div className="menu">
            <GoBack goToMenu="main" clickCallback={handleDropdownClick}/>
            <DropdownItem
              leftIcon={null}
              action={dragnActionLists.toggleGroupVisibility(menuGroup, "None", playerIList)}
              clickCallback={handleDropdownClick}>
              {siteL10n("None")}
            </DropdownItem>
            {playerIList.map((playerI, _index) => {
              return(
                <DropdownItem
                  rightIcon={<FontAwesomeIcon icon={group?.onCardEnter?.peeking?.[playerI] ? faCheck : null}/>}
                  action={dragnActionLists.toggleGroupVisibility(menuGroup, playerI, playerIList)}
                  value={playerI}
                  clickCallback={handleDropdownClick}>
                  {siteL10n(playerI)}
                </DropdownItem>
              )
            })}
            <DropdownItem
              leftIcon={null}
              action={dragnActionLists.toggleGroupVisibility(menuGroup, "All", playerIList)}
              clickCallback={handleDropdownClick}>
              {siteL10n("All")}
            </DropdownItem>
        </div>
        }
        {activeMenu === "moveToMy" &&
        <DropdownMoveTo
          destGroupId={playerN+"Deck"}
          origGroupId={menuGroup.id}
          numStacks={numStacks}
          handleDropdownClick={handleDropdownClick}
          siteL10n={siteL10n}
        />}
        {gameDef?.groupMenu?.moveToGroupIds?.map((moveToGroupId, moveToGroupIndex) => {
          const resolvedGroupId = moveToGroupId.replace("playerN", playerN);
          return (activeMenu === "moveTo" + resolvedGroupId) && <DropdownMoveTo
            key={moveToGroupIndex}
            destGroupId={resolvedGroupId}
            origGroupId={menuGroup.id}
            numStacks={numStacks}
            handleDropdownClick={handleDropdownClick}
            siteL10n={siteL10n}
          />;
        })}
    </div>
  );
})
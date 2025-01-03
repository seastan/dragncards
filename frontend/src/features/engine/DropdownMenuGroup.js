import React from "react";
import { faArrowUp, faArrowDown, faRandom, faChevronRight, faCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DropdownItem, GoBack } from "./DropdownMenuHelpers";
import "../../css/custom-dropdown.css";
import { useDispatch, useSelector } from "react-redux";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlayerIList } from "./hooks/usePlayerIList";
import { useBrowseTopN } from "./hooks/useBrowseTopN";
import { dragnActionLists } from "./functions/dragnActionLists";
import { setDropdownMenu } from "../store/playerUiSlice";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { useGameL10n } from "./hooks/useGameL10n";
import { Z_INDEX } from "./functions/common";

export const DropdownMenuGroup = React.memo(({
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

  console.log("Rendering DMGroup", group)
  const DropdownMoveTo = (props) => {
    return (
      <div className="menu">
        <GoBack goToMenu="moveTo" clickCallback={handleDropdownClick}/>
        <DropdownItem
          leftIcon={<FontAwesomeIcon icon={faArrowUp}/>}
          action={dragnActionLists.moveAllStacksTo(menuGroup.id, props.destGroupId, numStacks, "top")}
          clickCallback={handleDropdownClick}>
          {siteL10n("Top")}
        </DropdownItem>
        <DropdownItem
          leftIcon={<FontAwesomeIcon icon={faRandom}/>}
          action={dragnActionLists.moveAllStacksTo(menuGroup.id, props.destGroupId, numStacks, "shuffle")}
          clickCallback={handleDropdownClick}>
          {siteL10n("Shuffle in")}
        </DropdownItem>
        <DropdownItem
          leftIcon={<FontAwesomeIcon icon={faArrowDown}/>}
          action={dragnActionLists.moveAllStacksTo(menuGroup.id, props.destGroupId, numStacks, "bottom")}
          clickCallback={handleDropdownClick}>
          {siteL10n("Bottom")}
        </DropdownItem>
      </div>
    )
  }

  const windowHeight = window.innerHeight;
  const left = mouseX < (window.innerWidth/2)  ? mouseX + windowHeight * 0.01 : mouseX - windowHeight * 0.36;
  const top = mouseY < (window.innerHeight/2) ? mouseY - windowHeight * 0.1 : mouseY - windowHeight * 0.5;

  const actionListShuffle = [
    ["SHUFFLE_GROUP", menuGroup.id],
    ["LOG", "$ALIAS_N", " shuffled ", group.label]
  ]

  const handleLookAtClick = (dropdownOptions) => {
    browseTopN(menuGroup.id, dropdownOptions.topN);
    dispatch(setDropdownMenu(null));
  }
  

  return (
    <div 
      className="dropdown" 
      style={{ height: menuHeight, zIndex: Z_INDEX.DropdownMenu, top: top, left: left }}>
        <div className="menu-title">{dropdownMenu.title}</div>
        {activeMenu === "main" &&
        <div className="menu">
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
            {gameDef.groupMenu?.moveToGroupIds?.map((moveToGroupId, _moveToGroupIndex) => (
              <DropdownItem
                rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
                goToMenu={"moveTo"+moveToGroupId}
                clickCallback={handleDropdownClick}>
                {gameL10n(gameDef?.groups?.[moveToGroupId]?.label)}
              </DropdownItem>
              ))}
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
        <DropdownMoveTo destGroupId={playerN+"Deck"}/>}
        {gameDef?.groupMenu?.moveToGroupIds?.map((moveToGroupId, _moveToGroupIndex) => (
          (activeMenu === "moveTo" + moveToGroupId) && <DropdownMoveTo destGroupId={moveToGroupId}/>
        ))}
    </div>
  );
})
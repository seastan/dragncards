import React from "react";
import { faArrowUp, faArrowDown, faRandom, faChevronRight, faCheck, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DropdownItem, GoBack } from "./DropdownMenuHelpers";
import "../../css/custom-dropdown.css";
import { useDispatch, useSelector } from "react-redux";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useEvaluateCondition } from "../../hooks/useEvaluateCondition";
import { dragnActionLists } from "./functions/dragnActionLists";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { useGameL10n } from "./hooks/useGameL10n";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { usePlugin } from "./hooks/usePlugin";
import useProfile from "../../hooks/useProfile";
import axios from "axios";
import { deepUpdate } from "../store/updateValues";
import { useVisibleSide } from "./hooks/useVisibleSide";
import { useVisibleFace } from "./hooks/useVisibleFace";
import { setActiveCardId, setDropdownMenu, setShowModal } from "../store/playerUiSlice";
import { usePlayerIList } from "./hooks/usePlayerIList";
import { evaluate } from "./hooks/evaluate";
import store from "../../store";

export const DropdownMenuCard = React.memo(({
  mouseX,
  mouseY,
  menuHeight,
  handleDropdownClick,
  calcHeight,
  activeMenu,
}) => {    
  const dispatch = useDispatch();
  const l10n = useSiteL10n();
  const pluginId = usePlugin().id;
  const siteL10n = useSiteL10n();
  const gameL10n = useGameL10n();
  const user = useProfile();
  const authOptions = useAuthOptions();
  const gameDef = useGameDefinition();
  const gameUi = useSelector(state => state?.gameUi);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const dropdownMenu = useSelector(state => state?.playerUi?.dropdownMenu);
  const menuCardId = dropdownMenu.cardId;
  const menuCard = useSelector(state => state?.gameUi?.game?.cardById?.[menuCardId]);
  const visibleSide = useVisibleSide(menuCardId);
  const visibleFace = useVisibleFace(menuCardId);
  const evaluateCondition = useEvaluateCondition();
  const playerIList = usePlayerIList();

  console.log("Rendering DropdownMenuCard ",playerIList)

  const setAltArt = async () => {
    if (user.supporter_level < 5) {
      dispatch(setShowModal("patreon"))
      dispatch(setDropdownMenu(null));
      dispatch(setActiveCardId(null));
      return;
    }
    var url = prompt(siteL10n("altArtPrompt"));
    if (url && !(url.endsWith(".png") || url.endsWith(".jpg"))) {
      alert(siteL10n("altArtFormatError"))
      return;
    }
    if (url === "") {
      url = null;
    }
    const key = menuCard.databaseId;
    
    var nestedObj;
    if (visibleFace?.imageUrl) {
      nestedObj = {[pluginId]: {altArt: {[key]: {[visibleSide]: url}}}}
    } else {
      nestedObj = {[pluginId]: {altArt: {[visibleFace.name]: url}}}
    }
    
    const res = await axios.post("/be/api/v1/profile/update_plugin_user_settings", nestedObj, authOptions);

    const pluginSettings = user.plugin_settings;
    deepUpdate(pluginSettings, nestedObj);
    const newProfileData = {
      user_profile: {
        ...user,
        plugin_settings: pluginSettings
      }}

    user.setData(newProfileData);
    if (res.status !== 200) {
      alert(siteL10n("altArtSetError")); 
    }
  }
  
  const DropdownMoveTo = (destGroupId, handleDropdownClick) => {
    const label = gameL10n(gameDef?.groups?.[destGroupId]?.label);
    return (
      <div className="menu">
        <GoBack goToMenu="moveTo" clickCallback={handleDropdownClick}/>
        <DropdownItem
          leftIcon={<FontAwesomeIcon icon={faArrowUp}/>}
          action={dragnActionLists.moveCardToTop(menuCardId, destGroupId, label)}
          clickCallback={handleDropdownClick}>
          {l10n("top")}
        </DropdownItem>
        <DropdownItem
          leftIcon={<FontAwesomeIcon icon={faRandom}/>}
          action={dragnActionLists.moveCardToShuffled(menuCardId, destGroupId, label)}
          clickCallback={handleDropdownClick}>
          {l10n("shuffleIn")}
        </DropdownItem>
        <DropdownItem
          leftIcon={<FontAwesomeIcon icon={faRandom}/>}
          action={dragnActionLists.moveCardToTopX(menuCardId, destGroupId, label)}
          clickCallback={handleDropdownClick}>
          {l10n("shuffleIntoTopX")}
        </DropdownItem>
        <DropdownItem
          leftIcon={<FontAwesomeIcon icon={faRandom}/>}
          action={dragnActionLists.moveCardToBottomX(menuCardId, destGroupId, label)}
          clickCallback={handleDropdownClick}>
          {l10n("shuffleIntoBottomX")}
        </DropdownItem>
        <DropdownItem
          leftIcon={<FontAwesomeIcon icon={faArrowDown}/>}
          action={dragnActionLists.moveCardToBottom(menuCardId, destGroupId, label)}
          clickCallback={handleDropdownClick}>
          {l10n("bottom")}
        </DropdownItem>
      </div>
    )
  }

  // Subtract the equivalent of 35vh in pixels from the mouse position to make sure the menu is visible
  const windowHeight = window.innerHeight;
  const left = mouseX < (window.innerWidth/2)  ? mouseX + windowHeight * 0.01 : mouseX - windowHeight * 0.36;
  const top = mouseY < (window.innerHeight/2) ? mouseY - windowHeight * 0.1 : mouseY - windowHeight * 0.35;

  return (
    <div 
      className="dropdown" 
      style={{ height: menuHeight, zIndex: 1e7, top: top, left: left }}>
        <div className="menu-title">{dropdownMenu.title}</div>

        {activeMenu === "main" &&
        <div className="menu">
          {menuCard.cardIndex === 0 || gameDef?.cardMenu?.suppress?.includes("Detach") ? null : 
            <DropdownItem 
              action={dragnActionLists.detach(menuCard)} 
              clickCallback={handleDropdownClick}>
                {l10n("detach")}
            </DropdownItem>
          }
          {menuCard.cardIndex === 0 || gameDef?.cardMenu?.suppress?.includes("Attachment Direction") ? null :
            <DropdownItem
              rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
              goToMenu="attachmentDirection"
              clickCallback={handleDropdownClick}>
              {l10n("attachmentDirection")}
            </DropdownItem>
          }
          {gameDef?.cardMenu?.suppress?.includes("Flip") ? null :
            <DropdownItem 
              action= {dragnActionLists.flipCard(menuCard)} 
              clickCallback={handleDropdownClick}>
                {l10n("flip")}
            </DropdownItem>
          }
          {gameDef?.cardMenu?.suppress?.includes("Delete") ? null :
            <DropdownItem 
              action= {dragnActionLists.deleteCard(menuCard)} 
              clickCallback={handleDropdownClick}>
                {l10n("delete")}
            </DropdownItem>
          }
          {gameDef?.cardMenu?.options?.map((menuItem, _itemIndex) => {
            if (menuItem?.showIf && !evaluate(gameUi, menuCard, menuItem.showIf)) return null;
            return ( 
              <DropdownItem 
                action={menuItem.actionList} 
                clickCallback={handleDropdownClick}>
                  {gameL10n(menuItem.label)}
              </DropdownItem> 
            )
          })}
          {gameDef?.cardMenu?.suppress?.includes("Move To") ? null :
            <DropdownItem
              rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
              goToMenu="moveTo"
              clickCallback={handleDropdownClick}>
              {l10n("moveTo")}
            </DropdownItem>
          }
          {gameDef?.cardMenu?.suppress?.includes("Show To") ? null :
            <DropdownItem
              rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
              goToMenu="showTo"
              clickCallback={handleDropdownClick}>
              {l10n("showTo")}
            </DropdownItem>
          }
          {menuCard?.inPlay !== true || gameDef?.cardMenu?.suppress?.includes("Toggle Trigger") ? null :
            <DropdownItem
              rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
              goToMenu="toggleTrigger"
              clickCallback={handleDropdownClick}>
              {l10n("toggleTriggers")}
            </DropdownItem>
          }
          {menuCard?.inPlay !== true || gameDef?.cardMenu?.suppress?.includes("Set Rotation") ? null :
            <DropdownItem
              rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
              goToMenu="setRotation"
              clickCallback={handleDropdownClick}>
              {l10n("setRotation")}
            </DropdownItem>
          }
          <DropdownItem
            rightIcon={user?.supporter_level < 5 ? <img style={{height: "20px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg"/> : null}
            clickCallback={() => setAltArt()}>
            {l10n("Set Alt Art")}
          </DropdownItem>
        </div>}
        
        {activeMenu === "moveTo" &&
        <div className="menu">
          <GoBack goToMenu="main" clickCallback={handleDropdownClick}/>
          <DropdownItem
            rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
            goToMenu={"moveTo"+menuCard?.deckGroupId}
            clickCallback={handleDropdownClick}>
            {l10n("deckOfOrigin")}
          </DropdownItem>
          {gameDef?.cardMenu?.moveToGroupIds?.map((groupId, index) => {
            return (
              <DropdownItem
                key={index}
                rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
                goToMenu={"moveTo"+groupId}
                clickCallback={handleDropdownClick}>
                {gameL10n(gameDef?.groups?.[groupId]?.label)}
              </DropdownItem>
            )
          })}
        </div>}
        
        {activeMenu === "showTo" &&
        <div className="menu">
          <GoBack goToMenu="main" clickCallback={handleDropdownClick}/>
          <DropdownItem
            action={dragnActionLists.togglePeeking(menuCard, "None", playerIList)}
            clickCallback={handleDropdownClick}>
            {l10n("None")}
          </DropdownItem>
          {playerIList?.map((playerI, index) => {
            return (
              <DropdownItem
                key={index}
                rightIcon={menuCard?.peeking?.[playerI] ? <FontAwesomeIcon icon={faCheck}/> : null}
                action={dragnActionLists.togglePeeking(menuCard, playerI, playerIList)}
                clickCallback={handleDropdownClick}>
                {playerI}
              </DropdownItem>
            )
          })}
          <DropdownItem
            action={dragnActionLists.togglePeeking(menuCard, "All", playerIList)}
            clickCallback={handleDropdownClick}>
            {l10n("All")}
          </DropdownItem>
        </div>}

        {activeMenu === "moveTo"+menuCard?.deckGroupId ?
          DropdownMoveTo(menuCard?.deckGroupId,handleDropdownClick)
        :
        gameDef?.cardMenu?.moveToGroupIds?.map((groupId, _index) => {
          if (activeMenu === "moveTo"+groupId) return(
            DropdownMoveTo(groupId,handleDropdownClick)
          )
        })}

        {activeMenu === "toggleTrigger" &&
        <div className="menu">
          <GoBack goToMenu="main" clickCallback={handleDropdownClick}/>
          {gameDef?.phaseOrder?.map((phaseId, _phaseIndex) => (
            <DropdownItem
              rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
              goToMenu={phaseId+"ToggleTrigger"}
              clickCallback={handleDropdownClick}>
              {gameL10n(gameDef?.phases?.[phaseId].label)}
            </DropdownItem>
          ))}
        </div>}

      {gameDef?.phaseOrder?.map((phaseId, _phaseIndex) => {
        const visible = activeMenu === phaseId+"ToggleTrigger"
        if (visible) return(
          <div className="menu">
            <GoBack goToMenu="toggleTrigger" clickCallback={handleDropdownClick}/>
            {gameDef?.stepOrder?.map((stepId, _stepIndex) => {
              const stepInfo = gameDef?.steps?.[stepId];
              if (stepInfo.phaseId === phaseId) return(
                <DropdownItem
                  rightIcon={visibleFace?.triggers?.[stepId] ? <FontAwesomeIcon icon={faCheck}/> : null}
                  action={dragnActionLists.toggleTrigger(stepId)}
                  clickCallback={handleDropdownClick}>
                  <div className="text-xs">{gameL10n(stepInfo.label)}</div>
                </DropdownItem>
              )})}
          </div>)
      })}


      {activeMenu === "setRotation" &&
        <div className="menu">
          <GoBack goToMenu="main" clickCallback={handleDropdownClick}/>
          {[0, 90, 180, 270].map((rot, _rotIndex) => (
            <DropdownItem
              rightIcon={menuCard.rotation===rot ? <FontAwesomeIcon icon={faCheck}/> : null}
              action={dragnActionLists.setRotation(rot)} // TODO: put actionId here that links to common actionid file
              clickCallback={handleDropdownClick}>
              {rot}
            </DropdownItem>
          ))}
        </div>}

      {activeMenu === "attachmentDirection" &&
        <div className="menu">
          <GoBack goToMenu="main" clickCallback={handleDropdownClick}/>
          {["right", "left", "top", "bottom", "behind"].map((dir, _rotIndex) => (
            <DropdownItem
              rightIcon={menuCard.rotation===dir ? <FontAwesomeIcon icon={faCheck}/> : null}
              action={dragnActionLists.setAttachmentDirection(dir)} // TODO: put actionId here that links to common actionid file
              clickCallback={handleDropdownClick}>
              {siteL10n(dir)}
            </DropdownItem>
          ))}
        </div>}

    </div>
  );
})
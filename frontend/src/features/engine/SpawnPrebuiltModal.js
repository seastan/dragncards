import React, {useState} from "react";
import { useDispatch } from 'react-redux';
import ReactModal from "react-modal";
import { faChevronRight, faPlus, faHeart, faLink } from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartOutline } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DropdownItem, GoBack } from "./DropdownMenuHelpers";
import { setShowModal, setTyping } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { useLoadPrebuiltDeck } from "./hooks/useLoadPrebuiltDeck";
import { useImportViaUrl } from "./hooks/useImportViaUrl";
import { Z_INDEX } from "./functions/common";
import { usePlugin } from "./hooks/usePlugin";
import useProfile from "../../hooks/useProfile";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import Axios from "axios";


const isStringInDeckName = (str, deckName) => {
  const lowerCaseString = str.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const lowerCaseDeckName = deckName.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return lowerCaseDeckName.includes(lowerCaseString);
}

export const SpawnPrebuiltModal = React.memo(({}) => {
    const dispatch = useDispatch();
    const siteL10n = useSiteL10n();

    return(
      <ReactModal
        closeTimeoutMS={200}
        isOpen={true}
        onRequestClose={() => {
          dispatch(setShowModal(null));
          dispatch(setTyping(false));
        }}
        contentLabel={"Load quest"}
        overlayClassName="fixed inset-0 bg-black-50"
        className="insert-auto p-5 bg-gray-700 border max-h-lg mx-auto my-2 rounded-lg outline-none"
        style={{
          overlay: {
            zIndex: Z_INDEX.Modal
          },
          content: {
            width: "40vw",
            maxWidth: "1200px",
            maxHeight: "95dvh",
            overflowY: "scroll",
          }
        }}>
        <h1 className="mb-2">{siteL10n("Load prebuilt deck")}</h1>
        <ModalContent/>
      </ReactModal>
    )
})

const ModalContent = () => {
  const gameDef = useGameDefinition();
  const siteL10n = useSiteL10n();
  const plugin = usePlugin();
  const user = useProfile();
  const authOptions = useAuthOptions();
  const [searchString, setSearchString] = useState("");
  const [filteredIds, setFilteredIds] = useState([]);

  const pluginId = plugin?.id;
  const [favorites, setFavorites] = useState(
    () => user?.plugin_settings?.[pluginId]?.favorites || {}
  );
  const [favoriteUrls, setFavoriteUrls] = useState(
    () => user?.plugin_settings?.[pluginId]?.favoriteUrls || {}
  );

  const savePluginSettings = async (settingsUpdate) => {
    const newDatabasePluginSettings = {
      [pluginId]: settingsUpdate
    };
    await Axios.post("/be/api/v1/profile/update_plugin_user_settings", newDatabasePluginSettings, authOptions);

    // Manually merge into the in-memory profile instead of using deepUpdate,
    // which deletes keys not present in the update object (e.g. saving
    // favorites would delete favoriteUrls and vice versa).
    const pluginSettings = user.plugin_settings || {};
    pluginSettings[pluginId] = {
      ...pluginSettings[pluginId],
      ...settingsUpdate,
    };
    user.setData({
      user_profile: {
        ...user,
        plugin_settings: pluginSettings
      }
    });
  };

  const toggleFavorite = async (deckListId) => {
    const newFavorites = {...favorites};
    if (newFavorites[deckListId]) {
      delete newFavorites[deckListId];
    } else {
      newFavorites[deckListId] = true;
    }
    setFavorites(newFavorites);
    await savePluginSettings({ favorites: newFavorites });
  };

  const addFavoriteUrl = async (name, url) => {
    const id = Date.now().toString();
    const newFavoriteUrls = {...favoriteUrls, [id]: {name, url}};
    setFavoriteUrls(newFavoriteUrls);
    await savePluginSettings({ favoriteUrls: newFavoriteUrls });
  };

  const removeFavoriteUrl = async (id) => {
    const newFavoriteUrls = {...favoriteUrls};
    delete newFavoriteUrls[id];
    setFavoriteUrls(newFavoriteUrls);
    await savePluginSettings({ favoriteUrls: newFavoriteUrls });
  };

  const canFavorite = (user?.supporter_level >= 3) || (user?.admin === true);

  if (!gameDef?.preBuiltDecks) return <div className="text-white">{siteL10n("noDefinedPreBuiltDecks")}</div>;
  else return(
    <>
      <InputBox
        setFilteredIds={setFilteredIds}
        searchString={searchString}
        setSearchString={setSearchString}
      />
      {searchString
        ? <Table filteredIds={filteredIds} favorites={favorites} toggleFavorite={toggleFavorite} canFavorite={canFavorite}/>
        : <Menu
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            canFavorite={canFavorite}
            favoriteUrls={favoriteUrls}
            addFavoriteUrl={addFavoriteUrl}
            removeFavoriteUrl={removeFavoriteUrl}
          />
      }
    </>
  );
}

const InputBox = ({
  setFilteredIds,
  searchString,
  setSearchString,
}) => {
  const gameDef = useGameDefinition();
  const gameL10n = useGameL10n();
  const dispatch = useDispatch();

  const handleSpawnTyping = (event) => {
    const newSearchString = event.target.value;
    setSearchString(newSearchString);
    const filtered = [];
    for (var deckId of Object.keys(gameDef.preBuiltDecks).sort().reverse()) {
      const deck = gameDef.preBuiltDecks[deckId];
      if (deck.hideFromSearch) continue;
      if (isStringInDeckName(newSearchString, gameL10n(deck.label))) filtered.push(deckId);
      setFilteredIds(filtered);
    }
  }

  return(
    <input
      autoFocus
      style={{width:"50%"}}
      type="text"
      id="deckSearch"
      name="deckSearch"
      className="mb-2 rounded-md"
      placeholder=" Deck name..."
      value={searchString}
      onChange={(event) => handleSpawnTyping(event)}
      onFocus={() => dispatch(setTyping(true))}
      onBlur={() => dispatch(setTyping(false))}/>
  );
}

const DeckRow = ({deckListId, label, favorites, toggleFavorite, onLoad, canFavorite}) => {
  const dispatch = useDispatch();
  const isFavorite = canFavorite && !!favorites[deckListId];

  const handleHeartClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (canFavorite) {
      toggleFavorite(deckListId);
    } else {
      dispatch(setShowModal("patreon"));
    }
  };

  const handlePlusClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onLoad(deckListId);
  };

  const handleRowClick = (event) => {
    event.preventDefault();
    onLoad(deckListId);
  };

  return (
    <a href="#" className="menu-item" onClick={handleRowClick}>
      {label}
      <span className="icon-right" style={{display: "flex", alignItems: "center"}}>
        <span className="icon-button hover:bg-red-700" onClick={handleHeartClick}>
          <FontAwesomeIcon icon={isFavorite ? faHeart : faHeartOutline} style={isFavorite ? {color: "#e53e3e"} : {}}/>
        </span>
        <span className="icon-button hover:bg-red-700" onClick={handlePlusClick}>
          <FontAwesomeIcon icon={faPlus}/>
        </span>
      </span>
    </a>
  );
};

const Table = ({filteredIds, favorites, toggleFavorite, canFavorite}) => {
  const gameDef = useGameDefinition();
  const gameL10n = useGameL10n();
  const loadDeck = useLoadPrebuiltDeck();
  const dispatch = useDispatch();

  const handleSpawnClick = (id) => {
    loadDeck(id);
    dispatch(setShowModal(null))
  }

  const handleHeartClick = (event, deckId) => {
    event.stopPropagation();
    if (canFavorite) {
      toggleFavorite(deckId);
    } else {
      dispatch(setShowModal("patreon"));
    }
  };

  if (filteredIds.length === 0) return <div className="text-white">{gameL10n("No results")}</div>
  else if (filteredIds.length>25) return <div className="text-white">{gameL10n("Too many results")}</div>
  else return (
    <table className="table-fixed rounded-lg w-full">
      <thead>
        <tr className="text-white bg-gray-800">
          <th className="w-1/2">{gameL10n("Name")}</th>
          <th style={{width: "3.5dvh"}}></th>
        </tr>
      </thead>
      <tbody>
        {filteredIds.map((filteredId) => {
          const deck = gameDef.preBuiltDecks?.[filteredId]
          const deckName = deck?.label;
          const isFavorite = canFavorite && !!favorites[filteredId];
          return(
            <tr key={filteredId} className="bg-gray-600 text-white cursor-pointer hover:bg-gray-500 hover:text-black" onClick={() => handleSpawnClick(filteredId)}>
              <td className="p-1">{gameL10n(deckName)}</td>
              <td className="p-1 text-center" onClick={(e) => handleHeartClick(e, filteredId)} style={{cursor: "pointer"}}>
                <FontAwesomeIcon icon={isFavorite ? faHeart : faHeartOutline} style={isFavorite ? {color: "#e53e3e"} : {}}/>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const Menu = ({favorites, toggleFavorite, canFavorite, favoriteUrls, addFavoriteUrl, removeFavoriteUrl}) => {
  const loadPrebuiltDeck = useLoadPrebuiltDeck();
  const importViaUrl = useImportViaUrl();
  const gameL10n = useGameL10n();
  const gameDef = useGameDefinition();
  const dispatch = useDispatch();
  const [activeMenu, setActiveMenu] = useState({"name": "Load a deck", ...gameDef.deckMenu});
  const [urlName, setUrlName] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [showUrlForm, setShowUrlForm] = useState(false);

  const handleSubMenuClick = (props) => {
    const newMenu = {
      ...props.goToMenu,
      goBackMenu: activeMenu,
    }
    setActiveMenu(newMenu);
  }
  const handleGoBackClick = () => {
    setActiveMenu(activeMenu.goBackMenu);
  }
  const handleLoadDeck = (deckListId) => {
    loadPrebuiltDeck(deckListId);
    dispatch(setShowModal(null))
  }
  const handleLoadUrl = (url) => {
    importViaUrl(url);
    dispatch(setShowModal(null))
  }
  const handleLoadUrlNoClose = (url) => {
    importViaUrl(url);
  }
  const handleSaveUrl = (e) => {
    e.preventDefault();
    if (!urlName.trim() || !urlValue.trim()) return;
    addFavoriteUrl(urlName.trim(), urlValue.trim());
    setUrlName("");
    setUrlValue("");
    setShowUrlForm(false);
  }

  // Compute favorited deck IDs that exist in preBuiltDecks
  const favoritedDeckIds = Object.keys(favorites).filter(
    id => favorites[id] && gameDef.preBuiltDecks?.[id]
  );
  const favoriteUrlIds = Object.keys(favoriteUrls);

  const isRootMenu = !activeMenu.goBackMenu;

  return(<div
    className="modalmenu bg-gray-800">
    <div className="menu">
      {activeMenu.goBackMenu ?
        <GoBack clickCallback={handleGoBackClick}/>
        : null
      }
      {/* Favorites section at root menu */}
      {isRootMenu && canFavorite && (
        <>
          <div className="menu-title" style={{fontSize: "1.8dvh", color: "#aaa", textAlign: "left", paddingLeft: "1dvh", height: "auto", marginTop: "0.5dvh"}}>
            Favorites
          </div>
          {favoritedDeckIds.map((deckId) => {
            const deck = gameDef.preBuiltDecks[deckId];
            return (
              <DeckRow
                key={deckId}
                deckListId={deckId}
                label={gameL10n(deck.label)}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                onLoad={handleLoadDeck}
                canFavorite={canFavorite}
              />
            );
          })}
          {favoriteUrlIds.map((urlId) => {
            const entry = favoriteUrls[urlId];
            return (
              <FavoriteUrlRow
                key={urlId}
                urlId={urlId}
                name={entry.name}
                url={entry.url}
                onRemove={removeFavoriteUrl}
                onLoad={handleLoadUrl}
                onLoadNoClose={handleLoadUrlNoClose}
              />
            );
          })}
          {showUrlForm ? (
            <form onSubmit={handleSaveUrl} style={{display: "flex", gap: "0.5dvh", padding: "0.5dvh 1dvh", alignItems: "center"}}>
              <input
                autoFocus
                type="text"
                placeholder="Name"
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                onFocus={() => dispatch(setTyping(true))}
                onBlur={() => dispatch(setTyping(false))}
                className="rounded-md"
                style={{flex: "1", fontSize: "1.6dvh", padding: "0.4dvh 0.6dvh"}}
              />
              <input
                type="text"
                placeholder="URL"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onFocus={() => dispatch(setTyping(true))}
                onBlur={() => dispatch(setTyping(false))}
                className="rounded-md"
                style={{flex: "2", fontSize: "1.6dvh", padding: "0.4dvh 0.6dvh"}}
              />
              <button
                type="submit"
                className="rounded-md"
                style={{
                  fontSize: "1.6dvh",
                  padding: "0.4dvh 1dvh",
                  backgroundColor: "#484a4d",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <FontAwesomeIcon icon={faPlus}/>
              </button>
            </form>
          ) : (
            <div style={{padding: "0.5dvh 1dvh", fontSize: "1.5dvh", color: "#888"}}>
              {"Click the "}
              <FontAwesomeIcon icon={faHeartOutline} style={{margin: "0 0.3dvh"}}/>
              {" next to a deck to add it as a favorite, or "}
              <span
                onClick={() => setShowUrlForm(true)}
                style={{
                  color: "#aac8e4",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Add a favorite URL
              </span>
            </div>
          )}
          <div style={{borderBottom: "1px solid #474a4d", margin: "0.5dvh 0"}}/>
        </>
      )}
      {/* Supporter promo at root menu for non-supporters */}
      {isRootMenu && !canFavorite && (
        <>
          <a
            href="#"
            className="menu-item"
            onClick={(e) => { e.preventDefault(); dispatch(setShowModal("patreon")); }}
            style={{fontSize: "1.6dvh", color: "#aaa", justifyContent: "center", gap: "0.5dvh"}}
          >
            <FontAwesomeIcon icon={faHeartOutline} style={{marginRight: "0.5dvh"}}/>
            {"Support to add favorite decks and URLs"}
            <img className="ml-2" style={{height: "20px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg" alt="Patreon logo"/>
          </a>
          <div style={{borderBottom: "1px solid #474a4d", margin: "0.5dvh 0"}}/>
        </>
      )}
      {activeMenu.subMenus?.map((subMenuOption, index) => {
        return(
          <DropdownItem
            key={index}
            rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
            goToMenu={subMenuOption}
            clickCallback={handleSubMenuClick}>
            {gameL10n(subMenuOption.label)}
          </DropdownItem>
        )
      })}
      {activeMenu.deckLists?.map((deckListOption, index) => {
        return(
          <DeckRow
            key={deckListOption.deckListId || index}
            deckListId={deckListOption.deckListId}
            label={gameL10n(deckListOption.label)}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onLoad={handleLoadDeck}
            canFavorite={canFavorite}
          />
        )
      })}
    </div>
  </div>
  );
}

const FavoriteUrlRow = ({urlId, name, url, onRemove, onLoad, onLoadNoClose}) => {
  const handleHeartClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onRemove(urlId);
  };

  const handlePlusClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onLoadNoClose(url);
  };

  const handleRowClick = (event) => {
    event.preventDefault();
    onLoad(url);
  };

  return (
    <a href="#" className="menu-item" onClick={handleRowClick}>
      <span className="icon-button" style={{marginRight: "0.5rem"}}>
        <FontAwesomeIcon icon={faLink}/>
      </span>
      {name}
      <span className="icon-right" style={{display: "flex", alignItems: "center"}}>
        <span className="icon-button hover:bg-red-700" onClick={handleHeartClick}>
          <FontAwesomeIcon icon={faHeart} style={{color: "#e53e3e"}}/>
        </span>
        <span className="icon-button hover:bg-red-700" onClick={handlePlusClick}>
          <FontAwesomeIcon icon={faPlus}/>
        </span>
      </span>
    </a>
  );
}

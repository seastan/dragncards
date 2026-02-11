import React, {useState} from "react";
import { useDispatch } from 'react-redux';
import ReactModal from "react-modal";
import { faChevronRight, faPlus, faHeart, faLink, faSearch } from "@fortawesome/free-solid-svg-icons";
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
        contentLabel={"Load prebuilt deck"}
        overlayClassName="fixed inset-0 bg-black-50"
        className="insert-auto bg-gray-800 border border-gray-600 max-h-lg mx-auto mt-12 rounded-lg outline-none"
        style={{
          overlay: {
            zIndex: Z_INDEX.Modal
          },
          content: {
            width: "38vw",
            minWidth: "360px",
            maxWidth: "700px",
            maxHeight: "90dvh",
            overflowY: "auto",
          }
        }}>
        <div style={{padding: "20px 24px 8px 24px", borderBottom: "1px solid #374151"}}>
          <h1 style={{margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "white", letterSpacing: "-0.01em"}}>
            {siteL10n("Load prebuilt deck")}
          </h1>
          <p style={{margin: "4px 0 0 0", fontSize: "0.8rem", color: "#9ca3af"}}>
            Browse categories or search by name
          </p>
        </div>
        <div style={{padding: "12px 24px 20px 24px"}}>
          <ModalContent/>
        </div>
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
          border: "1px solid #374151",
          color: "white",
          borderRadius: "6px",
          outline: "none",
          boxSizing: "border-box",
        }}
        type="text"
        id="deckSearch"
        name="deckSearch"
        placeholder="Search decks..."
        value={searchString}
        onChange={(event) => handleSpawnTyping(event)}
        onFocus={(e) => { dispatch(setTyping(true)); e.target.style.borderColor = "#6b7280"; }}
        onBlur={(e) => { dispatch(setTyping(false)); e.target.style.borderColor = "#374151"; }}
      />
    </div>
  );
}

const DeckRow = ({deckListId, label, favorites, toggleFavorite, onLoad, onLoadNoClose, canFavorite}) => {
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
    onLoadNoClose(deckListId);
  };

  const handleRowClick = (event) => {
    event.preventDefault();
    onLoad(deckListId);
  };

  return (
    <a
      href="#"
      className="menu-item"
      onClick={handleRowClick}
      style={{borderRadius: "6px", padding: "6px 10px", margin: "1px 0", fontSize: "0.95rem"}}
    >
      <span style={{flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{label}</span>
      <span style={{display: "flex", alignItems: "center", gap: "2px", marginLeft: "8px", flexShrink: 0}}>
        <span
          onClick={handleHeartClick}
          style={{
            width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "4px", cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#374151"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <FontAwesomeIcon icon={isFavorite ? faHeart : faHeartOutline} style={{fontSize: "0.85rem", color: isFavorite ? "#ef4444" : "#6b7280"}}/>
        </span>
        <span
          onClick={handlePlusClick}
          style={{
            width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "4px", cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#374151"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <FontAwesomeIcon icon={faPlus} style={{fontSize: "0.85rem", color: "#6b7280"}}/>
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

  const handlePlusClick = (event, id) => {
    event.stopPropagation();
    loadDeck(id);
  };

  const handleHeartClick = (event, deckId) => {
    event.stopPropagation();
    if (canFavorite) {
      toggleFavorite(deckId);
    } else {
      dispatch(setShowModal("patreon"));
    }
  };

  if (filteredIds.length === 0) return <div style={{color: "#9ca3af", fontSize: "0.95rem", padding: "12px 0", textAlign: "center"}}>{gameL10n("No results")}</div>
  else if (filteredIds.length > 25) return <div style={{color: "#9ca3af", fontSize: "0.95rem", padding: "12px 0", textAlign: "center"}}>{gameL10n("Too many results")}</div>
  else return (
    <div style={{borderRadius: "6px", overflow: "hidden", border: "1px solid #374151"}}>
      <table style={{width: "100%", borderCollapse: "collapse", fontSize: "0.95rem"}}>
        <thead>
          <tr style={{backgroundColor: "#1f2937"}}>
            <th style={{padding: "8px 12px", textAlign: "left", color: "#9ca3af", fontWeight: 500, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em"}}>{gameL10n("Name")}</th>
            <th style={{width: "36px"}}></th>
            <th style={{width: "36px"}}></th>
          </tr>
        </thead>
        <tbody>
          {filteredIds.map((filteredId, index) => {
            const deck = gameDef.preBuiltDecks?.[filteredId]
            const deckName = deck?.label;
            const isFavorite = canFavorite && !!favorites[filteredId];
            const bgColor = index % 2 === 0 ? "#374151" : "#1f2937";
            return(
              <tr
                key={filteredId}
                style={{backgroundColor: bgColor, cursor: "pointer", transition: "background 0.15s"}}
                onClick={() => handleSpawnClick(filteredId)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#4b5563"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = bgColor}
              >
                <td style={{padding: "8px 12px", color: "white"}}>{gameL10n(deckName)}</td>
                <td style={{padding: "8px 4px", textAlign: "center"}}>
                  <span
                    onClick={(e) => handleHeartClick(e, filteredId)}
                    style={{
                      width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "4px", cursor: "pointer", transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#374151"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <FontAwesomeIcon icon={isFavorite ? faHeart : faHeartOutline} style={{fontSize: "0.85rem", color: isFavorite ? "#ef4444" : "#6b7280"}}/>
                  </span>
                </td>
                <td style={{padding: "8px 4px", textAlign: "center"}}>
                  <span
                    onClick={(e) => handlePlusClick(e, filteredId)}
                    style={{
                      width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "4px", cursor: "pointer", transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#374151"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <FontAwesomeIcon icon={faPlus} style={{fontSize: "0.85rem", color: "#6b7280"}}/>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const SectionLabel = ({children}) => (
  <div style={{
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "8px 10px 4px 10px",
  }}>
    {children}
  </div>
);

const Divider = () => (
  <div style={{height: "1px", backgroundColor: "#374151", margin: "6px 0"}}/>
);

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
  const handleLoadDeckNoClose = (deckListId) => {
    loadPrebuiltDeck(deckListId);
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

  return(
    <div style={{borderRadius: "6px", overflow: "hidden", border: "1px solid #374151", backgroundColor: "#1f2937"}}>
      <div className="menu">
        {activeMenu.goBackMenu ?
          <GoBack clickCallback={handleGoBackClick}/>
          : null
        }
        {/* Favorites section at root menu */}
        {isRootMenu && canFavorite && (
          <>
            <SectionLabel>Favorites</SectionLabel>
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
                  onLoadNoClose={handleLoadDeckNoClose}
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
              <form onSubmit={handleSaveUrl} style={{display: "flex", gap: "6px", padding: "6px 10px", alignItems: "center"}}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Name"
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                  onFocus={() => dispatch(setTyping(true))}
                  onBlur={() => dispatch(setTyping(false))}
                  style={{
                    flex: "1", fontSize: "0.875rem", padding: "5px 8px",
                    backgroundColor: "#111827", border: "1px solid #374151",
                    borderRadius: "4px", color: "white", outline: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  onFocus={() => dispatch(setTyping(true))}
                  onBlur={() => dispatch(setTyping(false))}
                  style={{
                    flex: "2", fontSize: "0.875rem", padding: "5px 8px",
                    backgroundColor: "#111827", border: "1px solid #374151",
                    borderRadius: "4px", color: "white", outline: "none",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    fontSize: "0.875rem", padding: "5px 10px",
                    backgroundColor: "#374151", color: "#d1d5db",
                    border: "1px solid #4b5563", borderRadius: "4px",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#4b5563"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "#374151"}
                >
                  <FontAwesomeIcon icon={faPlus}/>
                </button>
              </form>
            ) : (
              <div style={{padding: "6px 10px", fontSize: "0.85rem", color: "#6b7280"}}>
                {favoritedDeckIds.length === 0 && favoriteUrlIds.length === 0 ? (
                  <>
                    {"Click the "}
                    <FontAwesomeIcon icon={faHeartOutline} style={{margin: "0 2px", fontSize: "0.8rem"}}/>
                    {" next to a deck to add it as a favorite, or "}
                  </>
                ) : null}
                <span
                  onClick={() => setShowUrlForm(true)}
                  style={{color: "#60a5fa", cursor: "pointer", textDecoration: "none", fontWeight: 500}}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                >
                  Add a favorite URL
                </span>
              </div>
            )}
            <Divider/>
          </>
        )}
        {/* Supporter promo at root menu for non-supporters */}
        {isRootMenu && !canFavorite && (
          <>
            <a
              href="#"
              className="menu-item"
              onClick={(e) => { e.preventDefault(); dispatch(setShowModal("patreon")); }}
              style={{fontSize: "0.9rem", color: "#6b7280", justifyContent: "center", gap: "6px", padding: "8px 10px", borderRadius: "6px"}}
            >
              <FontAwesomeIcon icon={faHeartOutline} style={{fontSize: "0.85rem"}}/>
              {"Support to add favorite decks and URLs"}
              <img style={{height: "14px", opacity: 0.6, marginLeft: "4px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg" alt="Patreon logo"/>
            </a>
            <Divider/>
          </>
        )}
        {/* Category label for submenus */}
        {isRootMenu && activeMenu.subMenus?.length > 0 && (
          <SectionLabel>Categories</SectionLabel>
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
        {activeMenu.deckLists?.length > 0 && !isRootMenu && activeMenu.subMenus?.length > 0 && (
          <Divider/>
        )}
        {activeMenu.deckLists?.map((deckListOption, index) => {
          return(
            <DeckRow
              key={deckListOption.deckListId || index}
              deckListId={deckListOption.deckListId}
              label={gameL10n(deckListOption.label)}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onLoad={handleLoadDeck}
              onLoadNoClose={handleLoadDeckNoClose}
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
    <a
      href="#"
      className="menu-item"
      onClick={handleRowClick}
      style={{borderRadius: "6px", padding: "6px 10px", margin: "1px 0", fontSize: "0.95rem"}}
    >
      <FontAwesomeIcon icon={faLink} style={{fontSize: "0.8rem", color: "#6b7280", marginRight: "8px", flexShrink: 0}}/>
      <span style={{flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{name}</span>
      <span style={{display: "flex", alignItems: "center", gap: "2px", marginLeft: "8px", flexShrink: 0}}>
        <span
          onClick={handleHeartClick}
          style={{
            width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "4px", cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#374151"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <FontAwesomeIcon icon={faHeart} style={{fontSize: "0.85rem", color: "#ef4444"}}/>
        </span>
        <span
          onClick={handlePlusClick}
          style={{
            width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "4px", cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#374151"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <FontAwesomeIcon icon={faPlus} style={{fontSize: "0.85rem", color: "#6b7280"}}/>
        </span>
      </span>
    </a>
  );
}

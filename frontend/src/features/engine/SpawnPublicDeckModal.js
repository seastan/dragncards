import React, {useEffect, useState} from "react";
import { useDispatch } from 'react-redux';
import ReactModal from "react-modal";
import { faChevronRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DropdownItem, GoBack } from "./DropdownMenuHelpers";
import { setShowModal, setTyping } from "../store/playerUiSlice";
import { usePlugin } from "./hooks/usePlugin";
import { RotatingLines } from "react-loader-spinner";
import Axios from "axios";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { useImportLoadList } from "./hooks/useImportLoadList";
import { Z_INDEX } from "./functions/common";

const isStringMatch = (searchStr, target) => {
  if (!target) return false;
  return target.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .includes(searchStr.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""));
};

export const SpawnPublicDeckModal = React.memo(({}) => {
    const dispatch = useDispatch();

    dispatch(setTyping(true));

    return(
      <ReactModal
        closeTimeoutMS={200}
        isOpen={true}
        onRequestClose={() => {
          dispatch(setShowModal(null));
          dispatch(setTyping(false));
        }}
        contentLabel={"Load public deck"}
        overlayClassName="fixed inset-0 bg-black-50"
        className="insert-auto bg-gray-800 border border-gray-600 max-h-lg mx-auto mt-12 rounded-lg outline-none"
        style={{
          overlay: {
            zIndex: Z_INDEX.Modal
          },
          content: {
            width: "40vw",
            maxWidth: "1200px",
            maxHeight: "95dvh",
            overflowY: "auto",
          }
        }}>
        <div style={{padding: "20px 24px 8px 24px", borderBottom: "1px solid #374151"}}>
          <h1 style={{margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "white", letterSpacing: "-0.01em"}}>
            Load Public Custom Deck
          </h1>
          <p style={{margin: "4px 0 0 0", fontSize: "0.8rem", color: "#9ca3af"}}>
            Browse by author or search by name
          </p>
        </div>
        <div style={{padding: "12px 24px 20px 24px"}}>
          <ModalContent/>
        </div>
      </ReactModal>
    )
})

const ModalContent = () => {
  const plugin = usePlugin();
  const authOptions = useAuthOptions();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");

  useEffect(() => {
    const fetchDecks = async () => {
      const res = await Axios.get(`/be/api/v1/public_decks/${plugin.id}`, authOptions);
      if (res?.data?.public_decks) {
        setDecks(Object.values(res.data.public_decks));
      }
      setLoading(false);
    }
    if (plugin?.id) fetchDecks();
  }, [plugin?.id]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{width:"30px", height:"30px"}}>
        <RotatingLines height={100} width={100} strokeColor="white"/>
      </div>
    );
  }

  const hasFilter = nameFilter || authorFilter;

  return (
    <>
      <SearchBoxes
        nameFilter={nameFilter}
        setNameFilter={setNameFilter}
        authorFilter={authorFilter}
        setAuthorFilter={setAuthorFilter}
      />
      {hasFilter
        ? <FilteredList decks={decks} nameFilter={nameFilter} authorFilter={authorFilter}/>
        : <AuthorMenu decks={decks}/>
      }
    </>
  );
};

const SearchBoxes = ({ nameFilter, setNameFilter, authorFilter, setAuthorFilter }) => {
  const dispatch = useDispatch();
  return (
    <div className="flex gap-2 mb-2">
      <input
        style={{width:"50%"}}
        type="text"
        className="rounded-md p-1"
        placeholder=" Deck name..."
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
        onFocus={() => dispatch(setTyping(true))}
        onBlur={() => dispatch(setTyping(false))}
      />
      <input
        style={{width:"50%"}}
        type="text"
        className="rounded-md p-1"
        placeholder=" Author..."
        value={authorFilter}
        onChange={(e) => setAuthorFilter(e.target.value)}
        onFocus={() => dispatch(setTyping(true))}
        onBlur={() => dispatch(setTyping(false))}
      />
    </div>
  );
};

const FilteredList = ({ decks, nameFilter, authorFilter }) => {
  const importLoadList = useImportLoadList();
  const dispatch = useDispatch();

  const filtered = decks.filter(deck => {
    if (nameFilter && !isStringMatch(nameFilter, deck.name)) return false;
    if (authorFilter && !isStringMatch(authorFilter, deck.author_alias)) return false;
    return true;
  }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const handleDeckClick = (deck) => {
    importLoadList(deck.load_list);
    dispatch(setShowModal(null));
  };

  if (filtered.length === 0) return <div className="text-white">No results</div>;

  return (
    <table className="table-fixed rounded-lg w-full">
      <thead>
        <tr className="text-white bg-gray-800">
          <th className="w-1/2 p-2 text-left">Name</th>
          <th className="w-1/2 p-2 text-left">Author</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((deck) => (
          <tr
            key={deck.id}
            className="bg-gray-600 text-white cursor-pointer hover:bg-gray-500 hover:text-black"
            onClick={() => handleDeckClick(deck)}
          >
            <td className="p-1">{deck.name}</td>
            <td className="p-1">{deck.author_alias}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const AuthorMenu = ({ decks }) => {
  const [selectedAuthor, setSelectedAuthor] = useState(null);

  // Group decks by author
  const authorMap = {};
  decks.forEach(deck => {
    const author = deck.author_alias || "Unknown";
    if (!authorMap[author]) {
      authorMap[author] = {
        alias: author,
        supporterLevel: deck.author_supporter_level || 0,
        decks: [],
      };
    }
    authorMap[author].decks.push(deck);
  });

  // Split into supporters and regular, sorted alphabetically
  const supporters = Object.values(authorMap)
    .filter(a => a.supporterLevel > 0)
    .sort((a, b) => a.alias.localeCompare(b.alias));
  const regular = Object.values(authorMap)
    .filter(a => a.supporterLevel <= 0)
    .sort((a, b) => a.alias.localeCompare(b.alias));

  if (selectedAuthor) {
    const authorData = authorMap[selectedAuthor];
    if (!authorData) {
      setSelectedAuthor(null);
      return null;
    }
    return (
      <AuthorDeckList
        authorData={authorData}
        onGoBack={() => setSelectedAuthor(null)}
      />
    );
  }

  return (
    <div className="modalmenu bg-gray-800">
      <div className="menu">
        {supporters.length > 0 && (
          <>
            <div className="text-yellow-400 text-sm font-bold px-2 pt-2 pb-1">Supporters</div>
            {supporters.map(author => (
              <AuthorMenuItem
                key={author.alias}
                author={author}
                onClick={() => setSelectedAuthor(author.alias)}
              />
            ))}
            <div className="text-gray-400 text-sm font-bold px-2 pt-3 pb-1">Community</div>
          </>
        )}
        {regular.map(author => (
          <AuthorMenuItem
            key={author.alias}
            author={author}
            onClick={() => setSelectedAuthor(author.alias)}
          />
        ))}
      </div>
    </div>
  );
};

const AuthorMenuItem = ({ author, onClick }) => {
  return (
    <DropdownItem
      rightIcon={<FontAwesomeIcon icon={faChevronRight}/>}
      clickCallback={onClick}
    >
      <span className="flex-1">{author.alias}</span>
      <span className="text-gray-400 text-sm mr-2">
        {author.decks.length} {author.decks.length === 1 ? "deck" : "decks"}
      </span>
    </DropdownItem>
  );
};

const AuthorDeckList = ({ authorData, onGoBack }) => {
  const importLoadList = useImportLoadList();
  const dispatch = useDispatch();

  const sortedDecks = [...authorData.decks].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  const handleDeckClick = (deck) => {
    importLoadList(deck.load_list);
    dispatch(setShowModal(null));
  };

  return (
    <div className="modalmenu bg-gray-800">
      <div className="menu">
        <GoBack clickCallback={onGoBack}/>
        {sortedDecks.map(deck => (
          <DropdownItem
            key={deck.id}
            rightIcon={<FontAwesomeIcon icon={faPlus}/>}
            clickCallback={() => handleDeckClick(deck)}
          >
            {deck.name}
          </DropdownItem>
        ))}
      </div>
    </div>
  );
};

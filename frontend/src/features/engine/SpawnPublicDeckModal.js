import React, {useEffect, useState} from "react";
import { useDispatch } from 'react-redux';
import ReactModal from "react-modal";
import { faSort, faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { setShowModal, setTyping } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { usePlugin } from "./hooks/usePlugin";
import { RotatingLines } from "react-loader-spinner";
import Axios from "axios";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { useImportLoadList } from "./hooks/useImportLoadList";
import { Z_INDEX } from "./functions/common";


const RESULTS_LIMIT = 100;

export const SpawnPublicDeckModal = React.memo(({}) => {
    const dispatch = useDispatch();
    const siteL10n = useSiteL10n();

    dispatch(setTyping(true));

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
            width: "80dvh",
            maxHeight: "95dvh",
            overflowY: "scroll",
          }
        }}>
        <h1 className="mb-2">{siteL10n("Load public custom deck")}</h1>
        <Table/>
      </ReactModal>  
    )
})


const Table = React.memo(({}) => {
  const plugin = usePlugin();
  const authOptions = useAuthOptions();
  const importLoadList = useImportLoadList();
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const gameL10n = useGameL10n();
  const [objectDb, setObjectDb] = useState({});

  const [sortedIds, setSortedIds] = useState([]);
  const [filteredIds, setFilteredIds] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);

  const columnInfo = [{propName: "author_alias", label: "Author"}, {propName: "name", label: "Name"}];

  console.log("Rendering DeckbuilderTable", columnInfo, filters);

  const handleFilterTyping = (event, propName) => {
    const filteredVal = event.target.value;
    console.log("filtertype", filters, filteredVal, propName);
    // If the filter is empty, remove it from the filters
    if (filteredVal === "") {
      const filtersCopy = {...filters};
      delete filtersCopy[propName];
      setFilters(filtersCopy);
      return;
    }
    // Otherwise, set the filter
    setFilters({...filters, [propName]: filteredVal});
  };

  const handleSort = (columnName) => {
    const direction = sortConfig.column === columnName && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ column: columnName, direction });
    // Stable sort the cardIds
    const sortedIdsCopy = [...sortedIds];
    sortedIdsCopy.sort((a, b) => {
      const aValue = objectDb[a][columnName];
      const bValue = objectDb[b][columnName];
      // String comparison
      return direction === 'asc' ? aValue?.localeCompare(bValue) : bValue?.localeCompare(aValue);
    });
    setSortedIds(sortedIdsCopy);
  };

  const handleRowClick = (obj) => {
    console.log("handleRowClick", obj);
    importLoadList(obj.load_list);
  };

  useEffect(() => {
    setSortedIds(Object.keys(objectDb));
  }, [objectDb]);

  useEffect(() => {
    const tableContainer = document.querySelector('.deckbuilder-table');
    if (tableContainer) {
      tableContainer.scrollLeft = 0;
    }
  }, []);

  useEffect(() => {
    const fetchCustomContent = async () => {
      const res = await Axios.get(`/be/api/v1/public_decks/${plugin.id}`, authOptions);
      if (res?.data?.public_decks) {
        const publicDecks = res.data.public_decks;
        setObjectDb(publicDecks)
      }
      setLoading(false);
    }
    if (plugin?.id) fetchCustomContent();
  }, [plugin?.id]);

  useEffect(() => {
    // Filter the cardIds
    const filteredIds = sortedIds.filter(id => {
      return Object.entries(filters).every(([propName, filterVal]) => {
        const obj = objectDb[id];
        const match = (
          obj[propName] !== null &&
          obj[propName] !== "" &&
          String(obj[propName]).toLowerCase().includes(String(filterVal).toLowerCase())
        );
        return match;
      });
    });
    setFilteredIds(filteredIds);
  }, [filters, sortedIds]);

  //return;
  if (!objectDb) return;

  console.log("deckbuilder objectDb 2", columnInfo)
  return (
    loading ?
      <div className="flex h-full w-full items-center justify-center" style={{width:"30px", height:"30px"}}>
        <RotatingLines height={100} width={100} strokeColor="white"/>
      </div>
      :
      <div className="overflow-scroll deckbuilder-table w-full">
        <table className="table-fixed rounded-lg w-full">
          <thead>
            <tr className="bg-gray-800">
              {columnInfo?.map((colDetails, colindex) => {
                const isSorted = sortConfig.column === colDetails.propName;
                return (
                  <th key={colindex} className="p-2">
                    <div className="text-white whitespace-nowrap flex justify-between items-center">
                      {gameL10n(colDetails.label)}
                      <div 
                        className="px-1 rounded border hover:bg-red-700"
                        onClick={() => handleSort(colDetails.propName)}>
                        <FontAwesomeIcon
                          icon={isSorted ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <input 
                        autoFocus
                        style={{width:"95%"}} 
                        type="text"
                        id="name" 
                        name="name" 
                        className="m-2 rounded" 
                        placeholder={"Filter " + gameL10n(colDetails.label)} 
                        value={filters[colDetails.propName] || ""}
                        onChange={(event) => handleFilterTyping(event, colDetails.propName)}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredIds.length <= RESULTS_LIMIT && filteredIds.map((id, rowindex) => {
              const obj = objectDb[id];
              const rowClass = rowindex % 2 === 0 ? 'bg-gray-400' : 'bg-gray-500';
    
              if (obj) return (
                <tr 
                  key={rowindex} 
                  className={`${rowClass} text-black hover:bg-gray-600 cursor-pointer`} 
                  onClick={() => handleRowClick(obj)}
                >
                  {columnInfo?.map((colDetails, colindex) => {
                    const content = obj[colDetails.propName];
                    const isCenteredContent = (typeof content === 'string' && content.length === 1) || !isNaN(+content);
                    const cellClass = `p-2 whitespace-nowrap text-ellipsis overflow-hidden ${isCenteredContent ? 'text-center' : ''}`;
                    return (
                      <td key={colindex} className={cellClass}>{content}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredIds.length > RESULTS_LIMIT && <div className="p-1 text-white">Too many results</div>}
      </div>
  );
})
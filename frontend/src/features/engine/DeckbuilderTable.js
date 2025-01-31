import React, {useEffect, useMemo, useState} from "react";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlugin } from "./hooks/usePlugin";
import { keyClass, makeLoadListItem } from "./functions/common";
import { keyStyle } from "./functions/common";
import { useGameL10n } from "./hooks/useGameL10n";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortUp, faSortDown, faSort } from '@fortawesome/free-solid-svg-icons';
import { useAuthOptions } from "../../hooks/useAuthOptions";
import useProfile from "../../hooks/useProfile";
import Axios from "axios";
import { RotatingLines } from "react-loader-spinner";


const RESULTS_LIMIT = 250;

export const DeckbuilderTable = React.memo(({currentGroupId, modifyDeckList, setHoverCardDetails}) => {
  const user = useProfile();
  const plugin = usePlugin();
  const authOptions = useAuthOptions();
  const gameDef = useGameDefinition();
  const gameDefColumnInfo = gameDef.deckbuilder?.columns;
  const deckbuilder = gameDef.deckbuilder;
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const addButtons = [...deckbuilder.addButtons];
  const addButtonsReversed = addButtons.reverse();
  const gameL10n = useGameL10n();

  const officialDb = usePlugin()?.card_db || {};
  const [publicDb, setPublicDb] = useState({});
  const [privateDb, setPrivateDb] = useState({});
  const [loadedCustomContent, setLoadedCustomContent] = useState(false);
  const [selectedDbString, setSelectedDbString] = useState("official");
  var selectedDb = officialDb;
  if (selectedDbString === "public") selectedDb = publicDb;
  if (selectedDbString === "private") selectedDb = privateDb;


  const [sortedCardIds, setSortedCardIds] = useState([]);
  const [filteredCardIds, setFilteredCardIds] = useState([]);
  const [filters, setFilters] = useState({});

  const columnInfo = (selectedDbString === "official") ? gameDefColumnInfo : [{propName: "author_alias", label: "Author"}, ...gameDefColumnInfo];

  console.log("Rendering DeckbuilderTable", columnInfo, filters);

  const addAuthorToCustomDb = (customDb) => {
    Object.keys(customDb).forEach(cardId => {
      const cardDetails = customDb[cardId];
      const authorAlias = cardDetails.author_alias;
      const authorAliasString = authorAlias ? authorAlias : "Unknown";
      const sideA = cardDetails.A;
      sideA["author_alias"] = authorAliasString;
    });
  }

  const changeSelectedDb = (dbString) => {
    const fetchCustomContent = async () => {
      const res = await Axios.get(`/be/api/all_custom_content/${user?.id}/${plugin.id}`, authOptions);
      if (res?.data?.success) {
        if (res?.data?.public_card_db) {
          const publicDb = res?.data?.public_card_db;
          addAuthorToCustomDb(publicDb);
          setPublicDb(publicDb);
        }
        if (res?.data?.private_card_db) {
          const privateDb = res?.data?.private_card_db;
          addAuthorToCustomDb(privateDb);
          setPrivateDb(privateDb);
        }
      }
      setLoadedCustomContent(true);
    }
    if (dbString !== "official" && !loadedCustomContent) {
      fetchCustomContent();
    }
    //if (dbString === "official") setFilters({...filters, author_alias: ""});
    setSelectedDbString(dbString);
  }

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
    const sortedCardIdsCopy = [...sortedCardIds];
    sortedCardIdsCopy.sort((a, b) => {
      const aValue = selectedDb[a].A[columnName];
      const bValue = selectedDb[b].A[columnName];
      // Assuming string or number values, adjust if your data includes other types
      if (gameDef?.faceProperties?.[columnName]?.type === 'integer') {
        return direction === 'asc' ? parseInt(aValue) - parseInt(bValue) : parseInt(bValue) - parseInt(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // String comparison
      return direction === 'asc' ? aValue?.localeCompare(bValue) : bValue?.localeCompare(aValue);
    });
    setSortedCardIds(sortedCardIdsCopy);
  };

  useEffect(() => {
    console.log("jkl selectedDb", selectedDb)
    setSortedCardIds(Object.keys(selectedDb));
  }, [selectedDb]);

  useEffect(() => {
    const tableContainer = document.querySelector('.deckbuilder-table');
    if (tableContainer) {
      tableContainer.scrollLeft = 0;
    }
  }, []);

  useEffect(() => {
    console.log("jkl sortedCardIds", selectedDb, sortedCardIds)
    // Filter the cardIds
    const filteredCardIds = sortedCardIds.filter(cardId => {
      return Object.entries(filters).every(([propName, filterVal]) => {
        if (selectedDbString === "official" && propName === "author_alias") return true;
        var propA = selectedDb?.[cardId]?.A?.[propName];
        const propB = selectedDb?.[cardId]?.B?.[propName];
        const matchSideA = (
          propA !== null &&
          propA !== undefined &&
          propA !== "" &&
          String(propA).toLowerCase().includes(String(filterVal).toLowerCase())
        );
        const matchSideB = (
          propB !== null &&
          propB !== undefined &&
          propB !== "" &&
          String(propB).toLowerCase().includes(String(filterVal).toLowerCase())
        );

        console.log("filteredCardIds filtering", cardId, propName, filterVal, matchSideA, matchSideB)
        return matchSideA || matchSideB;
      });
    });
    console.log("Setting filteredCardIds", filteredCardIds)
    setFilteredCardIds(filteredCardIds);
  }, [filters, sortedCardIds]);

  //return;
  if (!selectedDb) return;

  console.log("deckbuilder selectedDb 2", columnInfo)

  return(
        <div className="overflow-scroll deckbuilder-table" style={{width:"60%"}}>
          <div className="flex justify-center w-full">
            <div className="flex justify-between text-white">
              <div
                className={`m-1 p-1 px-4 cursor-pointer ${selectedDbString === "official" ? "bg-red-800" : "bg-gray-700"}`}
                onClick={() => changeSelectedDb("official")}>
                Official
              </div>
              <div
                className={`m-1 p-1 px-4 cursor-pointer ${selectedDbString === "public" ? "bg-red-800" : "bg-gray-700"}`}
                onClick={() => changeSelectedDb("public")}>
                Public
              </div>
              <div
                className={`m-1 p-1 px-4 cursor-pointer ${selectedDbString === "private" ? "bg-red-800" : "bg-gray-700"}`}
                onClick={() => changeSelectedDb("private")}>
                Private
              </div>
            </div>
          </div>
          {(selectedDbString === "public" || selectedDbString === "private") && !loadedCustomContent ? 
            <div className="flex h-full w-full items-center justify-center">
              <RotatingLines
                height={100}
                width={100}
                strokeColor="white"/>
            </div>
          : 
            <table className="table-fixed rounded-lg w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th key={-1} className="text-white p-1" style={{width:"12dvh"}}></th>
                    {columnInfo?.map((colDetails, colindex) => {
                      const isSorted = sortConfig.column === colDetails.propName;
                      return (
                        <th key={colindex} style={{width:"15dvh"}}>
                          <div className="text-white whitespace-nowrap p-1 flex justify-between items-center">
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
                              style={{width:"95%"}} 
                              type="text"
                              id="name" 
                              name="name" 
                              className="m-2 rounded" 
                              placeholder={"Filter "+gameL10n(colDetails.label)} 
                              value={filters[colDetails.propName] || ""}
                              onChange={(event) => {handleFilterTyping(event, colDetails.propName)}}/>
                          </div>
                        </th>
                      )
                    })}

                </tr>
              </thead>
              {filteredCardIds.length <= RESULTS_LIMIT && filteredCardIds.map((cardId, rowindex) => {
                console.log("deckbuilder cardId", cardId, selectedDb)
                const cardDetails = selectedDb?.[cardId];
                if (!cardDetails) return null;
                const sideA = selectedDb?.[cardId]?.["A"];

                if (cardDetails) return(
                  <tr 
                    key={rowindex} 
                    className="text-white hover:bg-gray-600" 
                    style={{color: deckbuilder.colorKey ? deckbuilder.colorValues[sideA[deckbuilder.colorKey]] : null}}
                    onClick={() => {}}
                    onMouseEnter={() => {setHoverCardDetails(null); setHoverCardDetails({...cardDetails, leftSide: true})}}
                    onMouseLeave={() => setHoverCardDetails(null)}>
                    <td key={-1} className="p-1">
                      {addButtonsReversed.map((addButtonVal, _index) => {
                        const loadListItem = makeLoadListItem(cardId, addButtonVal, currentGroupId, sideA.name, cardDetails.author_id)
                        return(
                          <div 
                            className={keyClass + " float-right text-white hover:bg-gray-400 cursor-pointer"} 
                            style={keyStyle}
                            onClick={()=>modifyDeckList(loadListItem)}>
                              +{addButtonVal}
                          </div>
                        )
                      })}
                    </td>
                    {columnInfo?.map((colDetails, colindex) => {
                      console.log("deckbuilder colDetails", colDetails)
                      const content = sideA[colDetails.propName];
                      // Determine if the content should be centered
                      const isCenteredContent = (typeof content === 'string' && content.length === 1) || !isNaN(+content);
                      // Combine the classes based on the condition
                      const cellClass = `p-1 whitespace-nowrap text-ellipsis overflow-hidden ${isCenteredContent ? 'text-center' : ''}`;
                      return (
                        <td key={colindex} className={cellClass}>{content}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </table>
          }
        {filteredCardIds.length > RESULTS_LIMIT && <div className="p-1 text-white">Too many results</div>} 
      </div>
    )
})
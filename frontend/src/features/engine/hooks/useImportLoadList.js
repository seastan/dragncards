import { useDoActionList } from './useDoActionList';

export const useImportLoadList = () => {
  const doActionList = useDoActionList();

  const loadList = (list) => {
    console.log("loadList", list)
    // Load the cards
    doActionList(["LOAD_CARDS", ["LIST"].concat(list)], "Import load list");

  };

  return loadList;
};
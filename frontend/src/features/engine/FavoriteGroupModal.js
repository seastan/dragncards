import React, { useState } from "react";
import Select from 'react-select'
import ReactModal from "react-modal";
import { useDispatch } from "react-redux";
import { setFavoriteGroupId, setShowModal, setSideGroupId } from "../store/playerUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";

const options = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'playtest', label: 'Playtest' },
]

export const FavoriteGroupModal = ({}) => {
  const dispatch = useDispatch();
  const gameDef = useGameDefinition();
  const [selected, setSelected] = useState(null);

  const options = [];
  if (gameDef.favoriteGroupIds) gameDef.favoriteGroupIds.forEach(groupId => {
    options.push({value: groupId, label: gameDef.groups[groupId].name})
  });

  const handleDropdownChange = (entry) => {
    dispatch(setFavoriteGroupId(entry.value));
    dispatch(setSideGroupId(entry.value));
    setSelected(entry);
  }

  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={true}
      onRequestClose={() => dispatch(setShowModal(null))}
      contentLabel="Select favorite group"
      overlayClassName="fixed inset-0 bg-black-50"
      className="insert-auto p-5 bg-gray-700 border mx-auto my-12 rounded-lg outline-none"
      style={{
        overlay: {
          zIndex: Z_INDEX.Modal
        },
        content: {
          width: '300px',
        }
      }}>

      <h1 className="mb-2">Select favorite group</h1>
      <div className="text-white m-1 mb-4">
      Choose what group this button will open. You can reset it by refreshing your browser.
      </div>
      <div className="mb-4">
        <Select         
          value={selected}
          onChange={handleDropdownChange}
          options={options} />
      </div>
    </ReactModal>
  );
};

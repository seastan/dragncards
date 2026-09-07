import { faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

const AutocompleteItem = ({ children, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center px-3 py-2 text-sm text-white cursor-pointer hover:bg-blue-800"
    >
      <FontAwesomeIcon icon={faUserPlus} className="mr-2 text-xs text-gray-400"/>
      <span className="truncate">{children}</span>
    </div>
  );
};

export default AutocompleteItem;

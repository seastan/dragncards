import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

const UserTag = ({ children, onRemove }) => {
  return (
    <div className="inline-flex items-center max-w-full h-7 pl-3 pr-1 rounded-full bg-gray-600 text-white text-sm">
      <span className="truncate">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${children}`}
        className="ml-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-red-700 focus:outline-none"
      >
        <FontAwesomeIcon icon={faTimes} className="text-xs"/>
      </button>
    </div>
  );
};

export default UserTag;

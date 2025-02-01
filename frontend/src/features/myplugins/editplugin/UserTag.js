import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

const UserTag = ({ children, onRemove }) => {
  return (
    <div className="pl-2 mr-2 rounded-md bg-gray-200 inline-flex items-center">
      <span>{children}</span>
      <span
        onClick={onRemove}
        className="ml-2 cursor-pointer hover:bg-gray-300 rounded-full p-2"
      >
        <FontAwesomeIcon icon={faTimes} />
      </span>
    </div>
  );
};

export default UserTag;

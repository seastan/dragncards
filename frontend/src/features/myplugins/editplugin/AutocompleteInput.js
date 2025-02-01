import React from 'react';


const AutocompleteInput = ({inputValue, setInputValue, updateSuggestions}) => {
  return(
    <input
      value={inputValue}
      placeholder='Add user...'
      onChange={(e) => {
        setInputValue(e.target.value);
        updateSuggestions(e.target.value);
      }}
      className="border p-1 my-1 rounded"
    />
  )
}

export default AutocompleteInput;
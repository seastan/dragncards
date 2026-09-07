import React, { useEffect, useState } from 'react';
import AutocompleteItem from './AutocompleteItem';
import UserTag from './UserTag';
import useDataApi from '../../../hooks/useDataApi';
import AutocompleteInput from './AutocompleteInput';
import { useAuthOptions } from '../../../hooks/useAuthOptions';
import axios from "axios";

const PrivateAccess = ({pluginId}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedUsers, setSelectedUsers] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [allUserPermissionData, setAllUserPermissionData] = useState({});
  const authOptions = useAuthOptions();

  const { data, isLoading, isError, doFetchUrl, doFetchHash, setData } = useDataApi(
    '/be/api/v1/users/plugin_permission/' + pluginId,
    null
  );

  // User alias list (keys from data object)
  const allUsers = data?.data; // ? Object.keys(data?.data) : [];


  // After isLoaded, set selectedUsers to the list of users with permission
  useEffect(() => {
    if (!data?.data) return;
    if (isLoading) return;
    setAllUserPermissionData(data?.data);
  }, [isLoading]);

  if (isError) return (
    <div className="alert alert-danger text-sm p-2 px-3">
      Unable to load the user list.
    </div>
  );

  if (data?.data === null || isLoading) return (
    <div className="h-12 flex items-center px-3 rounded border border-gray-600 bg-gray-800 text-sm text-gray-400">
      Loading...
    </div>
  );

  const updateSuggestions = (value) => {
    if (value) {
      // const newSuggestions = allUsers.filter((user) =>
      //   user.toLowerCase().startsWith(value.toLowerCase())
      // );
      const newSuggestions = Object.keys(allUserPermissionData).filter((user) =>
        user.toLowerCase().startsWith(value.toLowerCase()) && allUserPermissionData[user]["private_access"] === false
      );
      // // Remove suggestions that are already selected
      // const filteredSuggestions = newSuggestions.filter(
      //     (suggestion) => !selectedUsers.includes(suggestion)
      // );
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const addUser = async(user) => {
    //setSelectedUsers([...selectedUsers, user]);
    setInputValue('');
    setSuggestions([]);
    const userId = allUserPermissionData[user].user_id;
    const res = await axios.post(`/be/api/v1/users/plugin_permission/${pluginId}/${userId}`, {}, authOptions);
    if (res.status === 200) {
      setAllUserPermissionData({...allUserPermissionData, [user]: {...allUserPermissionData[user], "private_access": true}});
    }
  };

  const removeUser = async(user) => {
    //setSelectedUsers(selectedUsers.filter((u) => u !== user));
    const userId = allUserPermissionData[user].user_id;
    const res = await axios.delete(`/be/api/v1/users/plugin_permission/${pluginId}/${userId}`, {}, authOptions);
    if (res.status === 200) {
      setAllUserPermissionData({...allUserPermissionData, [user]: {...allUserPermissionData[user], "private_access": false}});
    }
  };

  const sharedUsers = Object.keys(allUserPermissionData).filter(
    (user) => allUserPermissionData[user]["private_access"] === true
  );

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 p-2 rounded border border-gray-600 bg-gray-800 focus-within:border-blue-500">
        {sharedUsers.map((user, index) => (
          <UserTag key={index} onRemove={() => removeUser(user)}>
            {user}
          </UserTag>
        ))}

        <AutocompleteInput inputValue={inputValue} setInputValue={setInputValue} updateSuggestions={updateSuggestions}/>
      </div>

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 z-10 rounded border border-gray-600 bg-gray-800 shadow-lg overflow-y-auto" style={{maxHeight: '12rem'}}>
          {suggestions.map((suggestion, index) => (
            <AutocompleteItem key={index} onClick={() => addUser(suggestion)}>
              {suggestion}
            </AutocompleteItem>
          ))}
        </div>
      )}

      {suggestions.length === 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {inputValue
            ? `No users found matching "${inputValue}".`
            : sharedUsers.length === 0
              ? "No users have access yet."
              : `${sharedUsers.length} user${sharedUsers.length === 1 ? "" : "s"} have access.`}
        </div>
      )}
    </div>
  );
};

export default PrivateAccess;

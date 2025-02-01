import React from "react";


export const StatusMessageBlock = ({
  successMessages,
  errorMessages
}) => {
  return (
    <>
      {successMessages.length > 0 && (
        successMessages.map((message, i) => (
          <div index={i} className="alert alert-info mt-1 text-xs p-1 pl-3">{message}</div>
        ))
      )}
      {errorMessages.length > 0 && (
        errorMessages.map((message, i) => (
          <div index={i} className="alert alert-danger mt-1 text-xs p-1 pl-3">{message}</div>
        ))
      )}
    </>
  )
}
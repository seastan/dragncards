import React from "react";
import { Link } from "react-router-dom";

export const PleaseLogIn = () => {
    return (
        <span className="mt-5 p-2 text-white bg-gray-600 rounded">
          <Link to="/login" className="mr-1 text-white">
            Log in 
          </Link> 
          first, then try again
        </span>
    )
}
import React from 'react';

export const Footer = ({setShowTermsOfService}) => {
    return(
        <div className="mx-auto w-full p-2" style={{maxWidth: "600px"}}>
          <h3 className="mt-6 font-semibold text-center text-gray-300">About</h3>
          <div className="max-w-none">
            <p className="mb-2 text-xs text-gray-300">
              DragnCards is a free and independent online multiplayer card game platform. 
              We don't claim intellectual property rights over any content on this site. 
              Game-related assets visible on DragnCards are not hosted on our platform, 
              but rather are linked to by plugin developers, who are are responsible for 
              ensuring their plugin doesn't infringe upon third-party rights. DragnCards 
              is not endorsed by or affiliated with any game publishers or developers. 
              Please refer to our{" "}
              <span className="underline cursor-pointer" onClick={() => setShowTermsOfService(true)}>
                Terms of Service and Privacy Policy
              </span> for more info.
            </p>
          </div>
        </div>
    )
}
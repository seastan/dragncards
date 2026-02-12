import React from "react";
import Button from "../../components/basic/Button";

export const PatreonLinkButton = ({patreonClientId, redirectURI}) => {
  const clientId = `&client_id=${patreonClientId}`;
  // Include the campaigns.members scope to access user's membership and pledge information
  const v2Params = "&scope=identity%20identity.memberships";
  const redirectUri = `&redirect_uri=${redirectURI}`;

  // URL encode the redirect v2Params
  const encodedV2Params = v2Params;
  const href = `https://www.patreon.com/oauth2/authorize?response_type=code${clientId}${encodedV2Params}${redirectUri}`;

  return (
    <Button isSubmit isPrimary className="mt-2 flex items-center justify-center" onClick={() => window.open(href, '_blank')}>
      <div>Sync Patreon Account</div>
      <img className="ml-2" style={{height: "20px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg"/>
    </Button>
  );
}; 
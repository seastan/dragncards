import React from 'react';
import Button from '../../components/basic/Button';

const PatreonButton = ({ patreonClientId, amount, redirectURI }) => {
  const clientId = `&client_id=${patreonClientId}`;
  const pledgeLevel = `&min_cents=${amount}`;
  const v2Params = "&scope=identity%20identity[email]";
  const redirectUri = `&redirect_uri=${redirectURI}`;
  const href = `https://www.patreon.com/oauth2/become-patron?response_type=code${pledgeLevel}${clientId}${redirectUri}${v2Params}`;

  return (
    <Button className="mt-2">
        <a
            className="flex items-center justify-center no-underline px-6 text-black"
            href={href}
            rel="noreferrer"
            target="_blank">
            <img className="mx-2" style={{height: "20px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg"/>

            Support for ${amount / 100}/month
        </a>
    </Button>
    
  );
};

export default PatreonButton;

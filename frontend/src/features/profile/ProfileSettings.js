import React, { useState, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";
import Container from "../../components/basic/Container";
import Button from "../../components/basic/Button";
import useProfile from "../../hooks/useProfile";
import useForm from "../../hooks/useForm";
import axios from "axios";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { PatreonLinkButton } from "./PatreonLinkButton";

function getParameterValue(url, paramName) {
  const urlSearchParams = new URLSearchParams(url.split('?')[1]);
  return urlSearchParams.get(paramName);
}

export const ProfileSettings = () => {
  const user = useProfile();
  const authOptions = useAuthOptions();
  const history = useHistory();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestedPatreon, setRequestedPatreon] = useState(false);


  const { inputs, handleSubmit, handleInputChange, setInputs } = useForm(async () => {

    const updateData = {
      user: {
        ...user,
        id: user?.id,
        language: inputs.language,
      },
    };
    //const res = await axios.post("/be/api/v1/profile/update", data);
    const res = await axios.post("/be/api/v1/profile/update", updateData, authOptions);
    const newProfileData = {
      user_profile: {
        ...user,
        id: user?.id,
        language: inputs.language,
      }}
    user.setData(newProfileData);
    if (
      res.status === 200
    ) {
      setSuccessMessage("Settings updated.");
      setErrorMessage("");
    } else {
      setSuccessMessage("");
      setErrorMessage("Error."); 
    }
    
  });
  useEffect(() => {
    if (user) {
      setInputs((inputs) => ({
        ...inputs,
        language: user.language || "",
      }));
    }
  }, [user]);

  // Patreon
  useEffect(() => {
    async function getAccessToken() {
      if (!user) return;
      if (requestedPatreon) return;
      const url = window.location.href;
      const splitUrl = url.split( '/' );
      const patreonIndex = splitUrl.findIndex((e) => e === "patreon")
      const patreonStr = patreonIndex > -1 ? splitUrl.slice(patreonIndex + 1).join("/") : null;
      if (patreonStr) {
        setRequestedPatreon(true);
        console.log("Sending patreon request", patreonStr, user);
        const code = getParameterValue(url, "code");
        // wait a second for backend to stabilize
        setSuccessMessage("Linking...");
        setErrorMessage("");
        await new Promise(r => setTimeout(r, 2000));
        const res = await axios.get("/be/api/patreon/"+code, authOptions);

        console.log("Patreon res", res);
        if (res?.data?.success) {
          user.doFetchHash((new Date()).toISOString());
          setSuccessMessage("Patreon account linked. Support level: " + res?.data?.success?.supporter_level);
          setErrorMessage("");
        }
        else {
          setSuccessMessage("");
          setErrorMessage("Error linking Patreon account. Please try again. If this error persists, please contact dragncards@gmail.com, indicating your DragnCards email, Patreon email (if different), and Patreon support level.");
        }

      }
    }
    getAccessToken();
  }, [user]);

  if (user == null) {
    return null;
  }

  const PatreonSignUpButton = ({patreonClientId, amount, redirectURI}) => {
    const clientId = `&client_id=${patreonClientId}`;
    const pledgeLevel = `&min_cents=${amount}`;
    const v2Params = "&scope=identity%20identity[email]";
    const redirectUri = `&redirect_uri=${redirectURI}`;
    const href = `https://www.patreon.com/oauth2/become-patron?response_type=code${pledgeLevel}${clientId}${redirectUri}${v2Params}`;
    return (
      <a
        className="patreon-button link-button"
        data-patreon-widget-type="become-patron-button"
        href={href}
        rel="noreferrer"
        target="_blank">
        <img style={{height: "20px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg"/>
      </a>
    );
  };

  // Get patreon data from environment variables
  const redirectURI = process.env.REACT_APP_PATREON_REDIRECT_URI;
  const patreonClientId = process.env.REACT_APP_PATREON_CLIENT_ID;
  console.log("Patreon data", redirectURI, patreonClientId);

  return (
    <Container>
      <div className="bg-gray-100 p-4 rounded max-w-xl shadow">
          
        {errorMessage && (
          <div className="alert alert-danger mt-4">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="alert alert-info mt-4">{successMessage}</div>
        )}

        <h1 className="font-semibold mb-2 text-black">Patreon</h1>
        <div>
            <span className="font-semibold">
              <div>Current supporter level: {user.supporter_level ? user.supporter_level : 0}</div> 
            </span>
          </div>
        <PatreonLinkButton patreonClientId={patreonClientId} redirectURI={redirectURI} />

        <h1 className="font-semibold my-2 text-black">Language</h1>
        <form action="POST" onSubmit={handleSubmit}>
          <fieldset>
            <div className="mb-4">
              <select 
                name="language"
                className="form-control w-full"
                onChange={handleInputChange}
                value={inputs.language || "English"}>
                <option value="English">English</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
                <option value="Italian">Italian</option>
                <option value="German">German</option>
                <option value="Chinese">Chinese</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
                <Button isSubmit isPrimary className="mx-2">
                  Update Language
                </Button>
            </div>
          </fieldset>
        </form>
      </div>

    </Container>

  );
};
export default ProfileSettings;

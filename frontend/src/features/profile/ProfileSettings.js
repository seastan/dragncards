import React, { useState, useEffect, useMemo } from "react";
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

const sectionStyle = {
  backgroundColor: "rgba(75, 85, 99, 0.3)",
  border: "1px solid rgba(75, 85, 99, 0.5)",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "16px",
};

const headingStyle = {
  margin: "0 0 12px 0",
  fontSize: "1.1rem",
  fontWeight: 600,
  color: "white",
};

const subheadingStyle = {
  margin: "0 0 8px 0",
  fontSize: "0.95rem",
  fontWeight: 600,
  color: "#e5e7eb",
  paddingTop: "12px",
  borderTop: "1px solid rgba(107,114,128,0.4)",
};

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timezoneOptions = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [browserTimezone];
  }
})();

export const ProfileSettings = () => {
  const user = useProfile();
  const authOptions = useAuthOptions();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestedPatreon, setRequestedPatreon] = useState(false);

  const { inputs, handleSubmit, handleInputChange, setInputs } = useForm(async () => {
    const updateData = {
      user: {
        ...user,
        id: user?.id,
        language: inputs.language,
        timezone: inputs.timezone,
      },
    };
    const res = await axios.post("/be/api/v1/profile/update", updateData, authOptions);
    const newProfileData = {
      user_profile: {
        ...user,
        id: user?.id,
        language: inputs.language,
        timezone: inputs.timezone,
      }}
    user.setData(newProfileData);
    if (res.status === 200) {
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
        timezone: user.timezone || browserTimezone,
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
        const code = getParameterValue(url, "code");
        setSuccessMessage("Linking...");
        setErrorMessage("");
        await new Promise(r => setTimeout(r, 2000));
        const res = await axios.get("/be/api/patreon/"+code, authOptions);

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

  // Get patreon data from environment variables
  const redirectURI = process.env.REACT_APP_PATREON_REDIRECT_URI;
  const patreonClientId = process.env.REACT_APP_PATREON_CLIENT_ID;

  return (
    <div style={sectionStyle}>
      <h1 style={headingStyle}>Settings</h1>

      {errorMessage && (
        <div style={{backgroundColor: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.4)", borderRadius: "6px", padding: "10px 14px", marginBottom: "12px", color: "#fca5a5", fontSize: "0.85rem"}}>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div style={{backgroundColor: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: "6px", padding: "10px 14px", marginBottom: "12px", color: "#93c5fd", fontSize: "0.85rem"}}>
          {successMessage}
        </div>
      )}

      {/* Patreon */}
      <div style={{marginBottom: "16px"}}>
        <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px"}}>
          <span style={{color: "#9ca3af", fontSize: "0.85rem"}}>Supporter level:</span>
          <span style={{color: "#e5e7eb", fontSize: "0.85rem", fontWeight: 600}}>{user.supporter_level ? user.supporter_level : 0}</span>
        </div>
        {user.patreon_member_id && (
          <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px"}}>
            <span style={{color: "#9ca3af", fontSize: "0.85rem"}}>Patreon account:</span>
            <span style={{color: "#e5e7eb", fontSize: "0.85rem", fontWeight: 600}}>{user.patreon_member_id}</span>
          </div>
        )}
        <PatreonLinkButton patreonClientId={patreonClientId} redirectURI={redirectURI} />
        {user.supporter_level > 0 && !user.patreon_member_id && (
          <div style={{
            backgroundColor: "rgba(217, 169, 56, 0.15)",
            border: "1px solid rgba(217, 169, 56, 0.5)",
            borderRadius: "6px",
            padding: "10px 14px",
            marginTop: "8px",
            color: "#f5d98a",
            fontSize: "0.85rem",
          }}>
            Please re-link your Patreon account to ensure uninterrupted benefits.
          </div>
        )}
      </div>

      {/* Language & Timezone */}
      <form action="POST" onSubmit={handleSubmit}>
        <div style={subheadingStyle}>Language</div>
        <select
          name="language"
          onChange={handleInputChange}
          value={inputs.language || "English"}
          style={{
            backgroundColor: "rgba(75, 85, 99, 0.5)",
            border: "1px solid rgba(107,114,128,0.5)",
            borderRadius: "6px",
            padding: "6px 12px",
            color: "#e5e7eb",
            fontSize: "0.85rem",
            width: "100%",
            marginBottom: "12px",
            outline: "none",
          }}
        >
          <option value="English">English</option>
          <option value="French">French</option>
          <option value="Spanish">Spanish</option>
          <option value="Portuguese">Portuguese</option>
          <option value="Italian">Italian</option>
          <option value="German">German</option>
          <option value="Chinese">Chinese</option>
        </select>

        <div style={subheadingStyle}>Timezone</div>
        <select
          name="timezone"
          onChange={handleInputChange}
          value={inputs.timezone || browserTimezone}
          style={{
            backgroundColor: "rgba(75, 85, 99, 0.5)",
            border: "1px solid rgba(107,114,128,0.5)",
            borderRadius: "6px",
            padding: "6px 12px",
            color: "#e5e7eb",
            fontSize: "0.85rem",
            width: "100%",
            marginBottom: "12px",
            outline: "none",
          }}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>

        <Button isSubmit isPrimary>
          Save Settings
        </Button>
      </form>
    </div>
  );
};
export default ProfileSettings;

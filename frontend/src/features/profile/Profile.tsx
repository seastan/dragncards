import React from "react";
import { useHistory } from "react-router-dom";
import ProfileSettings from "./ProfileSettings";
import useProfile from "../../hooks/useProfile";
import Button from "../../components/basic/Button";
import { parseISO, format, formatDistanceToNow } from "date-fns";
import axios from "axios";
import RecaptchaForm from "./RecaptchaForm";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import useAuth from "../../hooks/useAuth";
import { SupporterBadge } from "../user/UserName";

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

const labelStyle = {
  color: "#9ca3af",
  fontSize: "0.85rem",
};

const valueStyle = {
  color: "#e5e7eb",
  fontSize: "0.85rem",
};

interface Props {}

export const Profile: React.FC<Props> = () => {
  const user = useProfile();
  const authOptions = useAuthOptions();
  const history = useHistory();
  const { logOut } = useAuth();
  if (user == null) {
    return null;
  }

  const insertedDate = parseISO(user.inserted_at);
  const insertedAbsolute = format(insertedDate, "yyyy-MM-dd hh:mm bb");
  const insertedRelative = formatDistanceToNow(insertedDate, {
    addSuffix: true,
  });

  return (
    <div className="text-white mx-auto w-full p-4 overflow-y-auto" style={{maxWidth: "700px"}}>

      {/* Account Info */}
      <div style={sectionStyle}>
        <h1 style={headingStyle}><SupporterBadge level={user.supporter_level} />{user.alias}</h1>
        <div style={{display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px"}}>
          <span style={labelStyle}>Account created</span>
          <span style={valueStyle}>{insertedAbsolute} ({insertedRelative})</span>
          <span style={labelStyle}>Email</span>
          <span style={valueStyle}>{user.email}</span>
          <span style={labelStyle}>Email confirmed</span>
          <span style={valueStyle}>{user.email_confirmed_at != null ? "Yes" : "No"}</span>
        </div>
        {user.email_confirmed_at == null && <div className="mt-3"><RecaptchaForm/></div>}
      </div>

      {/* Settings */}
      <ProfileSettings/>

      {/* Delete Account */}
      <div style={{...sectionStyle, borderColor: "rgba(220, 38, 38, 0.3)"}}>
        <h1 style={{...headingStyle, color: "#fca5a5"}}>Delete Account</h1>
        <p style={{color: "#9ca3af", fontSize: "0.85rem", margin: "0 0 12px 0"}}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          isCancel
          onClick={async () => {
            const confirmText = window.prompt(
              'This will permanently delete your account, saved games, decks, and custom content. Type "DELETE" to confirm.'
            );
            if (confirmText !== "DELETE") return;
            try {
              await axios.delete("/be/api/v1/profile", authOptions);
              logOut();
              history.push("/");
            } catch (e) {
              alert("Failed to delete account. Please try again.");
            }
          }}
        >
          Delete My Account
        </Button>
      </div>
    </div>
  );
};
export default Profile;

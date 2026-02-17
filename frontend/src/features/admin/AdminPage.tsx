import React, { useState } from "react";
import useProfile from "../../hooks/useProfile";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import axios from "axios";

const sectionStyle = {
  backgroundColor: "rgba(75, 85, 99, 0.3)",
  border: "1px solid rgba(75, 85, 99, 0.5)",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "16px",
};

const headingStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: "1.1rem",
  fontWeight: 600,
  color: "white",
};

const labelStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "0.85rem",
  display: "block",
  marginBottom: "4px",
};

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(75, 85, 99, 0.5)",
  border: "1px solid rgba(107,114,128,0.5)",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#e5e7eb",
  fontSize: "0.85rem",
  width: "100%",
  marginBottom: "12px",
  outline: "none",
};

const AdminPage: React.FC = () => {
  const user = useProfile();
  const authOptions = useAuthOptions();
  const siteL10n = useSiteL10n();
  const [alias, setAlias] = useState("");
  const [supporterLevel, setSupporterLevel] = useState("");
  const [patreonMemberId, setPatreonMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  if (!user) return null;

  if (!user.admin) {
    return (
      <div className="flex justify-center" style={{ paddingTop: "40px" }}>
        <div style={{ color: "#fca5a5", fontSize: "1rem" }}>Forbidden</div>
      </div>
    );
  }

  const issueDowntimeNotice = async () => {
    let defMessage = siteL10n("defaultMaintenanceMessage");
    let text = window.prompt(`Enter the message to send to all users. Leave blank to send default message (${defMessage})`);
    if (text == null) return;
    if (text === "") text = defMessage;
    await axios.post("/be/api/rooms/send_alert", { level: "crash", text: text, autoClose: false }, authOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await axios.post(
        "/be/api/v1/admin/update_user_patreon",
        {
          alias: alias,
          supporter_level: supporterLevel ? parseInt(supporterLevel, 10) : null,
          patreon_member_id: patreonMemberId || null,
        },
        authOptions
      );
      if (res?.data?.success) {
        setIsError(false);
        setMessage(res.data.success.message);
      } else {
        setIsError(true);
        setMessage(res?.data?.error?.message || "Unknown error");
      }
    } catch (err: any) {
      setIsError(true);
      setMessage(err?.response?.data?.error?.message || "Request failed");
    }
  };

  return (
    <div className="flex justify-center" style={{ paddingTop: "20px" }}>
      <div style={{ width: "100%", maxWidth: "500px" }}>
        <h1 style={{ color: "white", fontSize: "1.3rem", fontWeight: 600, marginBottom: "16px" }}>
          Admin
        </h1>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Set User Patreon Info</h2>

          {message && (
            <div
              style={{
                backgroundColor: isError ? "rgba(220,38,38,0.2)" : "rgba(34,197,94,0.2)",
                border: `1px solid ${isError ? "rgba(220,38,38,0.4)" : "rgba(34,197,94,0.4)"}`,
                borderRadius: "6px",
                padding: "10px 14px",
                marginBottom: "12px",
                color: isError ? "#fca5a5" : "#86efac",
                fontSize: "0.85rem",
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>User Alias</label>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              style={inputStyle}
              required
            />

            <label style={labelStyle}>Supporter Level</label>
            <input
              type="number"
              value={supporterLevel}
              onChange={(e) => setSupporterLevel(e.target.value)}
              style={inputStyle}
              min="0"
            />

            <label style={labelStyle}>Patreon Member ID</label>
            <input
              type="text"
              value={patreonMemberId}
              onChange={(e) => setPatreonMemberId(e.target.value)}
              style={inputStyle}
            />

            <button
              type="submit"
              style={{
                backgroundColor: "rgba(59,130,246,0.8)",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                color: "white",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: "4px",
              }}
            >
              Update User
            </button>
          </form>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Downtime Notice</h2>
          <button
            onClick={issueDowntimeNotice}
            style={{
              backgroundColor: "rgba(220,38,38,0.7)",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              color: "white",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Issue downtime notice
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

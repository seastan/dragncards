import React, { useState } from "react";
import ReactModal from "react-modal";
import Button from "../../components/basic/Button";
import Axios from "axios";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { PatreonModal } from "../store/support/PatreonModal";

ReactModal.setAppElement("#root");

// Bump this number each time you add a new release entry.
export const WHATS_NEW_VERSION = 1;

const releases = [
  {
    version: 2.1,
    date: "Feb 11, 2026",
    title: "Favorites, Automation Toggles & More",
    sections: [
      {
        heading: "⭐ New Features",
        items: [
          "Favorite plugins — Click the star next to any plugin in the lobby to pin it to the top of your list.",
          "Automation toggles — Hosts can now enable or disable individual automation rules during a game via View > Preferences > Automation Preferences.",
          "Improved public custom-deck loading.",
          "You can now delete your account from the profile settings page.",
        ],
      },
      {
        heading: "🔒 New Subscriber-Only Features",
        subscriberOnly: true,
        items: [
          "Favorite prebuilt decks — Mark prebuilt decks as favorites so they appear at the top of the menu.",
          "Favorite URLs — In the 'Load prebuilt deck' menu, add URLs as favorites for quick access.",
          "Longer room idle timeout — Idle rooms will now stay open for 24 hours to 7 days depending on supporter level (up from 1 hour)",
        ],
      },
      {
        heading: "🐛 Bug Fixes",
        items: [
          "Fixed multiplayer game saves from getting out of sync.",
          "Various styling improvements.",
        ],
      },
    ],
  },
];

const sectionStyle = {
  marginBottom: "16px",
};

const sectionHeadingStyle = {
  fontSize: "0.95rem",
  fontWeight: 600,
  color: "#e5e7eb",
  marginBottom: "8px",
  paddingBottom: "4px",
  borderBottom: "1px solid rgba(107, 114, 128, 0.4)",
};

const listStyle = {
  listStyle: "disc",
  paddingLeft: "20px",
  margin: 0,
};

const listItemStyle = {
  marginBottom: "6px",
  fontSize: "0.875rem",
  color: "#d1d5db",
  lineHeight: "1.5",
};

export const WhatsNewModal = ({ isOpen, closeModal, user }) => {
  const authOptions = useAuthOptions();
  const [showPatreon, setShowPatreon] = useState(false);
  const isSupporter = user?.supporter_level;

  const handleDismiss = async () => {
    closeModal();
    if (user?.id) {
      await Axios.post(
        "/be/api/v1/profile/update_whats_new_dismissed",
        { version: WHATS_NEW_VERSION },
        authOptions
      );
      user.setData({
        user_profile: {
          ...user,
          whats_new_dismissed: WHATS_NEW_VERSION,
        },
      });
    }
  };

  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={isOpen}
      onRequestClose={handleDismiss}
      contentLabel="What's New"
      overlayClassName="fixed inset-0 bg-black-50 z-50 overflow-y-scroll"
      className="insert-auto text-white bg-gray-700 border border-gray-600 mx-auto my-12 rounded-lg outline-none"
      style={{
        overlay: {},
        content: {
          width: "600px",
        },
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 24px 12px 24px", borderBottom: "1px solid #374151" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
          What's New
        </h1>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 24px 20px 24px" }}>
        {releases.map((release) => (
          <div key={release.version}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 600 }}>{release.title}</span>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{release.date}</span>
            </div>

            {release.sections.map((section, si) => (
              <div key={si} style={sectionStyle}>
                <div style={sectionHeadingStyle}>
                  {section.heading}
                  {section.subscriberOnly && !isSupporter && (
                    <span
                      onClick={() => setShowPatreon(true)}
                      style={{ marginLeft: "8px", fontSize: "0.8rem", color: "#60a5fa", cursor: "pointer" }}
                    >
                      Support now
                    </span>
                  )}
                </div>
                <ul style={listStyle}>
                  {section.items.map((item, ii) => (
                    <li key={ii} style={listItemStyle}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}

        <Button isPrimary onClick={handleDismiss} className="mt-2">
          Got it
        </Button>
      </div>
      <PatreonModal isOpen={showPatreon} closeModal={() => setShowPatreon(false)} />
    </ReactModal>
  );
};

import React from "react";
import ReactModal from "react-modal";
import { faHeart, faCrown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../../components/basic/Button";
import { PleaseLogIn } from "../../lobby/PleaseLogIn";
import PatreonButton from "./PatreonButton";
import { Z_INDEX } from "../../engine/functions/common";
import imageHosting from "./imageHostingTiers.json";

const formatStorage = (bytes) => {
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
};

// "Host up to 1,000 plugin images (300 MB)" for the tier starting at `level`.
const hostingBenefit = (level) => {
  const tier = imageHosting.tiers.find((t) => t.min_level === level);
  return `Host up to ${tier.max_files.toLocaleString()} plugin images (${formatStorage(tier.max_bytes)})`;
};

ReactModal.setAppElement("#root");

export const PatreonModal = ({
  isOpen,
  isLoggedIn,
  closeModal
}) => {
    const tiers = [
        {
          amount: 300,
          name: "Bronze",
          color: "#CD7F32",
          benefits: [
            "Bronze crown badge next to your name",
            "Unlimited saved games",
            "Saved games include full replay",
            "Favorite prebuilt decks and URLs",
            "Idle room timeout increased from 1 hour to 24 hours",
            hostingBenefit(3),
          ]
        },
        {
          amount: 500,
          name: "Silver",
          color: "#C0C0C0",
          benefits: [
            "Silver crown badge next to your name",
            "All Bronze benefits",
            "Custom alt art cards",
            "Custom card backs",
            "Custom backgrounds",
            "Private custom content",
            "Idle room timeout increased to 3 days",
            hostingBenefit(5),
          ]
        },
        {
          amount: 1000,
          name: "Gold",
          color: "#FFD700",
          benefits: [
            "Gold crown badge next to your name",
            "All Silver benefits",
            `Optional "Esteemed Supporter" discord role`,
            "Access to plugin developer discord channels",
            "Idle room timeout increased to 7 days",
            hostingBenefit(10),
          ]
        },
    ];

  // Get patreon data from environment variables. These must match the values the
  // backend uses for the token exchange, otherwise Patreon rejects the redirect URI.
  const patreonClientId = process.env.REACT_APP_PATREON_CLIENT_ID;
  const redirectURI = process.env.REACT_APP_PATREON_REDIRECT_URI;

  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={isOpen}
      onRequestClose={closeModal}
      contentLabel="Support on Patreon"
      overlayClassName="fixed inset-0 bg-black-50 overflow-y-scroll"
      className="insert-auto p-5 bg-gray-700 border mx-auto rounded-lg my-12 outline-none"
      style={{
        overlay: {
          zIndex: Z_INDEX.Modal
        },
        content: {
          width: '1100px',
          maxWidth: '95vw',
        }
      }}>
      <h1 className="mb-2">Support on Patreon</h1>
      {isLoggedIn ? (
        <>
          <div className="text-white text-xs mb-4">For questions about the support tiers, join the <a href="https://discord.gg/7BQv5ethUm" target="_blank" rel="noreferrer">Discord</a>.</div>
          <div className="flex flex-col lg:flex-row gap-4">
            {tiers.map((tier, index) => (
                <div key={index} className="flex-1 border rounded-lg p-3 border-gray-500 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faCrown} style={{ color: tier.color, fontSize: "1.2em" }} />
                    <span className="text-white font-bold text-lg">{tier.name}</span>
                  </div>
                  <PatreonButton
                      patreonClientId={patreonClientId}
                      amount={tier.amount}
                      redirectURI={redirectURI}
                  />
                  <ul className="text-white mt-3 list-disc list-inside text-sm flex-1">
                    {tier.benefits.map((benefit, i) => (
                      <li key={i}>
                        {benefit}
                        {benefit === "Favorite prebuilt decks and URLs" && (
                          <FontAwesomeIcon icon={faHeart} style={{color: "#e53e3e", marginLeft: "6px", fontSize: "0.85em"}}/>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
            ))}
          </div>
          <div className="text-gray-300 text-xs mt-3">
            Free accounts can host up to{" "}
            {imageHosting.tiers.find((t) => t.min_level === 0).max_files.toLocaleString()} plugin
            images ({formatStorage(imageHosting.tiers.find((t) => t.min_level === 0).max_bytes)}).
          </div>
          <Button isCancel onClick={closeModal} className="mt-4">
              Cancel
          </Button>
        </>
        ) : (
            <PleaseLogIn/>
        )}
    </ReactModal>
  );
};
import React from "react";
import ReactModal from "react-modal";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../../components/basic/Button";
import { PleaseLogIn } from "../../lobby/PleaseLogIn";
import PatreonButton from "./PatreonButton";
import { Z_INDEX } from "../../engine/functions/common";

ReactModal.setAppElement("#root");

export const PatreonModal = ({
  isOpen,
  isLoggedIn,
  closeModal
}) => {
    const tiers = [
        { 
          amount: 300, 
          benefits: ["Unlimited saved games", "Saved games include full replay", "Favorite prebuilt decks and URLs", "Idle room timeout increased from 1 hour to 24 hours"]
        },
        { 
          amount: 500,  
          benefits: ["All lower tier benefits", "Custom alt art cards", "Custom card backs", "Custom backgrounds", "Private custom content", "Idle room timeout increased to 3 days"] 
        },
        { 
          amount: 1000, 
          benefits: ["All lower tier benefits", `Optional "Esteemed Supporter" discord role`, `Access to plugin developer discord channels`, "Idle room timeout increased to 7 days"]
        },
    ];

  const patreonClientId = "MUANs_lS4yBmji1txII2sV6NJ3X1JEp5OSzPVr_rkU02jz3S2jTubjoMOSPK5Jul";
  const redirectURI = "https://www.dragncards.com/auth/patreon/callback";

  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={isOpen}
      onRequestClose={closeModal}
      contentLabel="Support on Patreon"
      overlayClassName="fixed inset-0 bg-black-50"
      className="insert-auto p-5 bg-gray-700 border mx-auto rounded-lg my-12 outline-none"
      style={{
        overlay: {
          zIndex: Z_INDEX.Modal
        },
        content: {
          width: '450px',
        }
      }}>
      <h1 className="mb-2">Support on Patreon</h1>
      {isLoggedIn ? (
        <>
          <div className="text-white text-xs mb-2">For questions about the support tiers, join the <a href="https://discord.gg/7BQv5ethUm" target="_blank" rel="noreferrer">Discord</a>.</div>
            {tiers.map((tier, index) => (
                <div key={index} className="mb-4 border rounded-lg p-2 border-gray-500">
                <PatreonButton
                    patreonClientId={patreonClientId}
                    amount={tier.amount}
                    redirectURI={redirectURI}
                />
                <ul className="text-white mt-2 list-disc list-inside">
                  {tier.benefits.map((benefit, i) => <li key={i}>{benefit}{benefit === "Favorite prebuilt decks and URLs" && <FontAwesomeIcon icon={faHeart} style={{color: "#e53e3e", marginLeft: "6px", fontSize: "0.85em"}}/>}</li>)}
                </ul>
                </div>
            ))}
            <Button isCancel onClick={closeModal} className="mt-2">
                Cancel
            </Button>
        </>
        ) : (
            <PleaseLogIn/>
        )}
    </ReactModal>
  );
};
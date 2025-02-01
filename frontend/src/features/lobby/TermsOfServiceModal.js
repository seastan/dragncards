import React from "react";
import ReactModal from "react-modal";
import Button from "../../components/basic/Button";

ReactModal.setAppElement("#root");

export const TermsOfServiceModal = ({ 
  isOpen,
  closeModal,
}) => {

  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={isOpen}
      onRequestClose={closeModal}
      contentLabel="Terms of Service"
      overlayClassName="fixed inset-0 bg-black-50 z-50 overflow-y-scroll"
      className="insert-auto text-white p-5 bg-gray-700 border mx-auto my-12 rounded-lg outline-none"
      style={{
        overlay: {
        },
        content: {
          width: '600px',
        }
      }}>

        <h1>Terms of Service</h1>

        <ol>
            <li className="mb-2"><strong>Acceptance of Terms</strong>: By using DragnCards, you agree to these Terms of Service. If you do not agree to these terms, do not use the site.</li>
            <li className="mb-2"><strong>User Accounts</strong>: Users are responsible for maintaining the confidentiality of their account credentials and are liable for all activities that occur under their account.</li>
            <li className="mb-2"><strong>User Content</strong>: Users are responsible for the content they upload and agree not to upload content that infringes upon third-party intellectual property rights.</li>
            <li className="mb-2"><strong>Intellectual Property</strong>: DragnCards does not claim intellectual property rights over user-uploaded content. All game-related assets are owned by their respective creators.</li>
        </ol>

        <h1>Privacy Policy</h1>

        <ol>
            <li className="mb-2"><strong>Collection of Information</strong>: We collect information provided by users during account creation and game play. This can include username, email, and game-related data.</li>
            <li className="mb-2"><strong>Use of Information</strong>: We use this information to provide and improve our services, respond to user inquiries, and enforce our Terms of Service.</li>
            <li className="mb-2"><strong>Disclosure of Information</strong>: We do not sell or trade your personal information to outside parties. We may share information when we believe it is necessary to comply with the law, enforce our site policies, or protect ours or others' rights, property, or safety.</li>
        </ol>

        <Button isCancel onClick={closeModal} className="mt-2">
          Close
        </Button>

    </ReactModal>
  );
};

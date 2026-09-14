import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import useProfile from "../../../hooks/useProfile";
import useAuth from "../../../hooks/useAuth";
import { ImageManager } from "./ImageManager";
import { PatreonModal } from "../../store/support/PatreonModal";

/** Standalone page wrapper. A file browser is too cramped inside a modal. */
export const MyImages = () => {
  const user = useProfile();
  const { authToken } = useAuth();
  const [showPatreon, setShowPatreon] = useState(false);

  if (!authToken) return <Redirect to="/login" />;
  if (!user) return null;

  return (
    <div
      className="mx-auto mt-4 flex w-full flex-col p-2"
      style={{ height: "calc(100vh - 100px)", maxWidth: 1100 }}
    >
      <h1 className="mb-2 text-xl text-white">My Images</h1>
      <p className="mb-3 text-xs text-gray-400">
        Host card art here and reference it from your plugin. Put each language in its own
        folder, then use that folder's URL as an <code>imageUrlPrefix</code> so your TSV can
        keep using bare filenames.
      </p>

      <div className="min-h-0 flex-1">
        <ImageManager onSupportClick={() => setShowPatreon(true)} />
      </div>

      <PatreonModal
        isOpen={showPatreon}
        isLoggedIn={!!authToken}
        closeModal={() => setShowPatreon(false)}
      />
    </div>
  );
};

export default MyImages;

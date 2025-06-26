import React from "react";
import { PropertyEditor } from "../PropertyEditor";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";

export const GameProperties = ({ inputs, setInputs }) => {
  const siteL10n = useSiteL10n();

  return (
    <PropertyEditor
      title={siteL10n("Game Properties")}
      description={siteL10n("Game properties are global state values that apply across the entire game. You do not need to create a roundNumber property, as one exists for every plugin by default.")}
      properties={inputs.gameProperties || []}
      setProperties={(props) => setInputs((prev) => ({ ...prev, gameProperties: props }))}
      siteL10n={siteL10n}
    />
  );
};

import React from "react";
import { PropertyEditor } from "../PropertyEditor";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";

export const PlayerProperties = ({ inputs, setInputs }) => {
  const siteL10n = useSiteL10n();

  return (
    <PropertyEditor
      title={siteL10n("Player Properties")}
      description={siteL10n("Player properties are tracked for each player individually during the game.")}
      properties={inputs.playerProperties || []}
      setProperties={(props) => setInputs((prev) => ({ ...prev, playerProperties: props }))}
      defaultProperty={{ propertyId: "score", label: "Score", type: "integer", default: 0 }}
      siteL10n={siteL10n}
    />
  );
};

import React from "react";
import { PropertyEditor } from "../PropertyEditor";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";

export const CardProperties = ({ inputs, setInputs }) => {
  const siteL10n = useSiteL10n();

  return (
    <PropertyEditor
      title={siteL10n("Card Properties")}
      description={siteL10n("Card properties are attributes associated with cards that are not printed on their face.")}
      properties={inputs.cardProperties || []}
      setProperties={(props) => setInputs((prev) => ({ ...prev, cardProperties: props }))}
      defaultProperty={{ propertyId: "exhausted", label: "Exhausted", type: "boolean", default: false }}
      siteL10n={siteL10n}
    />
  );
};

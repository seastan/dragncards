import React from "react";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";

const basicKeys = [
  {
    key: "pluginName",
    label: "Plugin Name",
    type: "text",
    placeholder: "Enter plugin name",
  },
  {
    key: "minPlayers",
    label: "Minimum Players",
    type: "number",
    placeholder: "Enter minimum players",
  },
  {
    key: "maxPlayers",
    label: "Maximum Players",
    type: "number",
    placeholder: "Enter maximum players",
  },
  {
    key: "backgroundUrl",
    label: "Background Image URL",
    type: "text",
    placeholder: "Enter background image URL",
  },
];

export const GameBasics = ({ inputs, setInputs }) => {
  console.log("GameBasics component rendered with inputs:", inputs);
  const siteL10n = useSiteL10n();

  const handleChange = (key, value) => {
    setInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="max-w-3xl p-6 m-4 bg-gray-800 rounded-lg">
      {basicKeys.map(({ key, label, type, placeholder }) => (
        <div key={key} className="flex items-center space-x-4">
          <label className="flex-1 text-sm text-gray-300 p-1">
            {siteL10n(label)}:
            <input
              type={type}
              placeholder={placeholder}
              value={inputs[key] || ""}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
            />
          </label>
        </div>
      ))}
      {inputs.backgroundUrl && (
        <div className="mt-4">
          <img
            src={inputs.backgroundUrl}
            alt={siteL10n("Background Preview")}
            className="max-w-full max-h-64 rounded border border-gray-600"
            style={{ objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );

};

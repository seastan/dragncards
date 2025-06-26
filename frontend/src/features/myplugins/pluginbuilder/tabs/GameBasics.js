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

  // return (
  //   <>
  //     <p className="text-sm text-gray-300 mb-4">
  //       {siteL10n("These are the card types extracted from the card database. Fill or correct the fields below.")}
  //     </p>

  //     <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '75vh' }}>
  //       {uniqueTypes.map((type) => {
  //         const values = cardTypes?.[type] || { width: 0.72, height: 1.0 };
  //         return (
  //           <div key={type} className="flex items-center space-x-4">
  //             <span className="w-32 font-semibold text-white">{type}</span>
  //             <label className="flex items-center space-x-2 text-sm text-gray-300">
  //               <span>{siteL10n("Width")}:</span>
  //               <input
  //                 type="number"
  //                 step="0.01"
  //                 value={values.width}
  //                 onChange={(e) => handleChange(type, "width", e.target.value)}
  //                 className="w-20 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
  //               />
  //             </label>
  //             <label className="flex items-center space-x-2 text-sm text-gray-300">
  //               <span>{siteL10n("Height")}:</span>
  //               <input
  //                 type="number"
  //                 step="0.01"
  //                 value={values.height}
  //                 onChange={(e) => handleChange(type, "height", e.target.value)}
  //                 className="w-20 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
  //               />
  //             </label>
  //           </div>
  //         );
  //       })}
  //     </div>
  //   </>
  // );
};

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faInfoCircle } from "@fortawesome/free-solid-svg-icons";

export const PropertyEditor = ({
  title,
  description,
  properties,
  setProperties,
  typeOptions = ["boolean", "integer", "string", "float", "object", "list"],
  allowCustomId = true,
  defaultProperty = null,
  siteL10n,
}) => {
  React.useEffect(() => {
    if ((!properties || properties.length === 0) && defaultProperty) {
      setProperties([defaultProperty]);
    }
  }, [properties, setProperties, defaultProperty]);

  const addProperty = () => {
    setProperties([
      ...(properties || []),
      {
        propertyId: "",
        label: "",
        type: "string",
        default: "",
      },
    ]);
  };

  const removeProperty = (index) => {
    const updated = [...properties];
    updated.splice(index, 1);
    setProperties(updated);
  };

  const updateField = (index, field, value) => {
    const updated = [...properties];
    updated[index][field] = value;
    setProperties(updated);
  };

  const renderDefaultInput = (prop, index) => {
    const value = prop.default;
    const onChange = (val) => updateField(index, "default", val);

    switch (prop.type) {
      case "boolean":
        return (
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5" />
        );
      case "integer":
      case "float":
        return (
          <input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.valueAsNumber)} className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
        );
      case "object":
      case "list":
        return (
          <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" rows={2} />
        );
      default:
        return (
          <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
        );
    }
  };

  return (
    <div className="w-full max-w-5xl p-6 m-4 bg-gray-800 rounded-lg text-white">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="flex items-start gap-3 p-2 mb-4 bg-blue-600 rounded-lg text-sm text-white">
        <FontAwesomeIcon icon={faInfoCircle} className="text-white mt-1" />
        <p className="m-0">{description}</p>
      </div>

      <div className="grid grid-cols-[32px_10rem_12rem_10rem_1fr] gap-4 text-sm text-gray-400 mb-2 px-1">
        <span></span>
        <span>{siteL10n("Property ID")}</span>
        <span>{siteL10n("Label")}</span>
        <span>{siteL10n("Type")}</span>
        <span>{siteL10n("Default Value")}</span>
      </div>

      <div className="space-y-2">
        {properties.map((prop, index) => (
          <div key={index} className="grid grid-cols-[32px_10rem_12rem_10rem_1fr] gap-4 items-center">
            <button onClick={() => removeProperty(index)} className="text-red-400 hover:text-red-600" title={siteL10n("Remove property")}>
              <FontAwesomeIcon icon={faTrash} />
            </button>

            <input type="text" placeholder={siteL10n("Property ID")} value={prop.propertyId} onChange={(e) => updateField(index, "propertyId", e.target.value)} className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" disabled={!allowCustomId} />

            <input type="text" placeholder={siteL10n("Label")} value={prop.label} onChange={(e) => updateField(index, "label", e.target.value)} className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" />

            <select value={prop.type} onChange={(e) => updateField(index, "type", e.target.value)} className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm">
              {typeOptions.map((type) => (
                <option key={type} value={type}>{siteL10n(type)}</option>
              ))}
            </select>

            {renderDefaultInput(prop, index)}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button onClick={addProperty} className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded">
          <FontAwesomeIcon icon={faPlus} />
          {siteL10n("Add Property")}
        </button>
      </div>
    </div>
  );
};

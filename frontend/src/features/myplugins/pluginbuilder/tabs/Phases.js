import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";

export const Phases = ({ inputs, setInputs }) => {
  const siteL10n = useSiteL10n();

  const addPhase = () => {
    setInputs((prev) => ({
      ...prev,
      phases: [
        ...(prev.phases || []),
        {
          phaseId: "",
          label: "",
          steps: [],
        },
      ],
    }));
  };

  const removePhase = (index) => {
    setInputs((prev) => ({
      ...prev,
      phases: (prev.phases || []).filter((_, i) => i !== index),
    }));
  };

  const updatePhaseField = (index, field, value) => {
    setInputs((prev) => ({
      ...prev,
      phases: (prev.phases || []).map((phase, i) =>
        i === index ? { ...phase, [field]: value } : phase
      ),
    }));
  };

  const addStep = (phaseIndex) => {
    setInputs((prev) => ({
      ...prev,
      phases: (prev.phases || []).map((phase, i) =>
        i === phaseIndex
          ? { ...phase, steps: [...(phase.steps || []), { stepId: "", label: "" }] }
          : phase
      ),
    }));
  };

  const removeStep = (phaseIndex, stepIndex) => {
    setInputs((prev) => ({
      ...prev,
      phases: (prev.phases || []).map((phase, i) =>
        i === phaseIndex
          ? { ...phase, steps: (phase.steps || []).filter((_, j) => j !== stepIndex) }
          : phase
      ),
    }));
  };

  const updateStepField = (phaseIndex, stepIndex, field, value) => {
    setInputs((prev) => ({
      ...prev,
      phases: (prev.phases || []).map((phase, i) =>
        i === phaseIndex
          ? {
              ...phase,
              steps: (phase.steps || []).map((step, j) =>
                j === stepIndex ? { ...step, [field]: value } : step
              ),
            }
          : phase
      ),
    }));
  };

  return (
    <div className="w-full max-w-4xl p-6 m-4 bg-gray-800 rounded-lg text-white">
      <h3 className="text-lg font-semibold mb-4">Phases</h3>
      <div className="flex items-start gap-3 p-2 mb-4 bg-blue-900 rounded-lg text-sm text-white">
        <FontAwesomeIcon icon={faInfoCircle} className="text-white mt-1" />
        <p className="m-0">Define the game phases and their steps.</p>
      </div>

      {(inputs.phases || []).map((phase, phaseIndex) => (
        <div key={phaseIndex} className="mb-6 border border-gray-600 p-4 rounded bg-gray-700">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => removePhase(phaseIndex)} className="text-red-400 hover:text-red-600" title={siteL10n("Remove phase")}>
              <FontAwesomeIcon icon={faTrash} />
            </button>
            <input
              type="text"
              placeholder="Phase ID"
              value={phase.phaseId}
              onChange={(e) => updatePhaseField(phaseIndex, "phaseId", e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            />
            <input
              type="text"
              placeholder="Label"
              value={phase.label}
              onChange={(e) => updatePhaseField(phaseIndex, "label", e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            />
          </div>

          <div className="ml-10">
            {(phase.steps || []).map((step, stepIndex) => (
              <div key={stepIndex} className="flex items-center gap-3 mb-2">
                <button onClick={() => removeStep(phaseIndex, stepIndex)} className="text-red-300 hover:text-red-500">
                  <FontAwesomeIcon icon={faTrash} />
                </button>
                <input
                  type="text"
                  placeholder="Step ID"
                  value={step.stepId}
                  onChange={(e) => updateStepField(phaseIndex, stepIndex, "stepId", e.target.value)}
                  className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                />
                <input
                  type="text"
                  placeholder="Label"
                  value={step.label}
                  onChange={(e) => updateStepField(phaseIndex, stepIndex, "label", e.target.value)}
                  className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                />
              </div>
            ))}

            <button
              onClick={() => addStep(phaseIndex)}
              className="mt-2 flex items-center gap-2 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Step
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addPhase}
        className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
      >
        <FontAwesomeIcon icon={faPlus} />
        Add Phase
      </button>
    </div>
  );
};


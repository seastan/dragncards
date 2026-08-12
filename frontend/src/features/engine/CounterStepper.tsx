import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useFocus from "../../hooks/useFocus";
import { setTyping } from "../store/playerUiSlice";

interface Props {
  /** Authoritative value from game state. */
  backEndValue: number;
  imageUrl?: string;
  /** Localized, human-readable label (used as tooltip / aria). */
  label: string;
  disabled?: boolean;
  /** When true the input keeps focus after a debounced commit (desktop). */
  refocusAfterCommit?: boolean;
  /**
   * Stack the value above the +/- buttons instead of placing them side-by-side.
   * Used by the narrow shared (game-property) counters so the number always has
   * the full cell width and can never sit under a button.
   */
  vertical?: boolean;
  /** Commits the new value 400ms after the last change. */
  onCommit: (newValue: number, delta: number) => void;
}

/**
 * A compact -/value/+ stepper used by the TopBar counters. Edits are mirrored
 * locally for snappiness and committed (debounced) so rapid clicks coalesce
 * into a single broadcast, carrying the net delta.
 */
export const CounterStepper = React.memo(
  ({ backEndValue, imageUrl, label, disabled, refocusAfterCommit, vertical, onCommit }: Props) => {
    const dispatch = useDispatch();
    const [value, setValue] = useState<number>(backEndValue || 0);
    const [previousValue, setPreviousValue] = useState<number>(backEndValue || 0);
    const [inputRef, setInputFocus] = useFocus() as any;
    const delayBroadcast = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
      setValue(backEndValue);
      setPreviousValue(backEndValue);
    }, [backEndValue]);

    const scheduleCommit = (newValue: number) => {
      if (delayBroadcast.current) clearTimeout(delayBroadcast.current);
      delayBroadcast.current = setTimeout(() => {
        const totalDelta = newValue - previousValue;
        setPreviousValue(newValue);
        onCommit(newValue, totalDelta);
        if (refocusAfterCommit) setInputFocus();
      }, 400);
    };

    const applyValue = (newValue: number) => {
      if (Number.isNaN(newValue)) return;
      setValue(newValue);
      scheduleCommit(newValue);
    };

    const step = (delta: number) => applyValue((Number(value) || 0) + delta);

    const btnClasses =
      "flex items-center justify-center overflow-hidden rounded text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

    // The .counter-stepper* classes (css/custom-utilities.css) cap every
    // horizontal size against the stepper's own width, so the number is never
    // squeezed out by the buttons or the icon on a narrow window. Long values
    // get a smaller cap so they shrink rather than clip; the vertical variant
    // has the whole cell to itself and can afford more.
    const digits = String(value ?? "").length;
    const valueCqw = digits <= 2 ? (vertical ? 34 : 22) : digits === 3 ? (vertical ? 24 : 16) : vertical ? 18 : 12;
    const valueStyle = { "--counter-value-cqw": `${valueCqw}cqw` } as React.CSSProperties;

    const valueBox = (
      <div className="flex-1 min-w-0 flex items-center justify-center gap-0.5 overflow-hidden rounded bg-gray-900 bg-opacity-40 px-0.5 w-full h-full">
        {imageUrl && <img className="counter-stepper-icon object-contain flex-shrink-0" src={imageUrl} alt={label} />}
        <input
          className="counter-stepper-value no-spinner min-w-0 w-full bg-transparent text-center text-gray-100 font-semibold focus:outline-none"
          style={valueStyle}
          value={value}
          onChange={(e) => applyValue(Number(e.target.value))}
          type="number"
          step="1"
          disabled={disabled}
          onFocus={() => dispatch(setTyping(true))}
          onBlur={() => dispatch(setTyping(false))}
          ref={inputRef}
        />
      </div>
    );

    if (vertical) {
      return (
        <div
          className="counter-stepper flex flex-col h-full w-full items-stretch justify-center gap-0.5"
          title={label}
        >
          {valueBox}
          <div className="flex w-full gap-0.5 flex-shrink-0" style={{ height: "1.9dvh" }}>
            <button
              type="button"
              aria-label={`Decrease ${label}`}
              disabled={disabled}
              onClick={() => step(-1)}
              className={`flex-1 counter-stepper-btn-vertical ${btnClasses}`}
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <button
              type="button"
              aria-label={`Increase ${label}`}
              disabled={disabled}
              onClick={() => step(1)}
              className={`flex-1 counter-stepper-btn-vertical ${btnClasses}`}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="counter-stepper flex h-full w-full items-center justify-center gap-0.5" title={label}>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled}
          onClick={() => step(-1)}
          className={`flex-shrink-0 counter-stepper-btn ${btnClasses}`}
        >
          <FontAwesomeIcon icon={faMinus} />
        </button>

        {valueBox}

        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled}
          onClick={() => step(1)}
          className={`flex-shrink-0 counter-stepper-btn ${btnClasses}`}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    );
  }
);

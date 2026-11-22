import React, { useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useGameL10n } from "./hooks/useGameL10n";
import { useDoActionList } from "./hooks/useDoActionList";
import { dragnActionLists } from "./functions/dragnActionLists";
import { Z_INDEX } from "./functions/common";

// The round / phase / step tracker for the mobile UI: the desktop's left rail
// (SideBar) as a drawer that slides in from the left. The rail shows step
// numbers and reveals each step's name on hover, which a phone can't do, so
// this lists number and name together under each phase. Same behaviour:
//   tap a step  → go to it (dragnActionLists.setStep); the current step is a no-op
//   red badge   → the in-play cards with a trigger reminder for that step; tap
//                 to target them

const RED = "#b91c1c";   // tailwind red-700, the rail's current phase / step colour

const useTriggerMap = () => {
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
  return useMemo(() => {
    const map = {};
    Object.entries(cardById || {}).forEach(([cardId, card]) => {
      if (!card?.inPlay) return;
      Object.entries(card?.sides?.[card.currentSide]?.triggers || {}).forEach(([stepId, on]) => {
        if (on === true) (map[stepId] = map[stepId] || []).push(cardId);
      });
    });
    return map;
  }, [cardById]);
};

const StepRow = ({ stepId, triggerCardIds, isCurrent, rowRef }) => {
  const gameDef = useGameDefinition();
  const gameL10n = useGameL10n();
  const doActionList = useDoActionList();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const stepInfo = gameDef?.steps?.[stepId];
  const n = triggerCardIds?.length || 0;

  const goToStep = () => {
    // As on the rail: asking for the current step would lap the whole round.
    if (!playerN || isCurrent) return;
    doActionList(dragnActionLists.setStep(stepId, stepInfo), `Set step to ${stepId}`);
  };
  const targetTriggers = (e) => {
    e.stopPropagation();
    if (!playerN) return;
    let actionList = dragnActionLists.clearTargets();
    triggerCardIds.forEach(cardId => {
      actionList = actionList.concat([["VAR", "$ACTIVE_CARD_ID", cardId]]).concat(dragnActionLists.targetCard(cardId));
    });
    doActionList(actionList, `Target triggers for step ${stepId}`);
  };

  return (
    <div
      ref={rowRef}
      onClick={goToStep}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 38,
        padding: "3px 10px 3px 8px",
        background: isCurrent ? RED : "transparent",
        color: isCurrent ? "white" : "#e5e7eb",
        cursor: isCurrent ? "default" : "pointer",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}>
      <span style={{
        flexShrink: 0,
        minWidth: 34,
        height: 26,
        padding: "0 4px",
        boxSizing: "border-box",
        borderRadius: 4,
        background: isCurrent ? "rgba(0,0,0,0.25)" : "#374151",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 600,
      }}>{stepId}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.25 }}>{gameL10n(stepInfo?.label)}</span>
      {n > 0 &&
        <span
          onClick={targetTriggers}
          aria-label={`${n} ${n === 1 ? "trigger" : "triggers"} for step ${stepId}`}
          style={{
            flexShrink: 0,
            minWidth: 24,
            height: 24,
            borderRadius: 12,
            background: "#dc2626",
            border: "1px solid #7f1d1d",
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>{n}</span>}
    </div>
  );
};

export const MobileStepTracker = ({ open }) => {
  const gameDef = useGameDefinition();
  const gameL10n = useGameL10n();
  const currentStepId = useSelector(state => state?.gameUi?.game?.stepId);
  const round = useSelector(state => state?.gameUi?.game?.roundNumber);
  const currentPhaseId = gameDef?.steps?.[currentStepId]?.phaseId;
  const triggerMap = useTriggerMap();
  const currentRowRef = useRef(null);

  // Bring the current step into view whenever the drawer opens or the step moves.
  useEffect(() => {
    if (open) currentRowRef.current?.scrollIntoView({ block: "center" });
  }, [open, currentStepId]);

  if (!gameDef?.phaseOrder?.length) return null;
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "min(72%, 300px)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        background: "rgb(24,24,30)",
        borderRight: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "6px 0 20px rgba(0,0,0,0.6)",
        transform: open ? "translateX(0)" : "translateX(calc(-100% - 24px))",
        transition: "transform 0.2s ease-out",
        visibility: open ? "visible" : "hidden",
        zIndex: Z_INDEX.ChatHover,
        color: "white",
      }}>
      {round !== undefined && round !== null &&
        <div style={{ padding: "10px 12px 6px", fontSize: 13, color: "#9ca3af" }}>Round {round}</div>}
      {gameDef.phaseOrder.map(phaseId => {
        const phase = gameDef?.phases?.[phaseId];
        if (!phase) return null;
        const isPhase = phaseId === currentPhaseId;
        const steps = (gameDef.stepOrder || []).filter(s => gameDef?.steps?.[s]?.phaseId === phaseId);
        return (
          <div key={phaseId} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{
              padding: "8px 12px 4px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isPhase ? "#fca5a5" : "#9ca3af",
            }}>
              {gameL10n(phase.label)}
            </div>
            {steps.map(stepId => (
              <StepRow
                key={stepId}
                stepId={stepId}
                triggerCardIds={triggerMap[stepId]}
                isCurrent={stepId === currentStepId}
                rowRef={stepId === currentStepId ? currentRowRef : null}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useGameL10n } from "./hooks/useGameL10n";
import { useDoActionList } from "./hooks/useDoActionList";
import { Z_INDEX } from "./functions/common";

// With a token hotkey armed in the mobile UI, a sideways drag on a card opens
// a slider above it: +1 if the drag went right, −1 if left, then one more step
// per STEP_PX of further travel either way. Letting go adds / removes that many
// tokens (nothing at 0). A non-modifier token that can't go negative stops at
// the card's current count.

const STEP_PX = 22;
const TRACK_RANGE = 10;     // the track spans −10..+10; bigger values pin the thumb
const WIDTH = 230;

const sliderValue = (s, dx) => {
  const travel = dx - s.dx0;
  return s.sign + Math.trunc(travel / STEP_PX);
};

export const useTokenSlider = (touchAction) => {
  const gameDef = useGameDefinition();
  const doActionList = useDoActionList();
  const game = useSelector(state => state?.gameUi?.game);
  const [slide, setSlide] = useState(null);   // { cardId, rect, value, min }
  const s = useRef(null);

  const tokenType = touchAction?.actionType === "token" ? touchAction.tokenType : null;
  const tokenDef = tokenType ? gameDef?.tokens?.[tokenType] : null;

  const onCardSlide = (cardId, phase, dx, rect) => {
    if (!tokenType || !tokenDef) return;
    if (phase === "start") {
      const current = game?.cardById?.[cardId]?.tokens?.[tokenType] || 0;
      const min = (tokenDef.modifier || tokenDef.canBeNegative) ? -99 : -current;
      s.current = { cardId, rect, dx0: dx, sign: dx >= 0 ? 1 : -1, min };
      setSlide({ cardId, rect, current, min, value: Math.max(min, s.current.sign) });
      return;
    }
    if (!s.current || s.current.cardId !== cardId) return;
    const value = Math.min(99, Math.max(s.current.min, sliderValue(s.current, dx)));
    if (phase === "move") {
      setSlide(prev => (prev && prev.value !== value ? { ...prev, value } : prev));
      return;
    }
    s.current = null;
    setSlide(null);
    if (phase !== "end" || value === 0) return;
    doActionList([
      ["DEFINE", "$ACTIVE_CARD_ID", cardId],
      ["LOG", "$ALIAS_N", value > 0 ? " added " : " removed ", Math.abs(value), " ", tokenDef.name || tokenDef.label,
        Math.abs(value) === 1 ? " token" : " tokens", value > 0 ? " to " : " from ", "$ACTIVE_FACE.name", "."],
      ["INCREASE_VAL", "/cardById/$ACTIVE_CARD_ID/tokens/" + tokenType, value],
    ], `Slide ${value} ${tokenType} on card ${cardId}`);
  };

  return { onCardSlide, slide, tokenDef };
};

export const TokenSliderOverlay = ({ slide, tokenDef }) => {
  const gameL10n = useGameL10n();
  if (!slide || !tokenDef) return null;
  const { rect, value, current } = slide;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - WIDTH / 2, 8), window.innerWidth - WIDTH - 8);
  // Above the card, or below it when there isn't room above.
  const above = rect.top > 110;
  const top = above ? rect.top - 96 : rect.bottom + 8;
  const thumbFrac = (Math.max(-TRACK_RANGE, Math.min(TRACK_RANGE, value)) + TRACK_RANGE) / (2 * TRACK_RANGE);
  const shown = value > 0 ? `+${value}` : value < 0 ? `−${-value}` : "0";
  const color = value > 0 ? "#22c55e" : value < 0 ? "#ef4444" : "#e5e7eb";
  return (
    <div style={{
      position: "fixed",
      left,
      top,
      width: WIDTH,
      height: 88,
      boxSizing: "border-box",
      padding: "8px 14px 10px",
      borderRadius: 12,
      background: "rgba(17,17,22,0.94)",
      border: "1px solid rgba(255,255,255,0.15)",
      boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
      zIndex: Z_INDEX.DropdownMenu,
      pointerEvents: "none",
      color: "white",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <img alt={gameL10n(tokenDef.label)} src={tokenDef.imageUrl} style={{ width: 34, height: 34, objectFit: "contain" }}/>
        <span style={{ fontSize: 24, fontWeight: 700, color, minWidth: 44, textAlign: "center" }}>{shown}</span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>→ {current + value}</span>
      </div>
      <div style={{ position: "relative", height: 18 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 8, height: 2, background: "rgba(255,255,255,0.25)", borderRadius: 1 }}/>
        <div style={{ position: "absolute", left: "50%", top: 3, width: 2, height: 12, marginLeft: -1, background: "rgba(255,255,255,0.4)" }}/>
        <div style={{
          position: "absolute",
          top: 1,
          left: `calc(${thumbFrac * 100}% - 8px)`,
          width: 16,
          height: 16,
          borderRadius: 8,
          background: color,
          border: "2px solid white",
          boxSizing: "border-box",
          transition: "left 60ms linear",
        }}/>
      </div>
    </div>
  );
};

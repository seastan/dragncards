import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useGameL10n } from "./hooks/useGameL10n";
import { useDoActionList } from "./hooks/useDoActionList";
import { useVisibleFace } from "./hooks/useVisibleFace";
import { useVisibleFaceSrc } from "./hooks/useVisibleFaceSrc";

// Top half of the mobile card sheet (MobileMenuSheet): the card, plus a −/+
// adjuster for each token the card can carry — the same tokens, and the same
// behaviour, as the desktop's hold-Space token arrows (Tokens / Token):
//   which tokens: gameDef.cardTypes[<side A type>].tokens
//   a tap updates the shown count at once; the change is sent ~0.5s after the
//   last tap as one SET plus one log line
//   a token can't go below 0 unless its def allows canBeNegative
//
// Portrait card: card against the left edge, tokens in a column to its right.
// Landscape card: card along the top, tokens below it in three rows on an
// upright screen (two if the screen is wider than tall).

const BTN = 28;      // − / + button size
const ICON = 26;     // token image size

const useCardTokenTypes = (cardId) => {
  const gameDef = useGameDefinition();
  const sideAType = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.sides?.A?.type);
  return (gameDef?.cardTypes?.[sideAType]?.tokens || []).filter(t => gameDef?.tokens?.[t]);
};

const useIsLandscape = (cardId) => {
  const gameDef = useGameDefinition();
  const face = useVisibleFace(cardId);
  const w = face?.width ?? gameDef?.cardBacks?.[face?.name]?.width;
  const h = face?.height ?? gameDef?.cardBacks?.[face?.name]?.height;
  return !!(w && h && w > h * 1.05);
};

const StepButton = ({ label, onClick }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="mobile-sheet-button"
    style={{
      width: BTN,
      height: BTN,
      flexShrink: 0,
      borderRadius: 5,
      border: "1px solid #4b5563",
      color: "#e5e7eb",
      fontSize: 17,
      fontWeight: 500,
      lineHeight: 1,
      padding: 0,
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
    }}>
    {label}
  </button>
);

const TokenAdjuster = ({ cardId, tokenType }) => {
  const gameDef = useGameDefinition();
  const gameL10n = useGameL10n();
  const doActionList = useDoActionList();
  const tokenDef = gameDef?.tokens?.[tokenType];
  const tokenValue = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.tokens?.[tokenType]) || 0;
  const [amount, setAmount] = useState(tokenValue);
  const timer = useRef(null);

  // Follow the game's value unless a local change is still waiting to be sent.
  useEffect(() => { if (!timer.current) setAmount(tokenValue); }, [tokenValue]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const step = (delta) => {
    const next = (!tokenDef?.canBeNegative && amount + delta < 0) ? 0 : amount + delta;
    setAmount(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      const totalDelta = next - tokenValue;
      if (totalDelta === 0) return;
      doActionList([
        ["LOG", "$ALIAS_N", totalDelta >= 0 ? " added " : " removed ", Math.abs(totalDelta), " ", tokenDef.label, " token",
          Math.abs(totalDelta) > 1 ? "s" : "", totalDelta >= 0 ? " to " : " from ", `$GAME.cardById.${cardId}.currentFace.name`, "."],
        ["SET", `/cardById/${cardId}/tokens/${tokenType}`, next],
      ], `Mobile card sheet: change token ${tokenType} on card ${cardId} by ${totalDelta}`);
    }, 500);
  };

  const shown = tokenDef?.modifier && amount >= 0 ? `+${amount}` : `${amount}`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <StepButton label="−" onClick={() => step(-1)}/>
      <div
        title={gameL10n(tokenDef?.label)}
        style={{ position: "relative", width: ICON + 14, height: ICON, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <img alt={gameL10n(tokenDef?.label) || tokenType} src={tokenDef?.imageUrl} style={{ width: ICON, height: ICON, objectFit: "contain", opacity: amount === 0 ? 0.45 : 1 }}/>
        <span style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "white",
          textShadow: "0 0 3px #000, 0 0 3px #000, 0 0 6px #000",
          pointerEvents: "none",
        }}>{shown}</span>
      </div>
      <StepButton label="+" onClick={() => step(1)}/>
    </div>
  );
};

const CardFace = ({ cardId, style }) => {
  const src = useVisibleFaceSrc(cardId);
  if (!src?.src) return null;
  return (
    <img
      alt=""
      src={src.src}
      onError={(e) => { if (src.default && e.currentTarget.src !== src.default) e.currentTarget.src = src.default; }}
      style={{ objectFit: "contain", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.7)", ...style }}
    />
  );
};

// Fills its container (the sheet's top half). onImageTap: tapping the card
// itself (not the token controls) closes the sheet, as before.
export const MobileCardWithTokens = ({ cardId, onImageTap }) => {
  const tokenTypes = useCardTokenTypes(cardId);
  const landscape = useIsLandscape(cardId);
  const stop = (e) => e.stopPropagation();

  if (tokenTypes.length === 0) {
    return (
      <div onClick={onImageTap} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CardFace cardId={cardId} style={{ maxWidth: "100%", maxHeight: "100%" }}/>
      </div>
    );
  }

  if (landscape) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
        <div onClick={onImageTap} style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <CardFace cardId={cardId} style={{ maxWidth: "100%", maxHeight: "100%" }}/>
        </div>
        {/* Scrolls sideways when there are more columns than fit. The grid sits
            inside at its natural width and centres itself with auto margins,
            which (unlike justify-content: center) never pushes the first
            column out past the scrollable start. */}
        <div onClick={stop} style={{ flex: "0 0 auto", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          <div style={{
            display: "grid",
            // Three rows on an upright screen (there's height to spare under a
            // landscape card), two when the screen is wider than tall.
            gridTemplateRows: `repeat(${window.innerHeight > window.innerWidth ? 3 : 2}, auto)`,
            gridAutoFlow: "column",
            gridAutoColumns: "max-content",
            columnGap: 14,
            rowGap: 6,
            width: "max-content",
            margin: "0 auto",
          }}>
            {tokenTypes.map(t => <TokenAdjuster key={t} cardId={cardId} tokenType={t}/>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", gap: 12, minHeight: 0 }}>
      <div onClick={onImageTap} style={{ flex: "0 1 auto", minWidth: 0, height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
        <CardFace cardId={cardId} style={{ maxHeight: "100%", maxWidth: "100%" }}/>
      </div>
      <div
        onClick={stop}
        style={{
          flex: "0 0 auto",
          height: "100%",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
          justifyContent: "safe center",
          gap: 6,
          paddingRight: 2,
        }}>
        {tokenTypes.map(t => <TokenAdjuster key={t} cardId={cardId} tokenType={t}/>)}
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useFormatLabelsInText } from "./MessageLine";
import { useCardDb } from "../engine/hooks/useCardDb";
import { useGameDefinition } from "../engine/hooks/useGameDefinition";
import useProfile from "../../hooks/useProfile";
import { getPlayerIColor } from "../engine/functions/common";

const CardLinkWithHover = ({ label, imageUrl }) => {
  const [mousePos, setMousePos] = useState(null);

  return (
    <span
      className="card-hover"
      style={{ position: "relative", display: "inline" }}
      onMouseEnter={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setMousePos(null)}
    >
      <span style={{ textDecoration: "underline", cursor: "default", color: "inherit" }}>
        {label}
      </span>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={label}
          className="card-hover-img"
          style={mousePos ? {
            position: "fixed",
            right: window.innerWidth - mousePos.x + 12,
            ...(mousePos.y < window.innerHeight / 2
              ? { top: mousePos.y }
              : { bottom: window.innerHeight - mousePos.y }),
            height: "42dvh",
            zIndex: 99999,
            pointerEvents: "none",
            borderRadius: "4px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
          } : { display: "none" }}
        />
      )}
    </span>
  );
};

const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const resolveCardImage = (cardDb, urlPrefix, dbId, side) => {
  const imageUrl = cardDb?.[dbId]?.[side]?.imageUrl;
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : urlPrefix + imageUrl;
};

const splitByTokens = (text) => {
  const TOKEN_REGEX = /((?:img|link):[^\s]+)/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isToken: false });
    }
    segments.push({ text: match[0], isToken: true });
    lastIndex = TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isToken: false });
  }

  return segments;
};

const renderToken = (token, key, { cardDb, cardById, urlPrefix, defaultImgHeight }) => {
  if (token.startsWith("img:")) {
    const rest = token.slice(4);

    if (rest.startsWith("card:")) {
      const cardPart = rest.slice(5);
      const sizeMatch = cardPart.match(/^(.+):(\d+)$/);
      const cardId = sizeMatch ? sizeMatch[1] : cardPart;
      const height = sizeMatch ? `${sizeMatch[2]}dvh` : defaultImgHeight;

      const imageUrl = cardDb?.[cardId]?.A?.imageUrl;
      if (!imageUrl) {
        return <span key={key}>[unknown card]</span>;
      }
      const fullUrl = imageUrl.startsWith("http") ? imageUrl : urlPrefix + imageUrl;
      if (!isValidUrl(fullUrl)) {
        return <span key={key}>[invalid image url]</span>;
      }
      return <img key={key} src={fullUrl} style={{ height, verticalAlign: "middle" }} alt="" />;
    } else {
      const sizeMatch = rest.match(/^(.+):(\d+)$/);
      const url = sizeMatch ? sizeMatch[1] : rest;
      const height = sizeMatch ? `${sizeMatch[2]}dvh` : defaultImgHeight;

      if (!isValidUrl(url)) {
        return <span key={key}>[invalid image url]</span>;
      }
      return <img key={key} src={url} style={{ height, verticalAlign: "middle" }} alt="" />;
    }
  }

  // link:cardId:<gameCardId>:<side?> — looks up a card currently in the game by its in-game ID
  if (token.startsWith("link:cardId:")) {
    const rest = token.slice(12);
    const colonIdx = rest.indexOf(":");
    const gameCardId = colonIdx !== -1 ? rest.slice(0, colonIdx) : rest;
    const side = colonIdx !== -1 ? rest.slice(colonIdx + 1) : "A";

    const card = cardById?.[gameCardId];
    const imageUrl = card?.sides?.[side]?.imageUrl;
    const fullUrl = imageUrl
      ? (imageUrl.startsWith("http") ? imageUrl : urlPrefix + imageUrl)
      : null;
    const cardName = card?.sides?.[side]?.name || gameCardId;

    if (!fullUrl || !isValidUrl(fullUrl)) {
      return <span key={key} style={{ textDecoration: "underline" }}>{cardName}</span>;
    }
    return <CardLinkWithHover key={key} label={cardName} imageUrl={fullUrl} />;
  }

  // link:cardDbId:<dbId>:<side?> — looks up a card directly in the card DB by its database ID
  if (token.startsWith("link:cardDbId:")) {
    const rest = token.slice(14);
    const colonIdx = rest.indexOf(":");
    const dbId = colonIdx !== -1 ? rest.slice(0, colonIdx) : rest;
    const side = colonIdx !== -1 ? rest.slice(colonIdx + 1) : "A";

    const fullUrl = resolveCardImage(cardDb, urlPrefix, dbId, side);
    const cardName = cardDb?.[dbId]?.[side]?.name || dbId;

    if (!fullUrl || !isValidUrl(fullUrl)) {
      return <span key={key} style={{ textDecoration: "underline" }}>{cardName}</span>;
    }
    return <CardLinkWithHover key={key} label={cardName} imageUrl={fullUrl} />;
  }

  if (token.startsWith("link:")) {
    const rest = token.slice(5);
    // Skip past the protocol's :// before looking for the label separator colon
    const protocolEnd = rest.indexOf("://");
    const searchFrom = protocolEnd !== -1 ? protocolEnd + 3 : 0;
    const labelSepIdx = rest.indexOf(":", searchFrom);
    const url = labelSepIdx !== -1 ? rest.slice(0, labelSepIdx) : rest;
    const label = labelSepIdx !== -1 ? rest.slice(labelSepIdx + 1) : rest;

    if (!isValidUrl(url)) {
      return <span key={key}>[invalid link url]</span>;
    }
    return (
      <a key={key} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "inherit" }}>
        {label}
      </a>
    );
  }

  return <span key={key}>{token}</span>;
};

const applyPlayerAliasColoring = (text, keyPrefix) => {
  const regex = /\[player\d+\/[^\]]+\]/g;
  const parts = text.split(regex);
  const matches = text.match(regex) || [];

  return parts.reduce((acc, part, index) => {
    acc.push(<span key={`${keyPrefix}-text-${index}`}>{part}</span>);

    if (index < matches.length) {
      const match = matches[index];
      const playerIdentifier = match.match(/\[player\d+/)[0].slice(1);
      const color = getPlayerIColor(playerIdentifier);
      const newMatch = match.replace("[player", "[");
      acc.push(
        <span key={`${keyPrefix}-player-${index}`} style={{ color }}>
          {newMatch}
        </span>
      );
    }

    return acc;
  }, []);
};

export const useRichText = () => {
  const formatLabelsInText = useFormatLabelsInText();
  const cardDb = useCardDb();
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
  const gameDef = useGameDefinition();
  const user = useProfile();
  const language = user?.language || "English";

  const urlPrefix =
    gameDef?.imageUrlPrefix?.[language] ||
    gameDef?.imageUrlPrefix?.Default ||
    "";

  return (text, options = {}) => {
    if (!text) return null;

    const context = options.context || "log";
    const defaultImgHeight = context === "prompt" ? "3dvh" : "2dvh";

    // Step 1: Label replacement (id:label → localized text)
    const labelsFormatted = formatLabelsInText(text);

    // Step 2: Split by rich tokens
    const segments = splitByTokens(labelsFormatted);

    // Steps 3 & 4: Render each segment
    const elements = [];
    segments.forEach((segment, segIdx) => {
      if (segment.isToken) {
        elements.push(
          renderToken(segment.text, `token-${segIdx}`, { cardDb, cardById, urlPrefix, defaultImgHeight })
        );
      } else {
        elements.push(...applyPlayerAliasColoring(segment.text, `seg-${segIdx}`));
      }
    });

    return elements;
  };
};

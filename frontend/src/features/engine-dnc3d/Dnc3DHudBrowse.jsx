import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useGameL10n } from '../engine/hooks/useGameL10n';
import { useGameDefinition } from '../engine/hooks/useGameDefinition';
import { useBrowseTopN } from '../engine/hooks/useBrowseTopN';
import { useDoActionList } from '../engine/hooks/useDoActionList';
import { usePlayerN } from '../engine/hooks/usePlayerN';
import { setValues } from '../store/gameUiSlice';
import { setDropdownMenu, setTyping } from '../store/playerUiSlice';
import { getParentCardsInGroup } from '../engine/functions/common';

const isNormalInteger = (val) => {
  const n = Math.floor(Number(val));
  return n !== Infinity && n === val && n >= 0;
};

export const Dnc3DHudBrowse = ({ onFilterChange }) => {
  const dispatch    = useDispatch();
  const gameL10n    = useGameL10n();
  const gameDef     = useGameDefinition();
  const playerN     = usePlayerN();
  const browseTopN  = useBrowseTopN();
  const doActionList = useDoActionList();

  const [searchForProperty, setSearchForProperty] = useState('All');
  const [searchForText, setSearchForText]         = useState('');

  const groupId        = useSelector(s => s?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.id);
  const browseGroupTopN = useSelector(s => s?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.topN);
  const group          = useSelector(s => s?.gameUi?.game?.groupById?.[groupId]);
  const game           = useSelector(s => s?.gameUi?.game);

  useEffect(() => {
    setSearchForProperty('All');
    setSearchForText('');
  }, [groupId]);

  // Mirror Browse.js filtering logic, producing an array of visible stack indices.
  const filteredStackIndices = useMemo(() => {
    if (!group || !game || !groupId) return [];
    const stackIds    = group.stackIds || [];
    const numStacks   = stackIds.length;
    const parentCards = getParentCardsInGroup(game, groupId);

    let topNint = isNormalInteger(browseGroupTopN) ? parseInt(browseGroupTopN) : numStacks;
    if (topNint < 0 || topNint > numStacks) topNint = numStacks;
    let indices = [...Array(topNint).keys()];

    if (searchForProperty === 'Other') {
      indices = indices.filter(i => {
        const val    = parentCards[i]?.sides?.A?.[gameDef?.browse?.filterPropertySideA];
        const isOther = !gameDef?.browse?.filterValuesSideA?.includes(val);
        const visible = parentCards[i]?.peeking?.[playerN] || parentCards[i]?.currentSide === 'A';
        return stackIds[i] && visible && isOther;
      });
    } else if (searchForProperty !== 'All') {
      indices = indices.filter(i =>
        stackIds[i] &&
        parentCards[i]?.sides?.A?.[gameDef?.browse?.filterPropertySideA] === searchForProperty &&
        (parentCards[i]?.peeking?.[playerN] || parentCards[i]?.currentSide === 'A')
      );
    }

    if (searchForText) {
      const props = gameDef?.browse?.textPropertiesSideA || [];
      indices = indices.filter(i => {
        const card    = parentCards[i]?.sides?.A;
        const visible = parentCards[i]?.peeking?.[playerN] || parentCards[i]?.currentSide === 'A';
        return stackIds[i] && visible &&
          props.some(p => card?.[p]?.toLowerCase().includes(searchForText.toLowerCase()));
      });
    }

    return indices;
  }, [group, game, groupId, browseGroupTopN, searchForProperty, searchForText, gameDef, playerN]);

  useEffect(() => {
    onFilterChange?.(filteredStackIndices);
  }, [filteredStackIndices, onFilterChange]);

  if (!group || !groupId) return null;

  const stackIds = group.stackIds || [];
  const numStacks = stackIds.length;

  const isPeeking = stackIds.some(stackId => {
    const cardId = game?.stackById?.[stackId]?.cardIds?.[0];
    return cardId && game?.cardById?.[cardId]?.peeking?.[playerN];
  });

  const filterButtons = gameDef?.browse?.filterValuesSideA;
  if (!filterButtons) return null;
  const allFilterButtons = ['All', ...filterButtons, 'Other'];
  const pairedFilterButtons = allFilterButtons.reduce((acc, curr, i) => {
    if (i % 2 === 0) acc.push([curr, allFilterButtons[i + 1]]);
    return acc;
  }, []);

  const stopPeekingTopCard = () => {
    if (!numStacks) return;
    const cardId = game?.stackById?.[stackIds[0]]?.cardIds?.[0];
    if (!cardId) return;
    dispatch(setValues({ updates: [['game', 'cardById', cardId, 'peeking', playerN, false]] }));
  };

  const handleCloseClick = (option) => {
    if (option === 'shuffle') {
      doActionList([
        ['LOG', '$ALIAS_N', ' closed ', gameL10n(group.label) + '.'],
        ['STOP_LOOKING', '$PLAYER_N'],
        ['LOG', '$ALIAS_N', ' shuffled ', gameL10n(group.label) + '.'],
        ['SHUFFLE_GROUP', groupId],
      ], 'Closed and shuffled ' + group.label);
      if (group?.onCardEnter?.currentSide === 'B') stopPeekingTopCard();
    } else if (option === 'order') {
      doActionList([
        ['LOG', '$ALIAS_N', ' closed ', gameL10n(group.label) + '.'],
        ['STOP_LOOKING', '$PLAYER_N'],
      ], 'Closed ' + group.label);
      if (group?.onCardEnter?.currentSide === 'B') stopPeekingTopCard();
    } else if (option === 'peeking') {
      doActionList([
        ['LOG', '$ALIAS_N', ' is still peeking at ', gameL10n(group.label) + '.'],
        ['STOP_LOOKING', '$PLAYER_N', 'keepPeeking'],
      ], 'Kept peeking at ' + group.label);
    }
  };

  const handleBarsClick = (e) => {
    e.stopPropagation();
    dispatch(setDropdownMenu({ type: 'group', group, title: gameL10n(gameDef?.groups?.[groupId]?.label) }));
  };

  const darkBg  = '#111827';
  const midBg   = '#1f2937';
  const hoverBg = '#374151';

  const btnStyle = (active) => ({
    padding: '5px 10px', borderRadius: '5px', cursor: 'pointer',
    background: active ? '#7f1d1d' : midBg,
    border: active ? '1px solid #ef4444' : '1px solid transparent',
    color: 'white', fontSize: '12px', textAlign: 'center', flex: '1 1 0',
    transition: 'background 0.1s',
  });

  const closeBtnStyle = {
    padding: '5px 10px', borderRadius: '5px', cursor: 'pointer',
    background: midBg, border: '1px solid transparent',
    color: 'white', fontSize: '12px', textAlign: 'center', width: '100%',
    transition: 'background 0.1s',
  };

  return (
    <div style={{
      position: 'absolute', bottom: '8px', left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(22, 22, 28, 0.97)', color: 'white',
      borderRadius: '10px', fontFamily: 'system-ui', fontSize: '13px',
      zIndex: 10000, width: '640px', maxWidth: '92vw',
      boxShadow: '0 4px 24px rgba(0,0,0,0.85)', userSelect: 'none',
      border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '7px 12px',
        background: 'rgba(50, 50, 58, 0.9)',
        borderTopLeftRadius: '10px', borderTopRightRadius: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{gameL10n(group.label)}</span>
        <div
          onClick={handleBarsClick}
          style={{
            cursor: 'pointer', fontSize: '11px', padding: '3px 8px',
            borderRadius: '4px', background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          More Options
        </div>
        <div style={{ flex: '1 1 auto' }} />
        <label style={{ fontSize: '11px', opacity: 0.6, flexShrink: 0 }}>Looking at side:</label>
        {[['A', 'All'], ['B', 'None']].map(([label, topNValue]) => {
          const active = label === 'A' ? isPeeking : !isPeeking;
          return (
            <div key={label} onClick={() => browseTopN(groupId, topNValue)} style={{
              padding: '3px 12px', borderRadius: '4px', cursor: 'pointer',
              background: active ? '#1d4ed8' : 'rgba(255,255,255,0.08)',
              border: active ? '1px solid #3b82f6' : '1px solid transparent',
              fontSize: '13px', fontWeight: 'bold', flexShrink: 0, transition: 'background 0.1s',
            }}>
              {label}
            </div>
          );
        })}
      </div>

      {/* Search row */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          type="text"
          placeholder="🔍  Search cards..."
          value={searchForText}
          style={{
            background: darkBg, border: 'none', color: 'white',
            padding: '5px 10px', borderRadius: '4px', fontSize: '12px',
            outline: 'none', cursor: 'text', width: '100%', boxSizing: 'border-box', opacity: 0.9,
          }}
          onFocus={() => dispatch(setTyping(true))}
          onBlur={() => dispatch(setTyping(false))}
          onChange={e => setSearchForText(e.target.value)}
        />
      </div>

      {/* Body: filter buttons + close actions */}
      <div style={{ display: 'flex', gap: '0', padding: '8px 10px', alignItems: 'flex-start' }}>
        {/* Filter button grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 auto' }}>
          {pairedFilterButtons.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', gap: '4px' }}>
              {row.map((item, itemIndex) => item != null && (
                <div
                  key={itemIndex}
                  style={btnStyle(searchForProperty === item)}
                  onClick={() => setSearchForProperty(item)}
                  onMouseEnter={e => { if (searchForProperty !== item) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { if (searchForProperty !== item) e.currentTarget.style.background = midBg; }}
                >
                  {gameL10n(item)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 10px', alignSelf: 'stretch' }} />

        {/* Close actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '0 0 auto', width: '100px' }}>
          <div style={{ fontSize: '10px', opacity: 0.5, textAlign: 'center', marginBottom: '1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Close &amp;
          </div>
          {[['Shuffle', 'shuffle'], ['Keep order', 'order'], ['Keep peeking', 'peeking']].map(([label, opt]) => (
            <div
              key={opt}
              style={closeBtnStyle}
              onClick={() => handleCloseClick(opt)}
              onMouseEnter={e => e.currentTarget.style.background = hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = midBg}
            >
              {gameL10n(label)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

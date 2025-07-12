import React, { useState } from 'react';
import { CardData } from './tabs/CardData';
import { CardTypes } from './tabs/CardTypes';
import { useSiteL10n } from '../../../hooks/useSiteL10n';
import { CardBacks } from './tabs/CardBacks';
import { GameBasics } from './tabs/GameBasics';
import { Groups } from './tabs/Groups';
import { FaceProperties } from './tabs/FaceProperties';
import { CardProperties } from './tabs/CardProperties';
import { PlayerProperties } from './tabs/PlayerProperties';
import { GameProperties } from './tabs/GameProperties';
import Layout from './tabs/Layout';
import { Deckbuilder } from './tabs/Deckbuilder';
import { Phases } from './tabs/Phases';
import { Tokens } from './tabs/Tokens';
import { ExportGameDefinition } from './tabs/ExportGameDefinition';
import { Instructions } from './tabs/Instructions';

const tabs = [
  'Instructions',
  'Card Data',
  'Card Types',
  'Card Backs',
  'Game Basics',
  'Groups',
  'Face Properties',
  'Card Properties',
  'Player Properties',
  'Game Properties',
  'Deckbuilder',
  'Layout',
  'Phases',
  'Tokens',
  'Export Game Definition'
];

const initialInputs = {
  backgroundUrl: "https://dragncards-core.s3.us-east-1.amazonaws.com/dragncards_logo_background.jpg",
  minPlayers: 2,
  maxPlayers: 2,
};

export default function PluginBuilder() {
  const siteL10n = useSiteL10n();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [inputs, setInputs] = useState(initialInputs);
  const [maxUnlockedTabIndex, setMaxUnlockedTabIndex] = useState(0); // NEW

  const exportJsonFiles = () => {
    Object.entries(inputs).forEach(([key, value]) => {
      const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${key}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const showTab = (key) => {
    switch (key) {
      case 'Instructions': return <Instructions />;
      case 'Card Data': return <CardData inputs={inputs} setInputs={setInputs} />;
      case 'Card Types': return <CardTypes inputs={inputs} setInputs={setInputs} />;
      case 'Card Backs': return <CardBacks inputs={inputs} setInputs={setInputs} />;
      case 'Game Basics': return <GameBasics inputs={inputs} setInputs={setInputs} />;
      case 'Groups': return <Groups inputs={inputs} setInputs={setInputs} />;
      case 'Face Properties': return <FaceProperties inputs={inputs} setInputs={setInputs} />;
      case 'Card Properties': return <CardProperties inputs={inputs} setInputs={setInputs} />;
      case 'Player Properties': return <PlayerProperties inputs={inputs} setInputs={setInputs} />;
      case 'Game Properties': return <GameProperties inputs={inputs} setInputs={setInputs} />;
      case 'Layout': return <Layout inputs={inputs} setInputs={setInputs} />;
      case 'Deckbuilder': return <Deckbuilder inputs={inputs} setInputs={setInputs} />;
      case 'Phases': return <Phases inputs={inputs} setInputs={setInputs} />;
      case 'Tokens': return <Tokens inputs={inputs} setInputs={setInputs} />;
      case 'Export Game Definition': return <ExportGameDefinition inputs={inputs} />;
      default: return null;
    }
  };

  const handleTabClick = (label, index) => {
    const isBeforeCardData = index <= tabs.indexOf('Card Data');
    const isCardDbReady = !!inputs.cardDb;
    const isUnlocked = index <= maxUnlockedTabIndex + 1;
    const isAllowed =
      isBeforeCardData || (isCardDbReady && isUnlocked);

    if (!isAllowed) return;

    setActiveTab(label);
    if (index === maxUnlockedTabIndex + 1) {
      setMaxUnlockedTabIndex(index);
    }
  };

  return (
    <div className="text-white overflow-y-auto" style={{ display: 'flex', height: '100vh' }}>
      <aside className="w-80 overflow-y-scroll border-r border-gray-600">
        <ul>
          {tabs.map((label, index) => {
            const isActive = activeTab === label;
            const isBeforeCardData = index <= tabs.indexOf('Card Data');
            const isCardDbReady = !!inputs.cardDb;
            const isUnlocked = index <= maxUnlockedTabIndex + 1;
            const isAllowed = isBeforeCardData || (isCardDbReady && isUnlocked);
            const isDisabled = !isAllowed;

            return (
              <li
                key={label}
                onClick={() => handleTabClick(label, index)}
                className={`
                  ${isActive ? 'bg-red-800' : index % 2 === 0 ? 'bg-gray-600' : 'bg-gray-700'}
                  ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  text-white px-4 py-2
                `}
              >
                {label}
              </li>
            );
          })}
        </ul>
      </aside>
      <div className="w-full p-4">
        {activeTab && showTab(activeTab)}
      </div>
    </div>
  );
}

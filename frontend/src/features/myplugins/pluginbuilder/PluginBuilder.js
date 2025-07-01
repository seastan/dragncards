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

const tabs = [
  { 
    label: 'Instructions', 
    fields: [] 
  },
  { 
    label: 'Card Data', 
    fields: [] 
  },
  { 
    label: 'Card Types', 
    fields: [] 
  },
  { 
    label: 'Card Backs', 
    fields: [] 
  },
  { 
    label: 'Game Basics', 
    fields: [] 
  },
  { 
    label: 'Groups', 
    fields: [] 
  },
  { 
    label: 'Face Properties', 
    fields: [] 
  },
  { 
    label: 'Card Properties', 
    fields: [] 
  },
  { 
    label: 'Player Properties', 
    fields: [] 
  },
  { 
    label: 'Game Properties', 
    fields: [] 
  },
  { 
    label: 'Deckbuilder', 
    fields: [] 
  },
  { 
    label: 'Layout', 
    fields: [] 
  },
  { 
    label: 'Phases', 
    fields: [] 
  },
  { 
    label: 'Tokens', 
    fields: [] 
  },
  { 
    label: 'Export Game Definition', 
    fields: [] 
  }
];


const initialInputs = {
  'backgroundUrl': "https://dragncards-core.s3.us-east-1.amazonaws.com/dragncards_logo_background.jpg",
  'minPlayers': 2,
  'maxPlayers': 2,
}

export default function PluginBuilder() {

  const siteL10n = useSiteL10n();
  const [activeTab, setActiveTab] = useState(tabs[1].label);
  const [inputs, setInputs] = useState(initialInputs);

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
      case 'Instructions':
        return <div>Instructions content goes here.</div>;
      case 'Card Data':
        return <CardData inputs={inputs} setInputs={setInputs} />;
      case 'Card Types':
        return <CardTypes inputs={inputs} setInputs={setInputs} />;
      case 'Card Backs':
        return <CardBacks inputs={inputs} setInputs={setInputs} />;
      case 'Game Basics':
        return <GameBasics inputs={inputs} setInputs={setInputs} />;
      case 'Groups':
        return <Groups inputs={inputs} setInputs={setInputs} />;
      case 'Face Properties':
        return <FaceProperties inputs={inputs} setInputs={setInputs} />;
      case 'Card Properties':
        return <CardProperties inputs={inputs} setInputs={setInputs} />;
      case 'Player Properties':
        return <PlayerProperties inputs={inputs} setInputs={setInputs} />;
      case 'Game Properties':
        return <GameProperties inputs={inputs} setInputs={setInputs} />;
      case 'Layout':
        return <Layout inputs={inputs} setInputs={setInputs} />;
      case 'Deckbuilder':
        return <Deckbuilder inputs={inputs} setInputs={setInputs} />;
      case 'Phases':
        return <Phases inputs={inputs} setInputs={setInputs} />;
      case 'Tokens':
        return <Tokens inputs={inputs} setInputs={setInputs} />;
      case 'Export Game Definition':
        return <ExportGameDefinition inputs={inputs} />;
    }
    // Add other cases for different tabs as needed
    return null;
  };

  return (
    <div className='text-white overflow-y-auto' style={{ display: 'flex', height: '100vh' }}>
      <aside className='w-80' style={{ overflowY: 'scroll', borderRight: '1px solid #ccc' }}>
        <ul>
          {tabs.map((obj, index) => (
            <li
              key={obj.label}
              onClick={() => setActiveTab(obj.label)}
              className={`${activeTab === obj.label ? 'bg-gray-800' : index % 2 === 0 ? 'bg-gray-600' : 'bg-gray-700'} text-white`}
              style={{
                padding: '10px',
                cursor: 'pointer'
              }}
            >
              {obj.label}
            </li>
          ))}
        </ul>
      </aside>
      <div className="w-full">
        {activeTab && showTab(activeTab)}
      </div>
    </div>
  );
}

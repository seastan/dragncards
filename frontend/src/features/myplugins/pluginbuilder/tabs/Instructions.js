import React from 'react';
import { useSiteL10n } from '../../../../hooks/useSiteL10n';


export const Instructions = () => {
    const siteL10n = useSiteL10n();

  return (
    <div className="max-w-3xl p-6 m-4 bg-gray-800 rounded-lg">
      This page will guide you through the creation of a basic DragnCards plugin for a card game. Not all features available in DragnCards will be available here, as this is just to get you started.
      <br />
      <br />
      At the end of this process, you will export game definition files that can be used as-is. However, if you want to add additional features, such as multiple layouts, pre-built decks, automation, etc. you will need to implement them yourself using the&nbsp;
      <a
        href="https://github.com/seastan/dragncards/wiki/Plugin-Documentation"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline"
      >
        DragnCards API
      </a>  and the text editor of your choice.
      <br />
    </div>
  );
}
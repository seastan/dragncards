import React from "react";
import { MenuBar } from "../../components/basic/Menu";
import { TopBarMenu } from "./TopBarMenu";
import { TopBarView } from "./TopBarView";
import { TopBarBuilder } from "./TopBarBuilder";
import { TopBarDataContainer } from "./TopBarDataContainer";

export const TopBar = React.memo(() => {
  return (
    <div className="h-full flex items-stretch bg-gray-800 border-b border-gray-700 text-gray-200">
      <MenuBar className="flex-shrink-0 border-r border-gray-700">
        <TopBarMenu />
        <TopBarView />
        <TopBarBuilder />
      </MenuBar>
      <div className="flex-1 min-w-0 h-full">
        <TopBarDataContainer />
      </div>
    </div>
  );
});

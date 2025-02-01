import React from "react";
import { Browse } from "./Browse";
import "../../css/custom-misc.css"; 
import { TableRegion } from "./TableRegion";
import { useLayout } from "./hooks/useLayout";
import { TableChat } from "./TableChat";
import { TableButton } from "./TableButton";
import { TextBox } from "./TextBox";
import { Prompts } from "./Prompts";
import { Alert } from "./Alert";
import { useFormatGroupId } from "./hooks/useFormatGroupId";
import { Status } from "./Status";

export const TableLayout = React.memo(({onDragEnd}) => {
  const layout = useLayout();

  const formatGroupId = useFormatGroupId();
  console.log("Rendering TableLayout", layout);

  if (!layout) return;

  return (
    <>
      <Browse/>
      {/* Table Regions */}
      {layout.regions &&
        Object.keys(layout?.regions).map((regionId, regionIndex) => {
          const region = layout.regions[regionId];
          const formattedGroupId = formatGroupId(region.groupId);
          const formattedRegion = {...region, id: regionId, groupId: formattedGroupId};
          if (formattedRegion?.visible === false) return;
          return(
            <TableRegion
              key={regionIndex}
              region={formattedRegion}
              onDragEnd={onDragEnd}
            />
          )
        })
      }
      {/* Table Buttons */}
      {layout.tableButtons &&
        Object.keys(layout?.tableButtons).map((tableButtonId, buttonIndex) => {
          const tableButton = layout.tableButtons[tableButtonId];
          if (tableButton.visible === false) return;
          return(
            <TableButton 
              key={buttonIndex}
              tableButton={tableButton}
            />
          )
        })
      }
      {/* Text Boxes */}
      {layout.textBoxes &&
        Object.keys(layout.textBoxes).map((textBoxId, _index) => {
          const textBoxLayoutInfo = layout.textBoxes[textBoxId];
          if (textBoxLayoutInfo.visible === false) return;
          return(
            <TextBox 
              key={textBoxId}
              textBoxLayoutInfo={textBoxLayoutInfo}
            />
          )
        })
      }
        
      <TableChat region={layout.chat}/>
      <Prompts/>
      <Alert/>
      <Status/>

    </>
  )
})

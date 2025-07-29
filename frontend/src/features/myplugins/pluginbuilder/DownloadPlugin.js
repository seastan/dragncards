import JSZip from "jszip";
import { saveAs } from "file-saver";

export const downloadGameDefinitionAsZip = async (gameDef) => {
  const zip = new JSZip();
  Object.entries(gameDef).forEach(([key, value]) => {
    const jsonString = JSON.stringify({ [key]: value }, null, 2);
    zip.file(`${key}.json`, jsonString);
  });

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${gameDef.pluginName}_game_definition.zip`);

};
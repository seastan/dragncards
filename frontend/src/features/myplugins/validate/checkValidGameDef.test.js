
import fs from 'fs';
import util from 'util';
import path from 'path';
import { validateSchema } from './validateGameDef';
import { getGameDefSchema } from './getGameDefSchema';
import { mergeJSONs } from '../uploadPluginFunctions';

const jsonsDirectory = '/home/cstanford@novateur.com/repos/other/dragncards-lotrlcg-plugin/jsons';

const readFile = util.promisify(fs.readFile);

test('checkValidGameDef', async () => {
    console.log("Checking valid gameDef");
    const files = fs.readdirSync(jsonsDirectory);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const promises = jsonFiles.map(async file => {
        const filePath = path.join(jsonsDirectory, file);
        if (!fs.existsSync(filePath)) {
            console.log(`File at ${filePath} doesn't exist.`);
            return null;
        }
        const content = await readFile(filePath, 'utf-8'); // Corrected here
        try {
          const json = content;
          return json;
        } catch (error) {
          console.error(`Error parsing ${file}: `, error);
          throw error;
        }
      });      

    const jsons = await Promise.all(promises);
    // Note: The next line should not be needed as you are already returning parsed JSON from your promises
    // const jsonObjects = jsons.map(json => JSON.parse(json));
    const gameDef = mergeJSONs(jsons); // Changed from jsonObjects to jsons

    // Loop over all the gameDef properties (including deeply nested ones) and check that they are valid
    const errors = []
    validateSchema(gameDef, "gameDef", gameDef, getGameDefSchema(gameDef), errors);
    console.log(errors);

});

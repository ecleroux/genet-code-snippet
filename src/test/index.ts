
import * as path from 'path';
import Mocha = require('mocha');
import * as glob from 'glob';

export function run(): Promise<void> {
  return new Promise((resolve, reject) => {
    const mocha = new Mocha({ ui: 'bdd', color: true });
    const testDir = __dirname;
    glob.sync('**/*.test.js', { cwd: testDir }).forEach((file) => {
      mocha.addFile(path.join(testDir, file));
    });
    mocha.run((failures: number) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
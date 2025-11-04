const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  try {
    // The folder containing the extension's package.json
    const extensionDevelopmentPath = path.resolve(__dirname, '../..');
    // The folder containing test files (compiled to out/test)
    const extensionTestsPath = path.resolve(__dirname);
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--disable-extensions']
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();

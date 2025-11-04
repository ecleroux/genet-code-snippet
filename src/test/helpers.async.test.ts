import * as assert from 'assert';
import * as vscode from 'vscode';
import { getAllFiles, readFileContent } from '../helpers';

describe('Async Helper Functions', () => {
  describe('getAllFiles', () => {
    it('returns empty array for non-existent folder', async () => {
      const fakeUri = vscode.Uri.file('/unlikely/path/to/snippets-' + Date.now());
      const files = await getAllFiles(fakeUri);
      assert.ok(Array.isArray(files));
      assert.strictEqual(files.length, 0);
    });

    it('returns array of files for valid folder', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const files = await getAllFiles(workspaceFolders[0].uri);
        assert.ok(Array.isArray(files));
        // Workspace should have some files
        assert.ok(files.length > 0);
      }
    });
  });

  describe('readFileContent', () => {
    it('returns error string for non-existent file', async () => {
      const result = await readFileContent('/unlikely/path/to/file-' + Date.now() + '.txt');
      assert.ok(result.startsWith('Error reading file:'));
    });

    it('reads content from valid file', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const packageJsonPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'package.json');
        try {
          await vscode.workspace.fs.stat(packageJsonPath);
          const content = await readFileContent(packageJsonPath.fsPath);
          assert.ok(!content.startsWith('Error reading file:'));
          assert.ok(content.length > 0);
          assert.ok(content.includes('genet-code-snippet'));
        } catch {
          // Skip if package.json doesn't exist in workspace
        }
      }
    });
  });
});


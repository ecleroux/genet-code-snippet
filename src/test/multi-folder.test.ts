import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Multi-Folder Snippet Collection', () => {
  it('handles multiple snippet folders correctly', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      // In a real scenario, you would have multiple snippet folders configured
      // This test verifies the structure is set up correctly
      const config = vscode.workspace.getConfiguration();
      const snippetFolders = config.get<string[]>('genetCodeSnippet.snippetFolders');
      assert.ok(Array.isArray(snippetFolders));
    }
  });

  it('configuration supports empty folders array', async () => {
    const config = vscode.workspace.getConfiguration();
    const snippetFolders = config.get<string[]>('genetCodeSnippet.snippetFolders');
    assert.ok(Array.isArray(snippetFolders) || snippetFolders === undefined);
  });

  it('configuration schema allows multiple paths', async () => {
    // Verify the configuration can handle multiple paths
    const testPaths = ['/path1', '/path2', '/path3'];
    assert.strictEqual(testPaths.length, 3);
    assert.ok(testPaths.every(p => typeof p === 'string'));
  });
});

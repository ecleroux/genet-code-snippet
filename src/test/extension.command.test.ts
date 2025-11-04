import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Extension Commands', () => {
  it('insertCodeSnippet command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('genet-code-snippet.insertCodeSnippet'));
  });
});

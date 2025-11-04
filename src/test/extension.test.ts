import * as assert from 'assert';
import * as vscode from 'vscode';
import { validateSnippetFolders } from '../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('validateSnippetFolders returns empty array for empty paths', async () => {
		const result = await validateSnippetFolders([]);
		assert.strictEqual(result.length, 0);
	});

	test('validateSnippetFolders returns empty array for non-existent paths', async () => {
		const result = await validateSnippetFolders(['/unlikely/path/to/snippets-' + Date.now()]);
		assert.strictEqual(result.length, 0);
	});

	test('validateSnippetFolders returns Uris for valid paths', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			const result = await validateSnippetFolders([workspaceFolders[0].uri.fsPath]);
			assert.strictEqual(result.length, 1);
			assert.ok(result[0].fsPath);
		}
	});

	test('validateSnippetFolders filters out invalid paths', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			const validPath = workspaceFolders[0].uri.fsPath;
			const invalidPath = '/unlikely/path/to/snippets-' + Date.now();
			const result = await validateSnippetFolders([validPath, invalidPath]);
			assert.strictEqual(result.length, 1);
			assert.ok(result[0].fsPath.includes(validPath));
		}
	});
});


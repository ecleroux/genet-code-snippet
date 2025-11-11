import * as vscode from 'vscode';
import { getAllFiles, readFileContent, getPreview } from './helpers';

/**
 * Represents a snippet item in the QuickPick with folder source information
 */
interface SnippetItem extends vscode.QuickPickItem {
  fullPath?: string;
  sourceFolder?: string;
}

/**
 * Validates that the configured snippet folders exist and are accessible
 * @param folderPaths Array of folder paths to validate
 * @returns Array of validated folder URIs
 */
export async function validateSnippetFolders(folderPaths: string[]): Promise<vscode.Uri[]> {
  if (!folderPaths || folderPaths.length === 0) {
    vscode.window.showErrorMessage('Please configure at least one snippet folder in settings (genetCodeSnippet.snippetFolders).');
    return [];
  }

  const validFolders: vscode.Uri[] = [];
  const invalidFolders: string[] = [];

  for (const folderPath of folderPaths) {
      if (!folderPath || folderPath.trim() === '') {
        continue;
      }
      // Ignore hidden folders/files (start with .)
      const parts = folderPath.split(/[\/]/);
      if (parts.some(p => p.startsWith('.'))) {
        continue;
      }
      const folderUri = vscode.Uri.file(folderPath);
      try {
        await vscode.workspace.fs.stat(folderUri);
        validFolders.push(folderUri);
      } catch (err) {
        invalidFolders.push(folderPath);
        console.warn(`Snippet folder not accessible: ${folderPath}`);
      }
  }

  if (validFolders.length === 0) {
    const errorMsg = invalidFolders.length > 0
      ? `No snippet folders are accessible. Checked: ${invalidFolders.join(', ')}`
      : 'No valid snippet folders configured.';
    vscode.window.showErrorMessage(errorMsg);
    return [];
  }

  if (invalidFolders.length > 0) {
    vscode.window.showWarningMessage(`Some snippet folders are not accessible: ${invalidFolders.join(', ')}`);
  }

  return validFolders;
}

/**
 * Formats a file path relative to the snippet folder
 */
function formatRelativePath(absPath: string, folderUri: vscode.Uri): string {
  if (absPath.startsWith(folderUri.fsPath)) {
    return absPath.substring(folderUri.fsPath.length + 1);
  }
  return vscode.workspace.asRelativePath(absPath, false);
}

/**
 * Collects all snippet files from multiple folders
 */
async function collectSnippetFiles(folderUris: vscode.Uri[]): Promise<Array<{path: string; sourceFolder: string}>> {
  const allFiles: Array<{path: string; sourceFolder: string}> = [];

  for (const folderUri of folderUris) {
    const files = await getAllFiles(folderUri);
    for (const filePath of files) {
      const relativePath = formatRelativePath(filePath, folderUri);
      // Skip files with any path segment starting with a dot
      const segments = relativePath.split(/[\/]/);
      if (segments.some(seg => seg.startsWith('.'))) {
        continue;
      }
      allFiles.push({
        path: relativePath,
        sourceFolder: folderUri.fsPath
      });
    }
  }

  return allFiles.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Extracts the last folder name from a path
 */
function getLastFolderName(folderPath: string): string {
  return folderPath.split(/[\\/]/).filter(p => p).pop() || folderPath;
}

/**
 * Creates QuickPick items for the current page, including folder source info and preview
 */
function createPageItems(files: Array<{path: string; sourceFolder: string}>, page: number, pageSize: number): SnippetItem[] {
  const start = page * pageSize;
  const end = Math.min(start + pageSize, files.length);
  return files.slice(start, end).map(file => {
    const fileName = file.path.split(/[\\/]/).pop() || file.path;
    const folderName = getLastFolderName(file.sourceFolder);
    const relativePath = file.path;
    const absPath = vscode.Uri.joinPath(vscode.Uri.file(file.sourceFolder), relativePath).fsPath;
    return {
      label: fileName,
      description: `${folderName}/${relativePath}`,
      detail: '',  // Will be populated on highlight with preview
      fullPath: absPath,
      sourceFolder: file.sourceFolder
    };
  });
}

/**
 * Handles pagination button selection
 */
function handlePageNavigation(selected: SnippetItem, currentPage: number, totalPages: number): number | null {
  if (selected.label === '← Previous Page') {
    return Math.max(0, currentPage - 1);
  } else if (selected.label === 'Next Page →') {
    return Math.min(totalPages - 1, currentPage + 1);
  }
  return null;
}

/**
 * Updates QuickPick items with pagination controls
 */
function updateQuickPickItems(quickPick: vscode.QuickPick<SnippetItem>, items: SnippetItem[], page: number, totalPages: number): void {
  let displayItems = [...items];

  if (totalPages > 1) {
    if (page > 0) {
      displayItems.unshift({
        label: '← Previous Page',
        description: 'Go to previous page. Use ↑/↓ arrows and Enter to select.'
      });
    }
    if (page < totalPages - 1) {
      displayItems.push({
        label: 'Next Page →',
        description: 'Go to next page. Use ↑/↓ arrows and Enter to select.'
      });
    }
  }

  quickPick.items = displayItems;
  quickPick.placeholder = `Select a snippet file to insert (Page ${page + 1} of ${totalPages}). Use ↑/↓ arrows to navigate, Enter to select, Esc to cancel.`;
}

/**
 * Handles preview display for the active item
 */
async function handlePreview(quickPick: vscode.QuickPick<SnippetItem>, activeItem: SnippetItem): Promise<void> {
  if (!activeItem.fullPath) {
    return;
  }

  try {
    const content = await readFileContent(activeItem.fullPath);
    if (!content.startsWith('Error reading file:')) {
      const previewDetail = getPreview(content);
      quickPick.items = quickPick.items.map(item => {
        if (item.fullPath === activeItem.fullPath) {
          return { ...item, detail: previewDetail };
        } else {
          const { detail, ...rest } = item;
          return rest;
        }
      });
      quickPick.activeItems = quickPick.items.filter(item => item.fullPath === activeItem.fullPath);
    }
  } catch (err) {
    console.error('Error generating preview:', err);
  }
}

/**
 * Detects the language of a file based on its extension
 */
function detectFileLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const languageMap: { [key: string]: string } = {
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    sh: 'shell',
    bash: 'bash',
    zsh: 'shell',
    html: 'html',
    css: 'css',
    json: 'json',
    xml: 'xml',
    sql: 'sql',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml'
  };
  return languageMap[ext] || '';
}

/**
 * Inserts the selected snippet into the active editor or a new document
 */
async function insertSnippet(content: string, selectedItem: SnippetItem): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const selection = editor.selection;
    await editor.edit(editBuilder => {
      if (!selection.isEmpty) {
        editBuilder.replace(selection, content);
      } else {
        editBuilder.insert(selection.active, content);
      }
    });
  } else {
    // If no editor is open, open a new untitled file with the snippet content
    const language = detectFileLanguage(selectedItem.fullPath || '');
    const doc = await vscode.workspace.openTextDocument({ content, language });
    await vscode.window.showTextDocument(doc);
  }
}

/**
 * Main command handler for inserting code snippets
 */
export async function handleInsertCodeSnippet(): Promise<void> {
  // Get and validate the configured snippet folders
  const folderPaths = vscode.workspace.getConfiguration().get<string[]>('genetCodeSnippet.snippetFolders') || [];
  const folderUris = await validateSnippetFolders(folderPaths);
  if (folderUris.length === 0) {
    return;
  }

  // Collect all snippet files from all folders
  const files = await collectSnippetFiles(folderUris);
  if (files.length === 0) {
    vscode.window.showWarningMessage('No files found in any of the snippet folders.');
    return;
  }

  // Pagination settings
  const PAGE_SIZE = 50;
  let currentPage = 0;
  const totalPages = Math.ceil(files.length / PAGE_SIZE);

  // Create and show QuickPick
  const quickPick = vscode.window.createQuickPick<SnippetItem>();
  quickPick.matchOnDescription = true; // Enable filtering on description field
  let allItems = createPageItems(files, currentPage, PAGE_SIZE);
  quickPick.items = allItems;
  updateQuickPickItems(quickPick, allItems, currentPage, totalPages);

  // Handle search input to filter by both label and description
  quickPick.onDidChangeValue((searchValue) => {
    if (!searchValue) {
      allItems = createPageItems(files, currentPage, PAGE_SIZE);
      updateQuickPickItems(quickPick, allItems, currentPage, totalPages);
    } else {
      const lowerSearch = searchValue.toLowerCase();
      const filtered = files
        .filter(file => {
          const fileName = file.path.split(/[\\/]/).pop() || file.path;
          const folderName = getLastFolderName(file.sourceFolder);
          const relativePath = file.path;
          const label = fileName.toLowerCase();
          const description = `${folderName}/${relativePath}`.toLowerCase();
          return label.includes(lowerSearch) || description.includes(lowerSearch);
        })
        .map(file => {
          const fileName = file.path.split(/[\\/]/).pop() || file.path;
          const folderName = getLastFolderName(file.sourceFolder);
          const relativePath = file.path;
          const absPath = vscode.Uri.joinPath(vscode.Uri.file(file.sourceFolder), relativePath).fsPath;
          return {
            label: fileName,
            description: `${folderName}/${relativePath}`,
            detail: '',
            fullPath: absPath,
            sourceFolder: file.sourceFolder
          };
        });
      
      quickPick.items = filtered;
      quickPick.placeholder = `Select a snippet file to insert (${filtered.length} results). Use ↑/↓ arrows to navigate, Enter to select, Esc to cancel.`;
    }
  });

  // Handle preview updates with debouncing
  let previewTimeout: NodeJS.Timeout | undefined;
  quickPick.onDidChangeActive((items) => {
    if (previewTimeout) {
      clearTimeout(previewTimeout);
    }
    if (items.length === 0) {
      return;
    }
    previewTimeout = setTimeout(async () => {
      await handlePreview(quickPick, items[0] as SnippetItem);
    }, 100);
  });

  // Handle selection acceptance
  quickPick.onDidAccept(async () => {
    const picked = quickPick.selectedItems[0];
    if (!picked) {
      quickPick.hide();
      return;
    }

    // Check if this is a pagination button
    if (picked.label === '← Previous Page' || picked.label === 'Next Page →') {
      const newPage = handlePageNavigation(picked, currentPage, totalPages);
      if (newPage !== null) {
        currentPage = newPage;
        const pageItems = createPageItems(files, currentPage, PAGE_SIZE);
        updateQuickPickItems(quickPick, pageItems, currentPage, totalPages);
      }
      return;
    }

    if (!picked.fullPath) {
      quickPick.hide();
      return;
    }

    try {
      const content = await readFileContent(picked.fullPath);
      if (content.startsWith('Error reading file:')) {
        vscode.window.showErrorMessage(content);
      } else {
        await insertSnippet(content, picked);
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to read snippet file: ${err}`);
    }
    quickPick.hide();
  });

  // Cleanup
  quickPick.onDidHide(() => {
    quickPick.dispose();
  });

  quickPick.show();
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Genet: Code Snippet extension is now active!');

  const disposableInsertSnippet = vscode.commands.registerCommand(
    'genet-code-snippet.insertCodeSnippet',
    handleInsertCodeSnippet
  );

  context.subscriptions.push(disposableInsertSnippet);
}

// This method is called when your extension is deactivated
export function deactivate() {}

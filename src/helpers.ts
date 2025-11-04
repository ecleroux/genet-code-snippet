import * as vscode from 'vscode';

/**
 * Recursively gets all files in a directory
 * @param dir The directory URI to scan
 * @returns Array of absolute file paths
 */
export async function getAllFiles(dir: vscode.Uri): Promise<string[]> {
    let results: string[] = [];
    try {
        const entries = await vscode.workspace.fs.readDirectory(dir);
        for (const [name, type] of entries) {
            const fileUri = vscode.Uri.joinPath(dir, name);
            if (type === vscode.FileType.Directory) {
                const subFiles = await getAllFiles(fileUri);
                results = results.concat(subFiles);
            } else if (type === vscode.FileType.File) {
                results.push(fileUri.fsPath);
            }
        }
    } catch (err) {
        console.error(`Error reading snippet folder: ${err}`);
    }
    return results;
}

/**
 * Reads file content as UTF-8 string
 * @param absPath Absolute path to the file
 * @returns File content or error message
 */
export async function readFileContent(absPath: string): Promise<string> {
    try {
        const fileUri = vscode.Uri.file(absPath);
        const fileData = await vscode.workspace.fs.readFile(fileUri);
        return Buffer.from(fileData).toString('utf8');
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Error reading file ${absPath}: ${errorMsg}`);
        return `Error reading file: ${errorMsg}`;
    }
}

/**
 * Generates a preview of file content (first N lines, max chars)
 * @param content The full file content
 * @param maxLines Maximum number of lines to include
 * @param maxChars Maximum number of characters to include
 * @returns Preview string, possibly truncated
 */
export function getPreview(content: string, maxLines: number = 30, maxChars: number = 1000): string {
    const preview = content.split('\n').slice(0, maxLines).join('\n');
    return preview.length > maxChars ? preview.substring(0, maxChars) + '\n... (truncated)' : preview;
}

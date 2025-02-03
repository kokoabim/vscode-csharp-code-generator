import * as vscode from 'vscode';
// import * as fs from "fs/promises";
// import path from 'path';

export class FileSystem {
    static async workspaceFile(name: string): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles(`**/${name}`);
    }

    static async workspaceFiles(extension = ".cs"): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles(`**/*${extension}`);
    }
}
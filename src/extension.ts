import * as vscode from "vscode";
import { CSharpCodeGeneratorVSCodeExtension } from "./VSCodeExtension/CSharpCodeGeneratorVSCodeExtension";


export function activate(context: vscode.ExtensionContext) {
    console.log('Activating CSharp Code Generator extension...');
    CSharpCodeGeneratorVSCodeExtension.use(context);
}

export function deactivate() { }

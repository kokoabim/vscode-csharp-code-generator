import * as vscode from "vscode";
import { CSharpCodeGeneratorVSCodeExtension } from "./VSCodeExtension/CSharpCodeGeneratorVSCodeExtension";


export function activate(context: vscode.ExtensionContext) {
    console.log(`Activating ${context.extension.packageJSON["displayName"]} extension...`);
    CSharpCodeGeneratorVSCodeExtension.use(context);
}

export function deactivate() { }

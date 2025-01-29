import * as vscode from "vscode";
import { VSCodeExtensionSettings } from "./VSCodeExtensionSettings";

export class CSharpCodeGeneratorVSCodeExtensionSettings extends VSCodeExtensionSettings {
    formatDocumentOnCodeGeneration = true;
    indentation!: string;
    interfaceImplementations: { [interfaceTypeName: string]: string } = {};

    protected configurationSection = "csharp-code-generator";

    private static singletonInstance: CSharpCodeGeneratorVSCodeExtensionSettings;

    private constructor() {
        super();
        CSharpCodeGeneratorVSCodeExtensionSettings.readConfigAndAssignSettings(this);
    }

    static singleton(refresh = false): CSharpCodeGeneratorVSCodeExtensionSettings {
        if (!this.singletonInstance) CSharpCodeGeneratorVSCodeExtensionSettings.singletonInstance = new CSharpCodeGeneratorVSCodeExtensionSettings();
        else if (refresh) CSharpCodeGeneratorVSCodeExtensionSettings.readConfigAndAssignSettings(CSharpCodeGeneratorVSCodeExtensionSettings.singletonInstance);

        return this.singletonInstance;
    }

    private static readConfigAndAssignSettings(settings: CSharpCodeGeneratorVSCodeExtensionSettings): void {
        const editorConfig = vscode.workspace.getConfiguration("editor");
        settings.indentation = editorConfig.get("insertSpaces") as boolean ? " ".repeat(editorConfig.get("tabSize") as number) : "\t";

        if (!settings.hasConfiguration()) return;

        settings.formatDocumentOnCodeGeneration = settings.get<boolean>("formatDocumentOnCodeGeneration") ?? true;
        settings.interfaceImplementations = settings.get("interfaceImplementations") as { [interfaceTypeName: string]: string } ?? {};
    }
}
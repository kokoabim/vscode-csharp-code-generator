import { VSCodeExtensionSettings } from "./VSCodeExtensionSettings";

export class CSharpCodeGeneratorVSCodeExtensionSettings extends VSCodeExtensionSettings {
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
        if (!settings.hasConfiguration()) return;
    }
}
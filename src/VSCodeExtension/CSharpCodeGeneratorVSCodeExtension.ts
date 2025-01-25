import * as vscode from "vscode";
import { VSCodeCommand } from "./VSCodeCommand";
import { VSCodeExtension } from "./VSCodeExtension";
import { CSharpCodeGeneratorVSCodeExtensionSettings } from "./CSharpCodeGeneratorVSCodeExtensionSettings";

export class CSharpCodeGeneratorVSCodeExtension extends VSCodeExtension {
    constructor(context: vscode.ExtensionContext) {
        super(context);

        this.addCommands(this.sayHelloWorldCommand());
    }

    static use(context: vscode.ExtensionContext): CSharpCodeGeneratorVSCodeExtension {
        return new CSharpCodeGeneratorVSCodeExtension(context);
    }

    private sayHelloWorldCommand(): VSCodeCommand {
        return new VSCodeCommand("csharp-code-generator.helloWorld", async () => {
            const settings = CSharpCodeGeneratorVSCodeExtensionSettings.singleton(true);
            await this.information(`Hello ${settings.yourName}!`);
        });
    }
}
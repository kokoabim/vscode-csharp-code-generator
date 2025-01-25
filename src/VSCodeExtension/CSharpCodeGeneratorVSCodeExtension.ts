import * as vscode from "vscode";
import { VSCodeCommand } from "./VSCodeCommand";
import { VSCodeExtension } from "./VSCodeExtension";
import { CSharpFile } from "../CSharp/CSharpFile";

export class CSharpCodeGeneratorVSCodeExtension extends VSCodeExtension {
    constructor(context: vscode.ExtensionContext) {
        super(context);

        this.addCommands(this.generateInterfaceCommand());
    }

    static use(context: vscode.ExtensionContext): CSharpCodeGeneratorVSCodeExtension {
        return new CSharpCodeGeneratorVSCodeExtension(context);
    }

    private generateInterfaceCommand(): VSCodeCommand {
        return new VSCodeCommand("csharp-code-generator.generate-interface", async () => {
            if (!await this.isWorkspaceOpen()) return;

            const textDocument = await this.getTextDocument();
            if (!textDocument) return;

            const cSharpFile = await CSharpFile.parse(textDocument);
        });
    }
}
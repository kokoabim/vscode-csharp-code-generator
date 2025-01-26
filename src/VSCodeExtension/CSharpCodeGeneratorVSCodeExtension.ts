import * as vscode from "vscode";
import { VSCodeCommand } from "./VSCodeCommand";
import { VSCodeExtension } from "./VSCodeExtension";
import { CSharpFile } from "../CSharp/CSharpFile";
import { CSharpSymbolType } from "../CSharp/CSharpSymbolType";
import { CSharpSymbol } from "../CSharp/CSharpSymbol";
import { CSharpCodeGenerator } from "../CodeGeneration/CSharpCodeGenerator";

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

            const cSharpClassesWithoutInterfaces = cSharpFile.members.filter(classSymbol =>
                classSymbol.symbolType === CSharpSymbolType.class
                && !classSymbol.isStaticMember
                && cSharpFile.members.filter(interfaceSymbol =>
                    interfaceSymbol.symbolType === CSharpSymbolType.interface
                    && interfaceSymbol.name === `I${classSymbol.name}`).length === 0);

            if (cSharpClassesWithoutInterfaces.length === 0) {
                await this.information("No classes found that can have or need an interface");
                return;
            }

            let cSharpClassesWithoutInterface: CSharpSymbol | undefined;

            if (cSharpClassesWithoutInterfaces.length === 1) {
                cSharpClassesWithoutInterface = cSharpClassesWithoutInterfaces[0];
            }
            else {
                const cSharpClassSelected = await vscode.window.showQuickPick(
                    cSharpClassesWithoutInterfaces.map(c => `${c.typeName}`),
                    { placeHolder: "Select class to create interface for" });

                if (!cSharpClassSelected) { return; }

                cSharpClassesWithoutInterface = cSharpClassesWithoutInterfaces.find(c => c.typeName === cSharpClassSelected)!;
            }

            const cSharpInterface = CSharpCodeGenerator.createInterface(cSharpClassesWithoutInterface);
        });
    }
}
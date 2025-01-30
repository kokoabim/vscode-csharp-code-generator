import * as vscode from "vscode";
import { VSCodeCommand } from "./VSCodeCommand";
import { VSCodeExtension } from "./VSCodeExtension";
import { CSharpFile } from "../CSharp/CSharpFile";
import { CSharpSymbolType } from "../CSharp/CSharpSymbolType";
import { CSharpSymbol } from "../CSharp/CSharpSymbol";
import { CSharpCodeGenerator } from "../CodeGeneration/CSharpCodeGenerator";
import { CSharpCodeGeneratorVSCodeExtensionSettings } from "./CSharpCodeGeneratorVSCodeExtensionSettings";

export class CSharpCodeGeneratorVSCodeExtension extends VSCodeExtension {
    constructor(context: vscode.ExtensionContext) {
        super(context);

        this.addCommands(
            this.generateClassFromInterfaceCommand(),
            this.generateInterfaceFromClassCommand()
        );
    }

    static use(context: vscode.ExtensionContext): CSharpCodeGeneratorVSCodeExtension {
        return new CSharpCodeGeneratorVSCodeExtension(context);
    }

    private createClassOrInterfaceFromOther(sourceSymbolType: CSharpSymbolType, targetSymbolType: CSharpSymbolType): Promise<void> {
        return new Promise(async () => {
            if (!await this.isWorkspaceOpen()) return;

            const textDocument = await this.getTextDocument();
            if (!textDocument) return;

            const textEditor = await this.getTextEditor();
            if (!textEditor) return;

            const cSharpFile = await CSharpFile.parse(textDocument);

            const sourceTypeName = sourceSymbolType === CSharpSymbolType.class ? "class" : "interface";
            const targetTypeName = targetSymbolType === CSharpSymbolType.class ? "class" : "interface";

            const sourceSymbols = cSharpFile.members.filter(a =>
                a.symbolType === sourceSymbolType
                && !a.isStaticMember
                && cSharpFile.members.filter(b =>
                    b.symbolType === targetSymbolType
                    && b.name === (targetSymbolType === CSharpSymbolType.interface ? `I${a.name}` : (a.name.startsWith("I") ? a.name.substring(1) : a.name))
                ).length === 0);

            if (sourceSymbols.length === 0) {
                await this.warning(`No ${sourceTypeName} found to create a${targetSymbolType === CSharpSymbolType.interface ? "n" : ""} ${targetTypeName} for`);
                return;
            }

            let sourceSymbol: CSharpSymbol | undefined;

            if (sourceSymbols.length === 1) {
                sourceSymbol = sourceSymbols[0];
            }
            else {
                const selectedSymbol = await vscode.window.showQuickPick(
                    sourceSymbols.map(c => `${c.typeName}`),
                    { placeHolder: `Select ${sourceTypeName} to create ${targetTypeName} for` });

                if (!selectedSymbol) return;

                sourceSymbol = sourceSymbols.find(c => c.typeName === selectedSymbol)!;
            }

            const codeGeneratorSettings = CSharpCodeGeneratorVSCodeExtensionSettings.singleton(true);

            const targetSymbol = targetSymbolType === CSharpSymbolType.interface
                ? CSharpCodeGenerator.createInterface(codeGeneratorSettings, sourceSymbol)
                : CSharpCodeGenerator.createClass(codeGeneratorSettings, sourceSymbol);

            if (targetSymbol.members.length === 0) {
                await this.warning(`No members found in ${sourceSymbol.typeName} to create a${targetSymbolType === CSharpSymbolType.interface ? "n" : ""} ${targetTypeName} for`);
                return;
            }

            if (sourceSymbolType === CSharpSymbolType.class && targetSymbolType === CSharpSymbolType.interface) {
                await CSharpCodeGenerator.addInterfaceToClassAsync(textEditor, sourceSymbol, targetSymbol.typeName);
            }

            const targetSymbolText = (targetSymbolType === CSharpSymbolType.class ? sourceSymbol.eol : "")
                + sourceSymbol.eol
                + targetSymbol.toString()
                + sourceSymbol.eol;

            const targetSymbolInsertPosition = targetSymbolType === CSharpSymbolType.interface ? sourceSymbol.startPosition : sourceSymbol.endPosition;

            await textEditor.edit(editBuilder => {
                editBuilder.insert(targetSymbolInsertPosition, targetSymbolText);
            });

            const insertedLineNumber = targetSymbolInsertPosition.line + 1 + (targetSymbolType === CSharpSymbolType.class ? 1 : 0);
            const insertedLineCount = targetSymbol.text.split(sourceSymbol.eol).length;
            const insertedRange = new vscode.Range(
                insertedLineNumber, 0,
                insertedLineNumber + insertedLineCount, 0);

            if (codeGeneratorSettings.formatDocumentOnCodeGeneration) await vscode.commands.executeCommand('editor.action.formatDocument', textDocument.uri);

            // ! TODO: Implement this...
            /*
            const fileDiagnostics = FileDiagnostic.getFileDiagnostics(textDocument);
            const hidesInheritedMemberEdits = fileDiagnostics.filter(d => d.identifier === FileDiagnosticIdentifier.hidesInheritedMember && insertedRange.contains(d.range))
                .map(d => new vscode.TextEdit(d.range, ""));

            await textEditor.edit(editBuilder => {
                hidesInheritedMemberEdits.forEach(te =>
                    editBuilder.replace(te.range, te.newText)
                );
            });
            */

            textEditor.revealRange(insertedRange, vscode.TextEditorRevealType.InCenter);

            textEditor.selection = new vscode.Selection(
                insertedRange.start.line, insertedRange.start.character,
                insertedRange.end.line /*- hidesInheritedMemberEdits.length*/, insertedRange.end.character);

            await this.information(`${sourceSymbol.typeName} inserted on line ${insertedLineNumber + 1}`);
        });
    }

    private generateClassFromInterfaceCommand(): VSCodeCommand {
        return new VSCodeCommand("csharp-code-generator.generate-class-from-interface", async () => {
            await this.createClassOrInterfaceFromOther(CSharpSymbolType.interface, CSharpSymbolType.class);
        });
    }

    private generateInterfaceFromClassCommand(): VSCodeCommand {
        return new VSCodeCommand("csharp-code-generator.generate-interface-from-class", async () => {
            await this.createClassOrInterfaceFromOther(CSharpSymbolType.class, CSharpSymbolType.interface);
        });
    }
}
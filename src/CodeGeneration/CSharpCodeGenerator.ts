import * as vscode from "vscode";
import { CSharpKeywords } from "../CSharp/CSharpKeywords";
import { CSharpParameter } from "../CSharp/CSharpParameter";
import { CSharpSymbol } from "../CSharp/CSharpSymbol";
import { CSharpSymbolType } from "../CSharp/CSharpSymbolType";
import { StringBuilder } from "../Utilities/StringBuilder";
import { CSharpCodeGeneratorVSCodeExtensionSettings } from "../VSCodeExtension/CSharpCodeGeneratorVSCodeExtensionSettings";

export class CSharpCodeGenerator {
    static async addInterfaceToClassAsync(textEditor: vscode.TextEditor, symbol: CSharpSymbol, interfaceTypeName: string): Promise<void> {
        if (symbol.implements.includes(interfaceTypeName)) return;

        symbol.implements.push(interfaceTypeName);

        const implementsText = ": " + symbol.implements.join(", ");

        let implementsStartCharacter;
        let implementsStartLine;

        if (symbol.implementsRange === undefined && symbol.afterTypeNameOrPrimaryConstructorPosition !== undefined) {
            await textEditor.edit(editBuilder => {
                editBuilder.insert(symbol.afterTypeNameOrPrimaryConstructorPosition!, " " + implementsText);
            });

            implementsStartCharacter = symbol.afterTypeNameOrPrimaryConstructorPosition!.character + 1;
            implementsStartLine = symbol.afterTypeNameOrPrimaryConstructorPosition!.line;
        }
        else {
            await textEditor.edit(editBuilder => {
                editBuilder.replace(symbol.implementsRange!, implementsText);
            });

            implementsStartCharacter = symbol.implementsRange!.start.character;
            implementsStartLine = symbol.implementsRange!.start.line;
        }

        symbol.implementsRange = new vscode.Range(
            implementsStartLine, implementsStartCharacter,
            implementsStartLine, implementsStartCharacter + implementsText.length);
    }

    static createClass(settings: CSharpCodeGeneratorVSCodeExtensionSettings, sourceSymbol: CSharpSymbol): CSharpSymbol {
        const targetSymbol = new CSharpSymbol();
        targetSymbol.accessModifier = sourceSymbol.accessModifier;
        targetSymbol.constraints = sourceSymbol.constraints;
        targetSymbol.eol = sourceSymbol.eol;
        targetSymbol.implements = [sourceSymbol.typeName];
        targetSymbol.name = sourceSymbol.name.startsWith("I") ? sourceSymbol.name.substring(1) : sourceSymbol.name;
        targetSymbol.namespace = sourceSymbol.namespace;
        targetSymbol.parent = sourceSymbol.parent;
        targetSymbol.returnType = "class";
        targetSymbol.symbolType = CSharpSymbolType.class;
        targetSymbol.typeName = sourceSymbol.typeName.startsWith("I") ? sourceSymbol.typeName.substring(1) : sourceSymbol.typeName;
        targetSymbol.xmlComment = sourceSymbol.xmlComment;

        sourceSymbol.members.sort((a, b) => a.name.localeCompare(b.name)).forEach(sourceMember => {
            const targetMember = new CSharpSymbol();
            targetMember.accessModifier = sourceMember.accessModifier;
            targetMember.accessors = sourceMember.accessors;
            targetMember.constraints = sourceMember.constraints;
            targetMember.name = sourceMember.name;
            targetMember.parameters = sourceMember.parameters;
            targetMember.parametersText = sourceMember.parametersText;
            targetMember.parent = targetSymbol;
            targetMember.returnType = sourceMember.returnType;
            targetMember.symbolType = sourceMember.symbolType;
            targetMember.typeName = sourceMember.typeName;
            targetMember.text = CSharpCodeGenerator.createClassMemberText(settings, sourceMember);
            targetMember.xmlComment = sourceMember.xmlComment;

            targetSymbol.members.push(targetMember);
        });

        targetSymbol.text = CSharpCodeGenerator.createClassSymbolText(settings, targetSymbol, sourceSymbol.implements);

        return targetSymbol;
    }

    static createInterface(settings: CSharpCodeGeneratorVSCodeExtensionSettings, sourceSymbol: CSharpSymbol): CSharpSymbol {
        const targetSymbol = new CSharpSymbol();
        targetSymbol.accessModifier = sourceSymbol.accessModifier; // though set, this isn't used in the interface
        targetSymbol.constraints = sourceSymbol.constraints;
        targetSymbol.eol = sourceSymbol.eol;
        targetSymbol.implements = sourceSymbol.implements.filter(i => i.startsWith("I"));
        targetSymbol.name = `I${sourceSymbol.name}`;
        targetSymbol.namespace = sourceSymbol.namespace;
        targetSymbol.parent = sourceSymbol.parent;
        targetSymbol.returnType = "interface";
        targetSymbol.symbolType = CSharpSymbolType.interface;
        targetSymbol.typeName = `I${sourceSymbol.typeName}`;
        targetSymbol.xmlComment = sourceSymbol.xmlComment;

        sourceSymbol.implements = sourceSymbol.implements.filter(i => !i.startsWith("I")); // interfaces are moved to interface being created

        sourceSymbol.members.sort((a, b) => a.name.localeCompare(b.name)).filter(m =>
            !m.isStaticMember && !m.isAbstractMember
            && CSharpCodeGenerator.isInterfaceMemberType(m)
            && CSharpKeywords.accessModifierIsEqualOrHigher(m.accessModifier, targetSymbol.accessModifier)
        ).forEach(sourceMember => {
            const targetMember = new CSharpSymbol();
            targetMember.accessModifier = sourceMember.accessModifier;
            targetMember.constraints = sourceMember.constraints;
            targetMember.name = sourceMember.name;
            targetMember.parameters = sourceMember.parameters;
            targetMember.parametersText = sourceMember.parametersText;
            targetMember.parent = targetSymbol;
            targetMember.returnType = sourceMember.returnType;
            targetMember.symbolType = sourceMember.symbolType;
            targetMember.typeName = sourceMember.typeName;
            targetMember.text = CSharpCodeGenerator.createInterfaceMemberText(settings, sourceMember);
            targetMember.xmlComment = sourceMember.xmlComment;

            targetSymbol.members.push(targetMember);
        });

        targetSymbol.text = CSharpCodeGenerator.createInterfaceSymbolText(settings, targetSymbol);

        return targetSymbol;
    }

    private static createClassMemberText(settings: CSharpCodeGeneratorVSCodeExtensionSettings, symbol: CSharpSymbol): string {
        const sb = new StringBuilder();

        sb.append(settings.indentation);

        sb.append(symbol.accessModifier).append(" ");
        if (symbol.name.endsWith("Async") && (symbol.returnType! === "Task" || symbol.returnType!.startsWith("Task<"))) sb.append("async ");
        sb.append(symbol.returnType!).append(" ");
        sb.append(symbol.typeName);

        if (symbol.canHaveParameters && symbol.parametersText) sb.append(symbol.parametersText);

        if (symbol.symbolType === CSharpSymbolType.property) {
            sb.append(" {");
            sb.append(" get;");
            sb.append(` ${symbol.accessors.set === undefined ? "private " : ""}set;`);
            sb.append(" }");
        }
        else if (symbol.symbolType === CSharpSymbolType.indexer) {
            sb.append(`${symbol.eol + settings.indentation}{`);
            sb.append(`${symbol.eol + settings.indentation + settings.indentation}`).append("get => throw new NotImplementedException();");
            sb.append(`${symbol.eol + settings.indentation + settings.indentation}`).append(`${symbol.accessors.set === undefined ? "private " : ""}set => throw new NotImplementedException();`);
            sb.append(`${symbol.eol + settings.indentation}}`);
        }

        if (symbol.constraints.length > 0) sb.append(" where ").concat(" where ", ...symbol.constraints);

        if (symbol.symbolType === CSharpSymbolType.method) {
            sb.append(`${symbol.eol}${settings.indentation}{${symbol.eol}`);
            sb.append(settings.indentation + settings.indentation).append("throw new NotImplementedException();");
            sb.append(`${symbol.eol}${settings.indentation}}`);
        }

        return sb.toString();
    }

    private static createClassSymbolText(settings: CSharpCodeGeneratorVSCodeExtensionSettings, symbol: CSharpSymbol, inheritedInterfaces: string[]): string {
        const sb = new StringBuilder();

        if (symbol.xmlComment) sb.append(symbol.xmlComment).append(symbol.eol);

        if (symbol.accessModifier) sb.append(symbol.accessModifier).append(" ");
        if (symbol.returnType) sb.append(symbol.returnType).append(" ");
        sb.append(symbol.typeName);

        if (symbol.implements.length > 0) {
            sb.append(" : ");
            sb.concat(", ", ...symbol.implements);
        }

        if (symbol.constraints.length > 0) sb.append(" where ").concat(" where ", ...symbol.constraints);

        sb.append(`${symbol.eol}{`);

        const symbolTypes = [CSharpSymbolType.event, CSharpSymbolType.property, CSharpSymbolType.constructor, CSharpSymbolType.indexer, CSharpSymbolType.method];

        let symbolIndex = 0;

        symbolTypes.forEach(symbolType => {
            if (symbolType !== CSharpSymbolType.constructor) {
                symbol.members.filter(m => m.symbolType === symbolType).forEach(member => {
                    if (symbolIndex > 0) sb.append(symbol.eol);
                    symbolIndex++;

                    if (member.xmlComment) sb.append(`${symbol.eol}${settings.indentation}`).append(member.xmlComment.split(symbol.eol).join(`${symbol.eol}${settings.indentation}`));

                    sb.append(`${symbol.eol}${member.text}`);
                });
            }
            else { // constructor
                if (symbolIndex > 0) sb.append(symbol.eol);
                symbolIndex++;

                sb.append(`${symbol.eol}${settings.indentation}${symbol.accessModifier} ${symbol.name}()`);
                sb.append(`${symbol.eol}${settings.indentation}{`);
                sb.append(`${symbol.eol}${settings.indentation}}`);

                const propertiesWithPrivateSetters = symbol.members.filter(m => m.symbolType === CSharpSymbolType.property && m.accessors.set === undefined);
                if (propertiesWithPrivateSetters.length > 0) {
                    const constructorParameters = propertiesWithPrivateSetters.map(p => {
                        const parameter = new CSharpParameter();
                        parameter.name = p.name.substring(0, 1).toLowerCase() + p.name.substring(1);
                        parameter.type = p.returnType!;
                        parameter.rawText = `${parameter.type} ${parameter.name}`;
                        return parameter;
                    });

                    sb.append(`${symbol.eol}${symbol.eol}${settings.indentation}${symbol.accessModifier} ${symbol.name}(${constructorParameters.map(p => p.rawText).join(", ")})`);
                    sb.append(`${symbol.eol}${settings.indentation}{`);
                    constructorParameters.forEach(p => sb.append(`${symbol.eol}${settings.indentation}${settings.indentation}`).append(`${p.name.substring(0, 1).toUpperCase()}${p.name.substring(1)} = ${p.name};`));
                    sb.append(`${symbol.eol}${settings.indentation}}`);
                }
            }
        });

        if (inheritedInterfaces.length > 0 && Object.keys(settings.interfaceImplementations).length > 0) {
            const definedAndInheritedInterfaces = (Object.keys(settings.interfaceImplementations).map(definedInterfaceTypeName => {
                const definedInterfaceTypeNameSplit = definedInterfaceTypeName.split(";").map(ditn => ditn.trim());

                for (const inheritedInterface of inheritedInterfaces) {
                    const m = inheritedInterface.match(`^${definedInterfaceTypeNameSplit[0]}$`);
                    if (m) return [definedInterfaceTypeName, inheritedInterface, m.length === 2 ? m[1] : undefined];
                }

                return [undefined, undefined, undefined];
            }) as [string | undefined, string | undefined, string | undefined][])
                .filter(dii => dii[0] !== undefined);

            definedAndInheritedInterfaces.forEach(dii => {
                let interfaceTypeNames = [dii[0]];
                if (interfaceTypeNames[0]!.includes(";")) interfaceTypeNames.push(...interfaceTypeNames[0]!.split(";").map(itn => itn.trim()).slice(1));

                const classImplementation = interfaceTypeNames.map(itn => {
                    const genericType = dii[2];

                    return settings.interfaceImplementations[itn!]
                        .replaceAll("%className%", symbol.name)
                        .replaceAll("%classTypeName%", symbol.typeName)
                        .replaceAll("%genericType%", genericType ?? "")
                        .replaceAll("%interfaceName%", symbol.implements[0]) // 0 = will always be the interface generated from
                        .replaceAll("%indent%", settings.indentation)
                        .replaceAll(/\n/g, symbol.eol);
                }).join(symbol.eol + symbol.eol);

                sb.append(`${symbol.eol}${symbol.eol}${classImplementation}`);
            });
        }

        sb.append(`${symbol.eol}}`);

        return sb.toString();
    }

    private static createInterfaceMemberText(settings: CSharpCodeGeneratorVSCodeExtensionSettings, symbol: CSharpSymbol): string {
        const sb = new StringBuilder();

        sb.append(settings.indentation);

        sb.append(symbol.returnType!).append(" ");
        sb.append(symbol.typeName);

        if (symbol.canHaveParameters && symbol.parametersText) sb.append(symbol.parametersText);

        if (symbol.symbolType === CSharpSymbolType.property || symbol.symbolType === CSharpSymbolType.indexer) {
            sb.append(" {");
            if (symbol.accessors.get !== undefined && (symbol.accessors.get === "" || CSharpKeywords.accessModifierIsEqualOrHigher(symbol.accessors.get, symbol.parent!.accessModifier))) sb.append(" get;");
            if (symbol.accessors.set !== undefined && (symbol.accessors.set === "" || CSharpKeywords.accessModifierIsEqualOrHigher(symbol.accessors.set, symbol.parent!.accessModifier))) sb.append(" set;");
            sb.append(" }");
        }

        if (symbol.constraints.length > 0) sb.append(" where ").concat(" where ", ...symbol.constraints);

        if (symbol.symbolType === CSharpSymbolType.method) sb.append(";");

        return sb.toString();
    }

    private static createInterfaceSymbolText(settings: CSharpCodeGeneratorVSCodeExtensionSettings, symbol: CSharpSymbol): string {
        const sb = new StringBuilder();

        if (symbol.xmlComment) sb.append(symbol.xmlComment).append(symbol.eol);

        if (symbol.accessModifier) sb.append(symbol.accessModifier).append(" ");
        if (symbol.returnType) sb.append(symbol.returnType).append(" ");
        sb.append(symbol.typeName);

        if (symbol.implements.length > 0) {
            sb.append(" : ");
            sb.concat(", ", ...symbol.implements);
        }

        if (symbol.constraints.length > 0) sb.append(" where ").concat(" where ", ...symbol.constraints);

        sb.append(`${symbol.eol}{`);

        symbol.members.forEach((member, i) => {
            if (member.xmlComment) {
                if (i > 0) sb.append(symbol.eol);

                sb.append(`${symbol.eol}${settings.indentation}`).append(member.xmlComment.split(symbol.eol).join(`${symbol.eol}${settings.indentation}`));
            }

            sb.append(`${symbol.eol}${member.text}`);
        });

        sb.append(`${symbol.eol}}`);

        return sb.toString();
    }

    private static isInterfaceMemberType(symbol: CSharpSymbol): boolean {
        return symbol.symbolType === CSharpSymbolType.method
            || symbol.symbolType === CSharpSymbolType.property
            || symbol.symbolType === CSharpSymbolType.event
            || symbol.symbolType === CSharpSymbolType.indexer;
    }
}
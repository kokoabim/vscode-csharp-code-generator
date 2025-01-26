import { CSharpKeywords } from "../CSharp/CSharpKeywords";
import { CSharpSymbol } from "../CSharp/CSharpSymbol";
import { CSharpSymbolType } from "../CSharp/CSharpSymbolType";
import { StringBuilder } from "../Utilities/StringBuilder";

export class CSharpCodeGenerator {
    static createInterface(symbol: CSharpSymbol): CSharpSymbol {
        const interfaceSymbol = new CSharpSymbol();
        interfaceSymbol.accessModifier = symbol.accessModifier;
        interfaceSymbol.constraints = symbol.constraints;
        interfaceSymbol.implements = symbol.implements.filter(i => i.startsWith("I"));
        interfaceSymbol.name = `I${symbol.name}`;
        interfaceSymbol.namespace = symbol.namespace;
        interfaceSymbol.parent = symbol.parent;
        interfaceSymbol.returnType = "interface";
        interfaceSymbol.symbolType = CSharpSymbolType.interface;
        interfaceSymbol.typeName = `I${symbol.typeName}`;

        symbol.members.filter(m =>
            !m.isStaticMember
            && !m.isAbstractMember
            && (m.symbolType === CSharpSymbolType.method
                || m.symbolType === CSharpSymbolType.property
                || m.symbolType === CSharpSymbolType.event
                || m.symbolType === CSharpSymbolType.indexer)
            && CSharpKeywords.accessModifierIsEqualOrHigher(m.accessModifier, interfaceSymbol.accessModifier)
        ).forEach(member => {
            const memberSymbol = new CSharpSymbol();
            memberSymbol.constraints = member.constraints;
            memberSymbol.name = member.name;
            memberSymbol.parameters = member.parameters;
            memberSymbol.parent = interfaceSymbol;
            memberSymbol.returnType = member.returnType;
            memberSymbol.symbolType = member.symbolType;
            memberSymbol.typeName = member.typeName;
            memberSymbol.text = CSharpCodeGenerator.createInterfaceMemberText(member);
            interfaceSymbol.members.push(memberSymbol);
        });

        interfaceSymbol.text = CSharpCodeGenerator.createInterfaceText(interfaceSymbol);

        return interfaceSymbol;
    }

    static createInterfaceText(symbol: CSharpSymbol): string {
        const sb = new StringBuilder();

        if (symbol.accessModifier) sb.append(symbol.accessModifier).append(" ");

        if (symbol.returnType) sb.append(symbol.returnType).append(" ");

        sb.append(symbol.typeName);

        if (symbol.implements.length > 0) {
            sb.append(" : ");
            sb.concat(", ", ...symbol.implements);
        }

        if (symbol.constraints.length > 0) sb.concat(" where ", ...symbol.constraints);

        sb.append("\n{");

        symbol.members.forEach(member => {
            sb.append("\n    ").append(member.text);
        });

        sb.append("\n}");

        return sb.toString();
    }

    static createInterfaceMemberText(symbol: CSharpSymbol): string {
        const sb = new StringBuilder();

        if (symbol.returnType) sb.append(symbol.returnType).append(" ");

        sb.append(symbol.typeName);

        if (symbol.canHaveParameters && symbol.parameters) sb.append(symbol.parameters);

        if (symbol.symbolType === CSharpSymbolType.property || symbol.symbolType === CSharpSymbolType.indexer) {
            sb.append(" {");
            if (symbol.accessors.get !== undefined && (symbol.accessors.get === "" || CSharpKeywords.accessModifierIsEqualOrHigher(symbol.accessModifier, symbol.parent!.accessModifier))) sb.append(" get;");
            if (symbol.accessors.set !== undefined && (symbol.accessors.set === "" || CSharpKeywords.accessModifierIsEqualOrHigher(symbol.accessModifier, symbol.parent!.accessModifier))) sb.append(" set;");
            sb.append(" }");
        }

        if (symbol.constraints.length > 0) {
            sb.concat(" where ", ...symbol.constraints);
        }

        sb.append(";");

        return sb.toString();
    }
}
import * as ts from 'typescript';
import { ScriptTarget, SyntaxKind } from 'typescript';
import * as fs from 'fs';

const contractFile = process.argv[2];

const program = ts.createProgram({
  rootNames: [contractFile],
  options: {target: ScriptTarget.Latest, experimentalDecorators: true},
  projectReferences: null,
  host: null, // CompilerHost;
  oldProgram: null,
  configFileParsingDiagnostics: null
});

class LineWriter {
  tabs = 0;
  lines = [];
  tabChar: string;

  constructor(tabChar: string) {
    this.tabChar = tabChar;
  }

  tabbed(fn: Function) {
    this.tabs++;
    fn();
    this.tabs--;
  }

  pushLine(text: string = '') {
    let s = '';
    for (let i = 0; i < this.tabs; i++) {
      s = s.concat(this.tabChar);
    }
    this.lines.push(s + text);
  }

  push(text: string) {
    if (this.lines.length == 0) {
      this.pushLine();
    }
    this.lines[this.lines.length - 1] = this.lines[this.lines.length - 1] + text;
  }

  toString(): string {
    return this.lines.join("\n");
  }
}

const file = program.getSourceFile(contractFile);

let output = {
  contractName: null,
  contracts: [],
  classes: {}
};

let context: Array<number> = [0];

function getClasses(node: ts.Node) {
  switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        let clz = <ts.ClassDeclaration>node;
        output.classes[clz.name.text] = {rep: node, methods: {}};
        break;
    }
}

function processClass(clzName: string, clz: ts.ClassDeclaration, lines: LineWriter) {
  if (clz.members) {
    for (let member of clz.members) {
      switch (member.kind) {
        case ts.SyntaxKind.MethodDeclaration: {
          const method = <ts.MethodDeclaration>member;
          const nm = (<ts.Identifier>method.name).text;
          if (nm) {
              output.classes[clzName].methods[nm] = method.body;
              transpileMethod(clz, method, lines);
              lines.pushLine();
          }
          break;
        }
        case ts.SyntaxKind.PropertyDeclaration:
          const prop = <ts.PropertyDeclaration>member;
          lines.pushLine();

          if (!prop.type) {
            throw new Error("All contract state variables must have a type declaration.");
          }
          lines.push(getType(prop.type) + " ");

          let name = (<ts.Identifier>prop.name).text;
          lines.push(name[0] == '#' ? name.substring(1) : name);
          if (prop.initializer) {
            lines.push(" = ");
            transpileExpression(prop.initializer, lines);
          }
          lines.push(";");
          break;
        case ts.SyntaxKind.Constructor:
          const cstr = <ts.ConstructorDeclaration>member;
          const decl = getMethodDeclaration("constructor", cstr.parameters, null);
          lines.pushLine(decl);
          transpileFnBody(cstr.body, lines);
          lines.pushLine("}");
          break;
        default:
          lines.pushLine(`<classLevel id=${member.kind} />`);
      }
    }
  }
}

function getType(t: ts.TypeNode): string {
  switch (t.kind) {
    case ts.SyntaxKind.NumberKeyword:
      return "int256";
    case ts.SyntaxKind.StringKeyword:
      return "string";
    case ts.SyntaxKind.TypeReference:
      const type = (<ts.TypeReferenceNode>t).typeName;
      if (ts.isIdentifier(type)) {
        const tName = (<ts.Identifier>type).text;
        switch (tName) {
          case "UNSIGNED_INT":
            return "uint256";
          case "ADDRESS":
            return "address";
          case "Map":
            const args = (<ts.TypeReferenceNode>t).typeArguments;
            return `mapping(${getType(args[0])} => ${getType(args[1])})`
        }
        return tName;
      } else {
        throw new Error("Unknown type.");
      }
  }

  throw new Error("Unknown type: " + t.kind);
}

function getMethodDeclaration(name: string, params: ts.NodeArray<ts.ParameterDeclaration>, returnType: ts.TypeNode | null): string {
    const isPublic = name[0] != "#";
    if (!isPublic) {
      name = name.substring(1);
    }

    const renderedParams = [];
    for (let p of params) {
      const type = getType(p.type);
      const name = (<ts.Identifier>p.name).text;
      renderedParams.push(`${type} ${name}`);
    }
    const isConstructor = name == "constructor";
    const returnStmt = returnType ? ` returns (${getType(returnType)})` : '';
    return `${isConstructor ? '' : 'function '}${name}(${params.join(',')}) ${isPublic ? "public" : "private"}${returnStmt} {`;
}

function transpileToken(tk: ts.BinaryOperatorToken, lines: LineWriter) {
  switch (tk.kind) {
    case ts.SyntaxKind.AmpersandToken:
      lines.push(" & ");
      break;
    case ts.SyntaxKind.BarToken:
      lines.push(" | ");
      break;
    case ts.SyntaxKind.BarBarToken:
      lines.push(" || ");
      break;
    case ts.SyntaxKind.AmpersandAmpersandToken:
      lines.push(" && ");
      break;
    case ts.SyntaxKind.CaretToken:
      lines.push(" ^ ");
      break;
    case ts.SyntaxKind.PlusToken:
      lines.push(" + ");
      break;
    case ts.SyntaxKind.MinusToken:
      lines.push(" - ");
      break;
    case ts.SyntaxKind.MinusEqualsToken:
      lines.push(" -= ");
      break;
    case ts.SyntaxKind.LessThanToken:
      lines.push(" < ");
      break;
    case ts.SyntaxKind.GreaterThanToken:
      lines.push(" > ");
      break;
    case ts.SyntaxKind.LessThanEqualsToken:
      lines.push(" <= ");
      break;
    case ts.SyntaxKind.GreaterThanEqualsToken:
      lines.push(" >= ");
      break;
    case ts.SyntaxKind.EqualsEqualsToken:
      lines.push(" == ");
      break;
    case ts.SyntaxKind.ExclamationEqualsToken:
      lines.push(" != ");
      break;
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      lines.push(" == ");
      break;
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      lines.push(" != ");
      break;
    case ts.SyntaxKind.FirstAssignment:
      lines.push(" = ");
      break;
    default:
      lines.push(` <token id=${tk.kind}/> `);
      break;
  }
}

function transpileExpression(expr: ts.Expression, lines: LineWriter) {
  if (ts.isLiteralExpression(expr)) {
    if (expr.kind == ts.SyntaxKind.StringLiteral) {
      lines.push(`"${(<ts.StringLiteral>expr).text}"`);
    } else {
      lines.push(`${(<ts.LiteralExpression>expr).text}`);
    }
    return;
  }

  if (ts.isIdentifier(expr)) {
    const id = <ts.Identifier>expr;
    lines.push(id.text);
    return;
  }

  switch (expr.kind) {
    case ts.SyntaxKind.SuperKeyword:
      lines.push('super');
      break;
    case ts.SyntaxKind.ThisKeyword:
      lines.push("this");
      break;
    case ts.SyntaxKind.PropertyAccessExpression:
      const propExpr = <ts.PropertyAccessExpression>expr;
      let name = propExpr.name.text;
      if (name[0] == "#") {
        // this was a private variable. unescape it.
        name = name.substr(1);
      }
      transpileExpression(propExpr.expression, lines);
      lines.push(".");
      lines.push(name);
      break;
    case ts.SyntaxKind.ElementAccessExpression:
      const eltExpr = <ts.ElementAccessExpression>expr;
      transpileExpression(eltExpr.expression, lines);
      lines.push("[");
      transpileExpression(eltExpr.argumentExpression, lines);
      lines.push("]");
      break;
    case ts.SyntaxKind.BinaryExpression:
      const binExpr = <ts.BinaryExpression>expr;
      transpileExpression(binExpr.left, lines);
      transpileToken(binExpr.operatorToken, lines);
      transpileExpression(binExpr.right, lines);
      break;
    case ts.SyntaxKind.CallExpression:
      const callExpr = <ts.CallExpression>expr;

      // check to see if this is the privileged "ETH" import.
      if (
        callExpr.expression.kind == ts.SyntaxKind.PropertyAccessExpression &&
        ts.isIdentifier((<ts.PropertyAccessExpression>callExpr.expression).expression) &&
        (<ts.LiteralExpression>(<ts.PropertyAccessExpression>callExpr.expression).expression).text == "ETH"
      ) {
        switch ((<ts.PropertyAccessExpression>callExpr.expression).name.text) {
          case "assert":
            lines.push("assert")
            break;
          case "log":
            lines.push("emit ");
            break;
          case "transferToSenderWei":
            lines.push("msg.sender.transfer");
            break;
          default:
            throw new Error("Unknown builtin (ETH.*) function.");
            break;
        }
      } else {
        transpileExpression(callExpr.expression, lines);
      }

      lines.push("(");
      for (let i = 0; i < callExpr.arguments.length; i++) {
        transpileExpression(callExpr.arguments[i], lines);
        if (i < callExpr.arguments.length - 1) {
          lines.push(", ");
        }
      }
      lines.push(")");
      break;
    case ts.SyntaxKind.TrueKeyword:
      lines.push("true")
      break;
    case ts.SyntaxKind.FalseKeyword:
      lines.push("false");
      break;
    default:
      lines.push(`/* <expression kind=(${expr.kind}) /> */`);
      break;
  }
}

function bindingNameToText(name: ts.BindingName): string {
  return (<ts.Identifier>name).text;
}

function transpileStatement(stmt: ts.Statement, lines: LineWriter) {
  switch (stmt.kind) {
    case ts.SyntaxKind.ReturnStatement: {
      const retStmt = <ts.ReturnStatement>stmt;
      lines.push("return");
      if (retStmt.expression) {
        lines.push(" ");
        transpileExpression(retStmt.expression, lines);
      }
      lines.push(";");
      break;
    }
    case ts.SyntaxKind.IfStatement: {
      const ifStmt = <ts.IfStatement>stmt;
      lines.push("if (");
      transpileExpression(ifStmt.expression, lines);
      lines.push(")");
      lines.push(" {")
      lines.tabbed(() => {
        lines.pushLine();
        transpileStatement(ifStmt.thenStatement, lines);
      })
      lines.pushLine("}");
      if (ifStmt.elseStatement) {
         lines.pushLine("else {");
         transpileStatement(ifStmt.elseStatement, lines);
         lines.pushLine("}");
      }
      break;
    }
    case ts.SyntaxKind.VariableStatement:
      const varStmt = <ts.VariableStatement>stmt;

      const decls = varStmt.declarationList.declarations;
      for (let decl of decls) {
        const name = bindingNameToText(decl.name);
        const initializer = decl.initializer;
        if (!initializer) {
          throw new Error("All variables must be initialized.");
        }

        if (decl.type) {
          lines.push(getType(decl.type));
        } else {
          lines.push('var');
        }
        lines.push(` ${name} = `);
        transpileExpression(initializer, lines);
        lines.push(";");
      }
      break;
    case ts.SyntaxKind.ExpressionStatement:
      const exprStmt = <ts.ExpressionStatement>stmt;
      transpileExpression((<ts.ExpressionStatement>stmt).expression, lines);
      lines.push(";");
      break;
    case ts.SyntaxKind.WhileStatement: {
      const whileStmt = <ts.WhileStatement>stmt;
      lines.push("while (");
      transpileExpression(whileStmt.expression, lines);
      lines.push(") {");
      lines.tabbed(() => {
        transpileStatement(whileStmt.statement, lines);
      });
      lines.pushLine("}");
      break;
    }
    default: {
      lines.push(`/* <statement kind=${stmt.kind}> */`);
    }
  }
}

function transpileLine(stmt: ts.Statement, lines: LineWriter) {
  lines.pushLine();
  transpileStatement(stmt, lines);
}

function transpileFnBody(body: ts.FunctionBody, lines: LineWriter) {
  lines.tabbed(() => {
    if (body) {
      for (let stmt of body.statements) {
        transpileLine(stmt, lines);
      }
    }
  });
}

function transpileMethod(clz: ts.ClassDeclaration, meth: ts.MethodDeclaration, lines: LineWriter): void {
  const decl = getMethodDeclaration((<ts.Identifier>meth.name).text, meth.parameters, meth.type);
  lines.pushLine(decl);
  transpileFnBody(meth.body, lines);
  lines.pushLine('}')
}

// collect all classes as the first step, so we can verify heritage.
ts.forEachChild(file, node => {
  getClasses(node);
});

for (let clzName in output.classes) {
  let clz = <ts.ClassDeclaration>output.classes[clzName].rep;
  let writer = new LineWriter('   ');

  writer.pushLine(`contract ${clzName} {`);
  writer.tabbed(() => {
    processClass(clzName, clz, writer);
  });
  writer.pushLine('}');

  // print out transpiled class.
  console.log(writer.toString());
}

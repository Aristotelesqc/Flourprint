import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../package.json', import.meta.url));
const ts = require('typescript');

// Resolve finite class variants through TS types, not just classes rendered by one fixture.
export function auditMockupStyles() {
  const configPath = path.join(repo, 'docs/mockups/0.3-ux/tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const classes = new Map();
  const combine = (left, right) => left.flatMap((a) => right.map((b) => a + b)).slice(0, 512);
  function values(node, depth = 0) {
    if (depth > 15) throw Error('Class expression exceeds the audit recursion bound');
    const nested = (expression) => values(expression, depth + 1);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
    if (ts.isConditionalExpression(node))
      return [...nested(node.whenTrue), ...nested(node.whenFalse)];
    if (ts.isParenthesizedExpression(node)) return nested(node.expression);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return combine(nested(node.left), nested(node.right));
    if (ts.isTemplateExpression(node)) {
      let result = [node.head.text];
      for (const span of node.templateSpans)
        result = combine(result, nested(span.expression)).map((v) => v + span.literal.text);
      return result;
    }
    if (ts.isArrayLiteralExpression(node))
      return node.elements.reduce(
        (result, item) =>
          combine(
            result.map((v) => v + ' '),
            nested(item),
          ),
        [''],
      );
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ['join', 'filter'].includes(node.expression.name.text)
    )
      return nested(node.expression.expression);
    if (ts.isIdentifier(node)) {
      const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
      if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer)
        return nested(declaration.initializer);
    }
    const type = checker.getTypeAtLocation(node);
    const union = type.isUnion() ? type.types : [type];
    const literals = union.filter((t) => t.isStringLiteral()).map((t) => t.value);
    // Arbitrary caller className props are checked at their JSX call sites instead.
    return literals.length ? literals : [''];
  }
  for (const source of program.getSourceFiles()) {
    const relative = path.relative(repo, source.fileName).replaceAll('\\', '/');
    if (
      (!relative.startsWith('docs/mockups/0.3-ux/src/') &&
        !relative.startsWith('packages/ui/src/components/')) ||
      !relative.endsWith('.tsx')
    )
      continue;
    const visit = (node) => {
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(source) === 'className' &&
        node.initializer
      ) {
        const expression = ts.isJsxExpression(node.initializer)
          ? node.initializer.expression
          : node.initializer;
        if (expression)
          for (const value of values(expression))
            for (const token of value.split(/\s+/).filter(Boolean)) {
              const line = source.getLineAndCharacterOfPosition(node.pos).line + 1;
              classes.set(token, `${path.relative(repo, source.fileName)}:${line}`);
            }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const styled = new Set();
  for (const name of [
    ...readdirSync(path.join(repo, 'docs/mockups/0.3-ux/src'), { recursive: true })
      .filter((name) => name.endsWith('.css'))
      .map((name) => path.join('docs/mockups/0.3-ux/src', name)),
    'packages/ui/src/components.css',
    ...readdirSync(path.join(repo, 'packages/ui/src/components'), { recursive: true })
      .filter((name) => name.endsWith('.css'))
      .map((name) => path.join('packages/ui/src/components', name)),
  ]) {
    const css = readFileSync(path.join(repo, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!rule[2].includes(':')) continue; // Empty CSS cannot satisfy coverage.
      for (const match of rule[1]
        .replace(/\[[^\]]*\]/g, '')
        .matchAll(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g))
        styled.add(match[1]);
    }
  }
  return {
    classes: classes.size,
    missing: [...classes]
      .filter(([name]) => !styled.has(name))
      .map(([name, location]) => ({ name, location })),
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditMockupStyles();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.missing.length ? 1 : 0;
}

const path = require("path");
const babel = require("@babel/core");
const traverse = require("@babel/traverse").default;
const fs = require("fs");
const t = require("@babel/types");
const { patchSuffix } = require("./utils");
const { CLIENTHRREF } = require("./modules/utils");

function parseFileDep(moduleName, options = {}) {
  options.modulesCaches ??= new Map();
  const { base: moduleFileName } = path.parse(moduleName);
  const patchFilePath = moduleName;
  if (options.modulesCaches.has(patchFilePath)) {
    return options;
  }
  let code;
  const ast = babel.parseSync(
    (code = options.code ?? fs.readFileSync(patchFilePath, "utf-8")),
    {
      sourceType: "module",
    }
  );

  options.modulesCaches.set(patchFilePath, {
    deps: [],
    raloadDeps: [],
  });

  function addDept(moduleName, key = "deps") {
    if (moduleName === CLIENTHRREF) {
      return;
    }
    moduleName = patchSuffix(
      path.join(path.dirname(patchFilePath), moduleName)
    );
    options.modulesCaches.get(patchFilePath)[key].push(moduleName);
    return moduleName;
  }

  function patchHooks(key, ...args) {
    return options[key] && options[key](...args);
  }

  traverse(ast, {
    CallExpression(nodePath) {
      if (
        t.isImport(nodePath.node.callee) &&
        nodePath.node.arguments.length === 1
      ) {
        let l;
        if (t.isStringLiteral((l = nodePath.node.arguments[0]))) {
          const rc = addDept(l.value);
          rc &&
            patchHooks("CallExpressionAndImport", nodePath, nodePath.node, rc);
        } else {
          patchHooks(
            "CallExpressionAndImportNotStringLiteral",
            nodePath,
            nodePath.node,
            l,
            path.join(path.dirname(patchFilePath), "")
          );
        }
      }
    },
    ImportDeclaration(nodePath) {
      const node = nodePath.node;
      const source = node.source;
      const { extra, value } = source;
      const rc = addDept(value);
      rc && patchHooks("ImportDeclaration", nodePath, node, rc);
      // parseFileDep(value, options);
    },
  });
  const transformFromAstContent = babel.transformFromAstSync(ast, code, {
    sourceMaps: true,
    sourceType: "module",
    filename: moduleName,
  });
  return {
    options,
    code: transformFromAstContent.code,
    source: code,
    sourceMap: transformFromAstContent.map,
    fileName: moduleFileName,
  };
}

module.exports = {
  parseFileDep,
};

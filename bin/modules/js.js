const {
  CALLEXPRESSIONANDIMPORTNOTSTRINGLITERALREF,
  IMPORTMATEREF,
  CLIENTHRREF,
  generateHMRImportCode,
  generateDevHMRCallFunctionStrs,
} = require("./utils");
const { patchPathSlash, patchSuffix } = require("../utils");
const parseAst = require("../parseAst");
const t = require("@babel/types");
const { fileSetTimeHastCache } = require("../watcher");

const deps = new Map();

function createDep(moduleId) {
  let l;
  deps.set(moduleId, (l = new Set()));

  return (dep) => {
    l.add(dep);
  };
}

async function handleJs(jsCode, moduleName, { t, importPath } = {}) {
  const additionalCode = generateHMRImportCode();

  let {
    options: { modulesCaches },
    code,
    sourceMap,
  } = parseAst.parseFileDep(moduleName, {
    ...CreateAstTransfomrHandler({ t }, additionalCode, moduleName),
    code: jsCode,
  });

  additionalCode.add(
    `${IMPORTMATEREF}current_module_id = "${(ll =
      patchPathSlash(moduleName))}";`
  );
  additionalCode.add(
    `${IMPORTMATEREF}current_module_dept = ${JSON.stringify(
      modulesCaches.get(moduleName).deps.map(patchSuffix)
    )};`
  );
  additionalCode.add(`${IMPORTMATEREF}current_module_name = "${importPath}";`);
  additionalCode.add(generateDevHMRCallFunctionStrs().call);
  additionalCode.add(code);
  additionalCode.add(
    "//# sourceMappingURL=data:application/json;base64," +
      Buffer.from(JSON.stringify(sourceMap)).toString("base64")
  );
  return additionalCode;
}

function CreateAstTransfomrHandler(query, additionalCode, currentModuleName) {
  const depDelt = createDep(currentModuleName);
  return {
    CallExpressionAndImport(_, node, moduleName) {
      if (query.t || true) {
        const ca = fileSetTimeHastCache.get(moduleName);
        depDelt(moduleName);
        const source = node.arguments[0];
        const { value } = source;
        if (ca)
          source.value +=
            (value.indexOf("?") > -1 ? "&" : "?") + "t=" + ca.timestamp;
      }
    },
    ImportDeclaration(_, node, moduleName) {
      if (query.t || true) {
        depDelt(moduleName);
        const ca = fileSetTimeHastCache.get(moduleName);
        const source = node.source;
        const { value } = source;
        if (ca)
          source.value +=
            (value.indexOf("?") > -1 ? "&" : "?") + "t=" + ca.timestamp;
      }
    },
    CallExpressionAndImportNotStringLiteral(_, node, argv0, modulePath) {
      depDelt("@dynamics_import");
      additionalCode.add(
        `import { patchDynamicsImportHmrModuleDep as node_dynamics_import_hmr_path } from "${CLIENTHRREF}";`
      );
      const importPackageFnArgus = [
        `"${patchPathSlash(modulePath)}"`,
        `${IMPORTMATEREF}current_module_id`,
        JSON.stringify(
          query.t || true
            ? [...fileSetTimeHastCache].reduce(
                (p, [_, v]) => ((p[_] = v.timestamp), p),
                {}
              )
            : null
        ),
      ];
      if (argv0.callee) {
        const patchedCall = t.callExpression(
          t.identifier(CALLEXPRESSIONANDIMPORTNOTSTRINGLITERALREF),
          [argv0, ...argv0.arguments]
        );

        patchedCall.arguments.push(
          ...importPackageFnArgus.map((i) => t.identifier(i))
        );

        node.arguments[0] = patchedCall;
      } else {
        argv0.name =
          CALLEXPRESSIONANDIMPORTNOTSTRINGLITERALREF +
          `(${argv0.name},${importPackageFnArgus.join(",")})`;
      }
    },
  };
}

module.exports = {
  handleJs,
};

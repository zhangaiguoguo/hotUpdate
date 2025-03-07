const path = require("path");
const { patchSuffix, patchPathSlash } = require("../utils");
const { fileSetTimeHastCache } = require("../watcher");

const CLIENTHRREF = "/@client/hot";

const CODESYMBOLS = {
  n: `
`,
  semicolon: ";",
  s: " ",
};

const CALLEXPRESSIONANDIMPORTNOTSTRINGLITERALREF =
  "node_dynamics_import_hmr_path";

const IMPORTMATEREF = "import.meta.";

function patchModule(module) {
  return path.join(__dirname, "../../", patchSuffix(module));
}

function generateHMRImportCode() {
  const cs = new Set([
    `import { clientHotDeps as node_clientHotDeps } from "${CLIENTHRREF}";`,
  ]);
  const add = cs.add;

  cs.add = function (...args) {
    add.call(cs, CODESYMBOLS.n);
    add.apply(cs, args);
    return cs;
  };
  return cs;
}

function setResHeaderContentTypeJs(res) {
  res.setHeader("Content-type", "text/javascript");
}

function patchDynamicsImportHmrModuleQuery(t) {}

function generateDevHMRCallFunctionStrs() {
  return {
    call: `node_clientHotDeps(${IMPORTMATEREF}current_module_id,${IMPORTMATEREF}current_module_dept,${IMPORTMATEREF}current_module_name);`,
  };
}

module.exports = {
  setResHeaderContentTypeJs,
  generateHMRImportCode,
  patchModule,
  IMPORTMATEREF,
  CODESYMBOLS,
  CALLEXPRESSIONANDIMPORTNOTSTRINGLITERALREF,
  patchDynamicsImportHmrModuleQuery,
  CLIENTHRREF,
  generateDevHMRCallFunctionStrs
};

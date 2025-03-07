const { CLIENTHRREF, IMPORTMATEREF } = require("./utils");
const { isHttpUrl, patchImageBase64Url } = require("../utils");
const fs = require("fs");
const path = require("path");
const postCss = require("postcss");
const { addFileWatchEffect } = require("../watcher");

// const matchSymbols = {
//   "'": 39,
//   "`": 96,
//   '"': 34,
//   ")": 41,
//   " ": 32
// };

function patchCssImportParams(rule, dir) {
  const params = rule.params;
  if (!params) {
    return;
  }
  const [_, u, s, value] = /(url)?(\s)?(.+)/.exec(params) || [];
  const [__, bracket, quotatMark, content] = /(\()?(['"`]?)(.+)/.exec(value);
  let pathEndIndex;
  for (pathEndIndex = 0; pathEndIndex < content.length; pathEndIndex++) {
    let l;
    if (
      (l = content[pathEndIndex]).codePointAt() === 34 ||
      l.codePointAt() === 96 ||
      l.codePointAt() === 39 ||
      l.codePointAt() === 41 ||
      l.codePointAt() === 32
    ) {
      break;
    }
  }
  const [___, quotatMark2, bracket2, behindContent] = /(['"`]?)(\))?(.*)/.exec(
    content.slice(pathEndIndex)
  );
  const cssPath = content.slice(0, pathEndIndex);
  if (isHttpUrl(cssPath)) return;
  rule.remove();
  const importModuleName = path.join(dir, cssPath).replace("", "");
  return importModuleName;
}

const cModuleDir = path.join(__dirname, "../../");

async function parasCssToAst(code, module, dir, modules) {
  const postCssContext = postCss([
    async function (root) {
      const importModules = [];
      for (let index = 0; index < root.nodes.length; index++) {
        const rule = root.nodes[index];
        if (rule.type === "atrule") {
          if (rule.name === "import") {
            const importModulePath = patchCssImportParams(rule, dir);
            if (importModulePath) {
              index--;
              const flag = modules.has(importModulePath);
              if (!flag) {
                modules.add(importModulePath);
                const importCssCode = fs.readFileSync(
                  importModulePath,
                  "utf-8"
                );
                const moduleDir = path.dirname(importModulePath);
                importModules.unshift(
                  await parasCssToAst(
                    importCssCode,
                    importModulePath,
                    moduleDir,
                    modules
                  )
                );
              }
            }
          }
        } else if (rule.type === "rule") {
          for (let node of rule.nodes) {
            if (node.type === "decl") {
              const values = node.value.split(" ");
              let index = 0;
              for (let value of values) {
                if (value.startsWith("url(")) {
                  const [_, s, url, e] =
                    /(url\(["'`]?)(.+[^"'`])(["'`]?\))/.exec(value) || [];
                  if (url && !isHttpUrl(url)) {
                    values[index] = s + patchCssImportUrlContent(url, dir) + e;
                  }
                }
                index++;
              }
              node.value = values.join(" ");
            }
          }
        }
      }
      root.prepend(...importModules);
    },
  ]);

  ({ css: code } = await postCssContext.process(code, {}));

  return code;
}

function patchCssImportUrlContent(url, dir) {
  if (false && /\.svg$/.test(url)) {
    base64Content = Buffer.from(
      fs.readFileSync(path.join(dir, url), "utf8")
    ).toString("base64");
  } else {
    base64Content = fs.readFileSync(path.join(dir, url), "base64");
  }
  return patchImageBase64Url(url, base64Content);
}

async function handleCss(code, moduleName, importPath) {
  const { base } = path.parse(importPath);
  importPath = importPath[0] === "." ? importPath : "." + importPath;
  addFileWatchEffect(moduleName, (state) => {
    const { filePath } = state;
    if (currentModuleDeps.has(filePath)) {
      return {
        ...state,
        fileName: base,
        dir: moduleDir,
        filePath: moduleName,
        moduleName: importPath,
        isUpdateSelf: true,
      };
    }
  });
  const moduleDir = path.dirname(moduleName);
  let currentModuleDeps = new Set();
  code = await parasCssToAst(code, moduleName, moduleDir, currentModuleDeps);
  // currentModuleDeps = [...currentModuleDeps];
  const jsCode = createCssModuleJs(code);
  return (
    `
    
  ` + jsCode
  );
}

// ${([] || currentModuleDeps)
//   .map((moduleId) => `import "${moduleId}"`)
//   .join(CODESYMBOLS.n)}
//   import.meta.current_module_dept.push(...${JSON.stringify(
//     currentModuleDeps
//   )} );
//  ${generateDevHMRCallFunctionStrs().call}

function createCssModuleJs(code) {
  const jsCode = `
import { createHMRCssStyle as node_createHMRCssStyle,removeHMRCssStyle as node_removeHMRCssStyle,hmrPrune as node_hmrPrune_effect } from "${CLIENTHRREF}";
const code = \`${code}\`;
node_createHMRCssStyle(code,${IMPORTMATEREF}current_module_id)
node_hmrPrune_effect(${IMPORTMATEREF}current_module_id,node_removeHMRCssStyle)
      `;

  return jsCode;
}

module.exports = {
  handleCss,
};

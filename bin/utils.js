const path = require("path");

function patchSuffix(moduleName) {
  moduleName = String(moduleName);
  for (let w = moduleName.length - 1; w >= 0; w--) {
    if (moduleName[w] === ".") {
      return moduleName;
    }
    if (moduleName[w] === "/" || moduleName[w] === "\\") {
      break;
    }
  }
  return moduleName + ".js";
}

function patchPathSlash(path) {
  return path.replaceAll("\\", (v) => v + v);
}

function patchPathSlash2(path) {
  return path.replaceAll("\\", "/");
}

function isHttpUrl(url) {
  return /^(http:|https:)/.test(url);
}

function patchImageBase64Url(id, base64url) {
  const { ext } = path.parse(id);
  let lv = ext.slice(1);
  if (lv === "svg") {
    lv = "svg+xml";
  }
  return `data:image/${lv};base64,` + base64url;
}

module.exports = {
  patchSuffix,
  patchPathSlash,
  patchPathSlash2,
  isHttpUrl,
  patchImageBase64Url,
};

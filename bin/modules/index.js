const { handleJs } = require("./js");
const { handleCss } = require("./css");
const { setResHeaderContentTypeJs } = require("./utils");
const fs = require("fs");
const { patchImageBase64Url } = require("../utils");

const Plugins = [
  {
    name: "css",
    match: /.css$/,
    async transform(code, id, importPath) {
      code = await handleCss(code, id, importPath);
      return code;
    },
  },
  {
    name: "json",
    match: /.json$/,
    async transform(code, id) {
      return `export default ${code}`;
    },
  },
  {
    name: "Image",
    match: /\.png|\.jpg|\.gif|\.ico$/,
    async transform(code, id) {
      return `export default "${patchImageBase64Url(
        id,
        fs.readFileSync(id, "base64")
      )}"`;
    },
  },
  {
    name: "Svg",
    match: /.svg$/,
    async transform(code, id) {
      return `export default \`${fs.readFileSync(id, "utf-8")}\``;
    },
  },
];

const PluginsServerSelf = [
  {
    async transform(code, id, req, res) {
      const codes = await handleJs(code, id, {
        t: req.query.t,
        importPath: req.path,
      });
      setResHeaderContentTypeJs(res);

      return [...codes].join("");
    },
  },
];

function patchPluginsOptions(Plugins) {
  for (let plugin of Plugins) {
    const _match = plugin.match;
    if (_match === "string") {
      plugin.match = (v, match = _match) => match.includes(v);
    } else if (_match instanceof RegExp) {
      plugin.match = (v, match = _match) => match.exec(v);
    } else if (typeof _match !== "function") {
      plugin.match = (v, match = _match) => match.toString().includes(v);
    }
  }
}

patchPluginsOptions(PluginsServerSelf);
patchPluginsOptions(Plugins);

module.exports = {
  Plugins,
  PluginsServerSelf,
};

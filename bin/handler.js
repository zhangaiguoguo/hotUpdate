const fs = require("fs");
const path = require("path");
const {
  CLIENTHRREF,
  setResHeaderContentTypeJs,
  patchModule,
} = require("./modules/utils");
const { Plugins, PluginsServerSelf } = require("./modules/index");

async function patchRequestAssetsResponse(req, res, next) {
  switch (req.url) {
    case CLIENTHRREF: {
      setResHeaderContentTypeJs(res);
      res.write(fs.readFileSync(path.join(__dirname, "./client.js"), "utf8"));
      res.end();
      break;
    }
    default: {
      if (req.path !== "/") {
        try {
          const moduleName = patchModule(req.path);
          const suffix = path.extname(req.path).slice(1);
          let code = fs.readFileSync(moduleName, "utf-8");
          let moduleId = moduleName;
          for await (let plugin of Plugins) {
            if (plugin.match(moduleId)) {
              let result = await plugin.transform(code, moduleId, req.path);
              if (result) {
                if (typeof result !== "object") {
                  result = {
                    code: result,
                  };
                }
                code = result.code ?? code;
                moduleId = result.id ?? moduleId;
              }
            }
          }
          for await (let plugin of PluginsServerSelf) {
            code = await plugin.transform(code, moduleId, req, res);
          }
          res.write(code);
          res.end();
        } catch (e) {
          setResHeaderContentTypeJs(res);
          res.status(500)
          res.end();
          console.error(e.message || (e && e.toString()));
        }
      }
    }
  }
  return false;
}

module.exports = {
  patchRequestAssetsResponse,
};

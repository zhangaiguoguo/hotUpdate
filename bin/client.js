let pingTimer = null,
  currentClientHMRuuid = null;

function client() {
  const ws = new WebSocket("ws://localhost:3000");

  function ping() {
    clearInterval(pingTimer);
    pingTimer = setInterval(() => ws.send("ping"), 5000);
  }

  ws.onopen = () => {
    ws.send("connection");
    console.log("Connected to WebSocket server");
    ping();
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data) {
      handleMessage(data);
    }
  };

  ws.onclose = () => {
    setTimeout(client, 2000);
  };
}

async function handleMessage(data) {
  if (data.type === "hot") {
    const hotDatas = Array.isArray(data.data) ? data.data : [data.data];
    for (let hotData of hotDatas) {
      if (hotData.type === "refresh") {
        pageReload();
        break;
      }
      if (hotData.type === "change" || true) {
        const { filePath, timestamp, moduleName, isUpdateSelf } = hotData;
        if (!isUpdateSelf && HOT.some.has(filePath)) {
          const { deps } = HOT.some.get(filePath);
          for (let dep of deps) {
            const { moduleName } = HOT.deps2.get(dep);
            await importUpdatedModule({
              acceptedPath: moduleName.slice(1),
              timestamp,
              isWithinCircularImport: true,
            });
          }
        } else if (HOT.deps2.has(filePath)) {
          await importUpdatedModule({
            acceptedPath: moduleName,
            timestamp,
            isWithinCircularImport: true,
          });
        }
      }
    }
  } else if (data.type === "connection") {
    currentClientHMRuuid = data.uuid;
  }
}

function runHmrPruneEffect(moduleId) {
  if (HOT.pruneCaches.has(moduleId)) {
    const callbacks = [];
    HOT.pruneCaches.get(moduleId).forEach((fn) => callbacks.push(fn(moduleId)));
    return () => {
      for (let callback of callbacks) {
        callback && callback.call && callback();
      }
    };
  }
}

const base = "/";

client();
async function importUpdatedModule({
  acceptedPath,
  timestamp,
  explicitImportRequired,
  isWithinCircularImport,
}) {
  let [acceptedPathWithoutQuery, query] = acceptedPath.split(`?`);
  const importPromise = import(
    base +
      acceptedPathWithoutQuery +
      `?${explicitImportRequired ? "import&" : ""}t=${timestamp}${
        query ? `&${query}` : ""
      }`
  );
  if (isWithinCircularImport) {
    importPromise.catch(() => {
      console.info(
        `[hmr] ${acceptedPath} failed to apply HMR as it's within a circular import. Reloading page to reset the execution order. To debug and break the circular import, you can run \`vite --debug hmr\` to log the circular dependency path if a file change triggered it.`
      );
      pageReload();
    });
  }
  return await importPromise;
}
const debounceReload = (time) => {
  let timer;
  return () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    timer = setTimeout(() => {
      location.reload();
    }, time);
  };
};
const pageReload = debounceReload(50);

const HOT = {
  deps: new Map(),
  some: new Map(),
  deps2: new Map(),
  dynamicsImportMap: new Map(),
  pruneCaches: new Map(),
};

console.log(HOT);

export function clientHotDeps(path, deps, moduleName) {
  runHmrPruneEffect(path)?.();
  const deleteMap = [];
  const prevPathContent = HOT.deps2.get(path);
  HOT.deps2.set(path, { deps, moduleName });
  if (prevPathContent) {
    for (let d of prevPathContent.deps) {
      if (deps.some((id) => id === d)) {
        continue;
      }
      runHmrPruneEffect(d)?.();
      const dd = HOT.some.get(d);
      if (dd) {
        dd.deps.delete(path);
        deleteMap.push(dd);
      }
    }
  }
  if (deps) {
    for (let dep of deps) {
      if (!HOT.some.has(dep)) {
        HOT.some.set(dep, {
          deps: new Set(),
          path: dep,
        });
      }
      if (!HOT.deps.has(HOT.some.get(dep))) {
        HOT.deps.set(HOT.some.get(dep), HOT.some.get(dep).deps);
      }
      HOT.deps.get(HOT.some.get(dep)).add(path);
    }
  }

  {
    for (let dep of deleteMap) {
      if (dep.deps.size === 0) {
        HOT.deps.delete(dep);
        HOT.some.delete(dep.path);
      }
    }
  }

  return HOT;
}

export function patchDynamicsImportHmrModuleDep(
  module,
  dir,
  parentModule,
  hmrModules
) {
  let path = clientPathJoin(dir, patchSuffix(module)).replaceAll("/", "\\");
  let ll = HOT.some.get(path);
  if (!ll) {
    HOT.some.set(
      path,
      (ll = {
        deps: new Set(),
        path,
      })
    );
    HOT.deps.set(ll, ll.deps);
  }

  ll.deps.add(parentModule);

  HOT.dynamicsImportMap.set(path, arguments);

  if (hmrModules) {
    if (hmrModules[path]) {
      return (
        module +
        (module.indexOf("?") > -1 ? "&" : "?") +
        "t=" +
        hmrModules[path]
      );
    }
  }

  return module;
}

function createCssStyle(cssText, moduleId, attrKey) {
  const style = document.createElement("style");
  style.setAttribute(attrKey, moduleId);
  style.setAttribute("type", "text/css");
  style.textContent = cssText;
  document.head.appendChild(style);
}

const CSSSTYLEELMODULEIDATTRREF = "data-id-module";

export function createHMRCssStyle(cssText, moduleId) {
  createCssStyle(
    cssText,
    patchModulePathSlash(moduleId),
    CSSSTYLEELMODULEIDATTRREF
  );
}

export function removeHMRCssStyle(moduleId) {
  const els = [
    ...document.querySelectorAll(
      `style[${CSSSTYLEELMODULEIDATTRREF}="${patchModulePathSlash(moduleId)}"]`
    ),
  ];

  return () =>
    els.forEach((st) => {
      st.remove();
    });
}

export function hmrPrune(dep, fn) {
  if (!HOT.pruneCaches.has(dep)) {
    HOT.pruneCaches.set(dep, new Set());
  }
  let fnn;
  HOT.pruneCaches.get(dep).add(
    (fnn = (id) => {
      HOT.pruneCaches.get(dep).delete(fnn);
      return fn(id);
    })
  );
}

export function clientPathJoin(...parts) {
  const separatorRg = /(\/|\\)/;
  const separator = "/";

  function normalizeSegment(segment) {
    if (separatorRg.test(segment)) return "";
    return segment;
  }

  function normalizePath(path) {
    const segments = path
      .split(separatorRg)
      .map(normalizeSegment)
      .filter(Boolean);

    const stack = [];

    for (const segment of segments) {
      if (segment === "..") {
        if (stack.length > 0) {
          stack.pop();
        } else {
          stack.push("..");
        }
      } else if (segment !== ".") {
        stack.push(segment);
      }
    }

    return stack.join(separator);
  }

  return normalizePath(parts.join("/"));
}

export function patchSuffix(moduleName) {
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

export function patchModulePathSlash(modulePath) {
  modulePath = String(modulePath);
  return modulePath.replaceAll("\\", "/");
}

const path = require("path");
const chokidar = require("chokidar");
const { clients } = require("./ws");

let l;

const watcher = chokidar.watch((l = path.join(__dirname, "../")), {
  ignored: [path.join(l, "/bin"), path.join(l, "/node_modules")], // 忽略隐藏文件
  persistent: true, // 持续监听
});

const fileMap = new Map();

const fileWatchEffect = new Map();

function addFileWatchEffect(id, fn) {
  fileWatchEffect.set(id, fn);
}

function dispatchFileWatchEffect(state) {
  const result = [];
  for (let [_, fn] of fileWatchEffect) {
    const l = fn(state);
    l && result.push(l);
  }
  return result;
}

["add", "addDir", "change", "unlink", "unlinkDir"].forEach((k) => {
  watcher.on(
    ...(function (key) {
      return [
        key,
        (...args) => {
          dispatch(key, ...args);
        },
      ];
    })(k)
  );
});

function dispatch(eventName, id) {
  let dir;
  const [_, fileName] = id.split((dir = path.dirname(id)));
  effect({
    type: eventName,
    fileName,
    filePath: id,
    dir,
    moduleName: id.split(path.join(__dirname, "../")).at(-1),
    timestamp: Date.now(),
  });
}

function effect(data) {
  const datas = [data, ...dispatchFileWatchEffect(data)];
  for (let data of datas) {
    if (data.moduleName === "index.html") {
      data.type = "refresh";
    }
    fileMap.set(data.filePath, data);
  }
  for (let client of clients) {
    client.send(
      JSON.stringify({
        type: "hot",
        data: datas,
      })
    );
  }
}

module.exports = {
  fileSetTimeHastCache: fileMap,
  addFileWatchEffect,
};

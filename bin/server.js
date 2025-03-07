const express = require("express");
const session = require("express-session");
const uuid = require("uuid");
const path = require("path");
const app = express();
const fs = require("fs");
const http = require("http");
const { connectionWs } = require("./ws");
require("./watcher");
const port = 3000;
const { patchRequestAssetsResponse } = require("./handler");
const { CLIENTHRREF } = require("../bin/modules/utils");

app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
app.use(
  session({
    secret: "node_custom_hmr",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(async (req, res, next) => {
  if (!req.session.tabId) {
    req.session.tabId = uuid.v7();
  }
  if ((await patchRequestAssetsResponse(req, res, next)) === false) {
    next();
  }
});

app.get("/", function (req, res) {
  const template = fs.readFileSync(
    path.join(__dirname, "../index.html"),
    "utf-8"
  );
  const [templateStart, ...templateEnd] = template.split("</head>");
  const clientHotScript = `<script type="module" src="${CLIENTHRREF}"></script>`;
  res.write(templateStart);
  res.write("</head>");
  res.write(clientHotScript);
  res.write(templateEnd.join("</head>"));
  res.end();
});

const server = http.createServer(app);

connectionWs(server);

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}/`);
});

module.exports = {
  app,
  server,
};

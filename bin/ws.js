const Ws = require("ws");
const uuid = require("uuid");
const clients = new Set(),
  wss = {
    ws: null,
  };

function connectionWs(server) {
  wss.ws = new Ws.Server({ server });

  wss.ws.on("connection", (ws) => {
    clients.add(ws);

    ws.on("message", (message) => {});

    ws.send(
      JSON.stringify({
        type: "connection",
        uuid: (ws.clientUuid = uuid.v7()),
      })
    );

    ws.on("close", () => {
      clients.delete(ws);
    });
  });
}

module.exports = {
  connectionWs,
  wss,
  clients,
};

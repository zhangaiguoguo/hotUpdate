import * as client from "./client.js";

const str = "./b.js";

import("./bc.js");

export default function () {
  const div = document.createElement("div");
  div.innerHTML = "div - aa";
  document.body.appendChild(div);
}

export const a1 = "a1";

export const a2 = "a2";

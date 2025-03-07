import * as s from "../tests/a";

export const aa = 1;

const str = "../tests/b.js";

(
  await import(
    (function () {
      return str;
    })()
  )
).default();

export default function () {
  const div = document.createElement("div");
  div.innerHTML = "el - div - utils/a";
  document.body.appendChild(div);
}

console.log("utils/a");

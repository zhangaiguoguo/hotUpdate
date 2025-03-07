export default function () {
  const div = document.createElement("div");
  div.innerHTML = "div - test/a";
  document.body.appendChild(div);
  return 1;
}

console.log("tests/a");

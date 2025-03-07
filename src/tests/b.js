export default function () {
    const div = document.createElement("div");
    div.innerHTML = "div - test/b";
    document.body.appendChild(div);
    return 2;
  }
  
  console.log("tests/b");
  
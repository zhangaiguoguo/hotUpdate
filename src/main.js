import "./css/index.css";
import "./vue/index";
import HelloWrold from "./components/HelloWrold";

console.log("main");

const app = new Vue({
  render: (h) => h("div", { attrs: { id: "app" } }, [h(HelloWrold)]),
});

app.$mount("#app");

export default app;

import { h } from "../../dist/mini-vue.esm-bundler.js";

export default {
  name: "App",
  setup () {
    return {
      msg: "mini-vue",
    };
  },
  render () {
    return h("div", { id: "app" }, [
      h("h1", {}, "Hello " + this.msg),
      h("p", {}, "这是一个 mini-vue 示例"),
    ]);
  },
};

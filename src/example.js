import MyReact from "../myReact";
/**
 * const element = (
 * <div id="foo">
 *  <a>bar</a>
 *  <b />
 * </div>
 * );
 * const container = document.getElementById("root");
 * ReactDOM.render(element, container);
 */
/** @jsx MyReact.createElement */
const element = MyReact.createElement(
  "div",
  { id: "foo" },
  MyReact.createElement("a", null, "bar"),
  MyReact.createElement("b")
);
console.log(MyReact.createElement("div"));
console.log(MyReact.createElement("div", null, "a"));
console.log(MyReact.createElement("div", null, "a", "b"));
/**
 { type: 'div', props: { children: [] } }
{ type: 'div', props: { children: [ 'a' ] } }
{ type: 'div', props: { children: [ 'a', 'b' ] } }
 */

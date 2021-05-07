"use strict";

//创建元素节点
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
} //创建文本节点

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
} //渲染到页面

function render(container, element) {
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type); //将所有不是children的属性,赋值给dom

  Object.keys(element.props)
    .filter((key) => key !== "children")
    .forEach((name) => {
      dom[name] = element.props[name];
    }); //递归调用children

  element.props.children.forEach((child) => {
    render(dom, child);
  });
  container.appendChild(dom);
}

const MyReact = {
  createElement,
  createTextElement,
  render,
};
/** @jsx MyReact.createElement */
const element = MyReact.createElement(
  "div",
  {
    style: "background: salmon",
  },
  MyReact.createElement("h1", null, "Hello World"),
  MyReact.createElement(
    "h2",
    {
      style: "text-align:right",
    },
    "from MyReact"
  )
);
const container = document.getElementById("root");
MyReact.render(container, element);

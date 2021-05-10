"use strict";

/**
 * @jsx createElement
 */
const element = createElement(
  "div",
  {
    style: "background: salmon",
  },
  createElement("h1", null, "Hello World"),
  createElement(
    "h2",
    {
      style: "text-align:right",
    },
    "from MyReact"
  )
);

//createElement
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((item) =>
        typeof item === "object" ? item : createTextElement(item)
      ),
    },
  };
}

//createTextElement
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

//render
function render(container, element) {
  //根据element.type创建需要被添加的dom节点
  const _dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  //将除了children以外的其他属性，赋值给dom节点
  Reflect.ownKeys(element.props).forEach((key) => {
    key !== "children" && (_dom[key] = element.props[key]);
  }); //但是节点肯定不止一个,所以需要进行递归添加

  element.props.children.forEach((child) => render(_dom, child)); //添加到容器中

  container.appendChild(_dom);
}

render(document.getElementById("root"), element);

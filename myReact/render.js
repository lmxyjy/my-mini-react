export default function render(container, element) {
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  //将所有不是children的属性,赋值给dom
  Reflect.ownKeys(element.props)
    .filter((key) => key !== "children")
    .forEach((name) => {
      dom[name] = element.props[name];
    });

  //
  element.props.children.forEach((child) => {
    render(dom, child);
  });

  container.appendChild(dom);
}

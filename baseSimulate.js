const element = <h1 title="foo">Hello</h1>;
//编译成有效的js代码
const elementToJs = React.createElement("h1", { title: "foo" }, "Hello");
//实际变成了
const elementToJsObj = {
  type: "h1",
  props: {
    title: "foo",
    children: "Hello",
  },
};

//React.render(document.getElementById('root'),element)等效于下面的代码

//1.根据type创建对应的html标签
const node = document.createElement(elementToJsObj.type);
node["title"] = elementToJsObj.props.title;

//2.根据props创建对应的节点，使用createTextNode代替innerText。为了更加统一的处理其他元素
const text = document.createTextNode("");
text["nodeValue"] = elementToJsObj.props.children;

//3.获取容器并且将节点添加到容器中
const container = document.getElementById("root");
node.appendChild(text);
container.appendChild(node);

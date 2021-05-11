//第一阶段，不包含协调器的版本
let nextUnitOfWork = null;
let wipRoot = null;

//----------------------------scheduler 阶段----------------------------
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}
//浏览器自动调度任务
requestIdleCallback(workLoop);

//----------------------------reconcile 阶段----------------------------
const isProperty = (key) => key !== "children";
const TEXT_ELEMENT = Symbol("TEXT_ELEMENT"); //文本类型
//协调器，diff算法生效的位置
function reconcile(wipFiber, elements) {}
/**
 * 1，为jsx信息对象创建dom
 * 2，创建children的fiber
 * 3，返回下一个任务节点
 */
function performUnitOfWork(fiber) {
  console.log("fiber", fiber);
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;
  let newFiber = null;
  while (index < elements.length) {
    const element = elements[index];
    newFiber = {
      type: element.type,
      parent: fiber,
      props: element.props,
      dom: null,
    };
    //如果是子节点，那么设置fiber child指向
    if (index == 0) {
      fiber.child = newFiber;
      //如果是兄弟节点，那么设置为上一个element的sibling
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = elements;
    index++;
  }

  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    //如果有兄弟就找兄弟
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    //如果没有兄弟就找父元素的兄弟
    nextFiber = nextFiber.parent;
  }
}

//用于创建fiber对象的dom属性
function createDom(fiber) {
  const type = fiber.type;
  const dom =
    type === TEXT_ELEMENT
      ? document.createTextNode("")
      : document.createElement(type);

  // 添加属性
  Reflect.ownKeys(fiber.props)
    .filter(isProperty)
    .forEach((name) => (dom[name] = fiber.props[name]));

  return dom;
}

//----------------------------commit 阶段----------------------------
//挂载
function commitRoot() {
  commitWork(wipRoot.child);
  wipRoot = null;
}
//递归挂载子dom
function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const parentDom = fiber.parent.dom;
  parentDom.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
//----------------------------render 阶段----------------------------
//在render中设置根节点中的任务单元
function render(container, element) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
  };
  nextUnitOfWork = wipRoot;
}

//根据jsx模版创建对象
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
}

//创建文本对象
function createTextElement(text) {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

/** @jsx createElement */

const container = document.getElementById("root");
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

render(container, element);

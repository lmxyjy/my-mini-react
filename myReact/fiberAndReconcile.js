"use strict";

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

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}
//fiber和reconcile

let nextUnitOfWork = null; //下一个任务单元

let wipRoot = null; //当前根节点

let currentFiber = null; //当前的fiber tree

let deletions = null; //fiber中需要被删除的dom

//并发模式执行单元任务
function workLoop(deadline) {
  let shouldYield = false; //是否跳出此次循环

  //存在下一个单元的任务，同时还剩余了执行任务的时间
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; //判断剩余执行任务的时间是否小于1ms
  }

  //当所有的fiber都创建完成后，挂载当前fiber tree
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  //将后续需要执行的单元任务放入下一个空闲循环中
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop); //当浏览器空闲时，执行此循环任务

//1，添加元素的dom节点
//2，创建元素children属性的fiber对象
//3，选择返回下一个单元的任务
function performUnitOfWork(fiber) {
  //执行单元任务
  //如果fiber对象没有dom属性，说明不是根节点。那么生成其对应信息的dom节点
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  //如果fiber有parent属性，那么将创建好的dom添加到该节点中
  //这里会存在一个问题，当任务没有执行完毕时，界面上会加载不完整的dom
  // if (fiber.parent) {
  //   fiber.parent.dom.appendChild(fiber.dom);
  // }

  //为fiber的child节点创建newFiber
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements); // 返回下一个单元任务

  if (fiber.child) {
    //因为是先执行child，所以直接返回child节点
    return fiber.child;
  }

  //当当前dom树的所有child节点都执行完毕后，再执行sibling节点，child-->sibling-->parent 不断的归到root fiber
  let nextFiber = fiber;

  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    } //从sibling-->parent

    nextFiber = nextFiber.parent;
  }
}

//判断属性是否是事件
const isEvent = (key) => key.startsWith("on");
//判断是否为需要的属性
const isProperty = (key) => key !== "children" && !isEvent(key);
//判断是否为变化的属性
const isNew = (prev, next) => (key) => prev[key] !== next[key];
//判断是否为prev中与next不同的属性
const isGone = (prev, next) => (key) => !(key in next);

//根据传入的fiber对象创建dom元素
function createDom(fiber) {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type); //这里需要排除children属性
  updateDom(dom, {}, fiber.props);
  return dom;
}

//更新dom的props
function updateDom(dom, prevProps, nextProps) {
  //去除prve中与next不同的属性
  Reflect.ownKeys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => (dom[name] = ""));

  //设置属性
  Reflect.ownKeys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => (dom[name] = nextProps[name]));

  //移除不需要的或者变化的事件
  Reflect.ownKeys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key)) //如果新的属性中没有这个事件，或则这个事件在新属性中有并且不等于老属性
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  //添加新的事件
  Reflect.ownKeys(nextProps)
    .filter(isEvent)
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

//render
function render(container, element) {
  //使用传入的元素创建一个新的root fiber
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentFiber,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

//挂载
function commitRoot() {
  //删除不需要的dom
  deletions.forEach(commitWork);

  //渲染其他的dom
  commitWork(wipRoot.child);
  currentFiber = wipRoot; //挂载的时候，获取到currentFiber

  wipRoot = null;
}

//递归添加dom节点
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  //获取到父级dom
  const domParent = fiber.parent.dom;

  //处理不同的effectTag
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child); //添加子节点
  commitWork(fiber.sibling); //添加兄弟节点
}

//这个函数用于比较更新，也就是常说的diff生效的部分，这里主要是根据不同的情况，对fiber节点打上不同的tag。
//使得在commit的时候，依据这些tag对dom节点做不同的操作
function reconcileChildren(wipFiber, elements) {
  let index = 0; //获取到old fiber
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null; //记录上一个循环中的element生成的fiber

  //这里while循环很重要，能够生成我们需要的fiber树。
  /**
   * 详细的fiber结构如
   * @see '../img/fiber.png'
   */
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;
    //获取到老节点和新节点的type是否相同
    const sameType = oldFiber && element && element.type === oldFiber.type;

    //更新
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    //替换
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }

    //删除
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber; //此处是为了形成fiber tree结构 child 引用
      //如果不是第一个子节点，那么就是上一个element的下一个兄弟节点
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

const MyReact = {
  createElement,
  render,
};
/** @jsx MyReact.createElement */
const container = document.getElementById("root");

const updateValue = (e) => {
  rerender(e.target.value);
};

const rerender = (value) => {
  const element = MyReact.createElement(
    "div",
    null,
    MyReact.createElement("input", {
      onInput: updateValue,
      value: value,
    }),
    MyReact.createElement("h2", null, "Hello ", value)
  );
  MyReact.render(container, element);
};

rerender("World");

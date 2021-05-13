//第四阶段 包含了useState & useEffect
let nextUnitOfWork = null;
let wipRoot = null;
let currentFiber = null;
let deletions = null;
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
const isEvent = (key) => key.startsWith("on"); //是否是事件属性
const isProperty = (key) => key !== "children" && !isEvent(key); //是否是非children和非事件属性
const isGone = (prev, next) => (key) => !(key in next); //是否是next中不具有的属性
const isNew = (prev, next) => (key) => prev[key] !== next[key]; //是否是新属性
const isFunctionComponent = (fiber) => fiber.type instanceof Function; //是否是函数组件
const TEXT_ELEMENT = Symbol("TEXT_ELEMENT"); //文本类型
const UPDATE = Symbol("UPDATE"); //更新标识
const DELETE = Symbol("DELETE"); //删除标识
const PLACMENT = Symbol("PLACMENT"); //替换标识
//协调器，diff算法生效的位置
//对比新旧2棵fiber tree，找到不同的节点处理类型打上tag。在commit阶段统一的去处理
function reconcile(wipFiber, elements) {
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child; //对应的老节点
  let prevSibling = null;
  let newFiber = null;

  let index = 0;
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    const sameType = oldFiber && element && element.type === oldFiber.type;
    //type没有改变，意味着标签名不变，打上更新标识
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        props: element.props,
        effectTag: UPDATE,
      };
    }

    //替换标识
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        dom: null,
        parent: wipFiber,
        alternate: null,
        props: element.props,
        effectTag: PLACMENT,
      };
    }

    //删除标识
    if (oldFiber && !sameType) {
      oldFiber.effectTag = DELETE;
      deletions.push(oldFiber);
    }

    //替换oldFiber为下一个兄弟节点
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    //生成fiber树
    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}
/**
 * 1，为jsx信息对象创建dom
 * 2，创建children的fiber
 * 3，返回下一个任务节点
 */
function performUnitOfWork(fiber) {
  if (isFunctionComponent(fiber)) {
    updateFunctionComponent(fiber);
    //执行useEffect中的函数
    fiber.useEffectHooks.forEach((hook) => {
      hook.callTag && hook.callback();
    });
  } else {
    updateHostComponent(fiber);
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
  updateDom(dom, {}, fiber.props);

  return dom;
}
//更新dom节点
function updateDom(dom, prevProps, nextProps) {
  //删除next中没有的属性
  Reflect.ownKeys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => (dom[name] = ""));

  //添加新的属性
  Reflect.ownKeys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => (dom[name] = nextProps[name]));

  //移除不需要的监听事件
  Reflect.ownKeys(prevProps)
    .filter(isEvent)
    .filter(
      (key) =>
        isGone(prevProps, nextProps)(key) || isNew(prevProps, nextProps)(key)
    )
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  //添加新的监听事件
  Reflect.ownKeys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

//设置当前的活动hook
let updateFunctionFiber = null; //当前更新中的函数组件
let useStateHookIndex = null; //当前更新中的老fiber节点中的useState函数索引
let useEffectHookIndex = null; //当前更新中的老fiber节点中的useEffect函数索引
function setHookInfo(fiber) {
  updateFunctionFiber = fiber;

  updateFunctionFiber.useStateHooks = [];
  updateFunctionFiber.useEffectHooks = [];

  useStateHookIndex = 0;
  useEffectHookIndex = 0;
}
//更新函数组件
//1,执行返回组件，得到返回的结果
function updateFunctionComponent(fiber) {
  setHookInfo(fiber);
  const fn = fiber.type;
  const children = [fn(fiber.props)];
  reconcile(fiber, children);
}

//更新非函数组件
function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  const elements = fiber.props.children; //当前需要更新的列表
  reconcile(fiber, elements);
}
//----------------------------hooks----------------------------
function useState(initial) {
  //查看是否存在老fiber上的hook
  const oldHook =
    updateFunctionFiber.alternate &&
    updateFunctionFiber.alternate.useStateHooks &&
    updateFunctionFiber.alternate.useStateHooks[useStateHookIndex];

  //获取到更新的hook
  const hook = {
    state: oldHook ? oldHook.state : initial, //查看是否存在老得状态,还是第一次初始化
    queue: [], //这里设置队列数组的目的是为了，存在返回的setState被多次调用的情况。所以要设置数组要依次运行
  };

  //到setState调用时传入的参数列表
  const actions = oldHook ? oldHook.queue : [];
  //依次执行setState中的参数,传入上一个state
  actions.forEach((action) => (hook.state = action(hook.state)));

  //setState接受函数参数，也接受非函数参数
  function setState(action) {
    const _action = action instanceof Function ? action : () => action;
    hook.queue.push(_action);

    //指定react的下一个工作单元
    wipRoot = {
      dom: currentFiber.dom,
      props: currentFiber.props,
      alternate: currentFiber,
    };
    nextUnitOfWork = wipRoot;
    //清空之前需要删除的fiber节点
    deletions = [];
  }

  //在当前组件的hook列表中添加新的hook对象，里面记录了新的state以及新的调用队列
  updateFunctionFiber.useStateHooks.push(hook);
  //继续指定一下个需要执行的useState函数
  useStateHookIndex++;

  //返回当前的hook
  return [hook.state, setState];
}
function useEffect(callback, deps) {
  //获取到老得fiber节点上对应索引值的useEffect
  const oldFiber =
    updateFunctionFiber.alternate &&
    updateFunctionFiber.alternate.useEffectHooks &&
    updateFunctionFiber.alternate.useEffectHooks[useEffectHookIndex];

  //设置新的useEffect
  const hook = {
    callback: oldFiber ? oldFiber.callback : callback,
    deps: deps,
    callTag: oldFiber
      ? oldFiber.deps.find((dep, index) => dep !== deps[index])
      : true,
  };

  //将新的hook添加到列表中
  updateFunctionFiber.useEffectHooks.push(hook);
  useEffectHookIndex++;
}
//----------------------------commit 阶段----------------------------
//挂载
function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentFiber = wipRoot;
  wipRoot = null;
}
//递归挂载子dom
function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  //找到一个有dom节点的上级元素
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const parentDom = domParentFiber.dom;
  if (fiber.effectTag === UPDATE && fiber.dom) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === PLACMENT && fiber.dom) {
    parentDom.appendChild(fiber.dom);
  } else if (fiber.effectTag === DELETE) {
    // parentDom.removeChild(fiber.dom);
    commitDeletion(fiber, parentDom);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
//删除
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}
//----------------------------render 阶段----------------------------
//在render中设置根节点中的任务单元
function render(container, element) {
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

function Counter() {
  const [state, setState] = useState(1);
  const [state2, setState2] = useState(1);
  useEffect(() => {
    console.log("useEffect");
  }, [state2]);
  return createElement(
    "div",
    null,
    createElement(
      "h1",
      {
        onClick: () => {
          setState((c) => c + 1);
          setState((c) => c + 1);
        },
      },
      "Count: ",
      state
    ),
    ";",
    createElement(
      "h2",
      {
        onClick: () => setState2((c) => c - 1),
      },
      "Count: ",
      state2
    ),
    ";"
  );
}

const element = createElement(Counter, null);
const container = document.getElementById("root");
render(container, element);

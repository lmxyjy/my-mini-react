//fiber和reconcile
let nextUnitOfWork = null; //下一个任务单元
let currentFiber = null; //当前的fiber tree

//并发模式执行单元任务
function workLoop(deadline) {
  let shouldYield = false; //是否跳出此次循环
  //存在下一个单元的任务，同时还剩余了执行任务的时间
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; //判断剩余执行任务的时间是否小于1ms
  }

  //当所有的fiber都创建完成后，挂载当前fiber tree
  if (!nextUnitOfWork && currentFiber) {
    commitRoot();
  }

  //将后续需要执行的单元r任务放入下一个空闲循环中
  requestIdleCallback(workloop);
}

requestIdleCallback(workloop); //当浏览器空闲时，执行此循环任务

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
  let index = 0;
  let prevSibling = null; //记录上一个循环中的element生成的fiber

  //这里while循环很重要，能够生成我们需要的fiber树。
  /**
   * 详细的fiber结构如
   * @see '../img/fiber.png'
   */
  while (index < elements.length) {
    const element = elements[index];
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber, //此处是为了形成fiber tree结构 parent引用
      dom: null, //dom设置为null，当下一个任务节点进入的时候，重复上述过程为其创建
    };

    //如果是第一个子节点
    if (index === 0) {
      fiber.child = newFiber; //此处是为了形成fiber tree结构 child 引用
      //如果不是第一个子节点，那么就是上一个element的下一个兄弟节点
    } else {
      prevSibling.silbing = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }

  // 返回下一个单元任务
  if (fiber.child) {
    //因为是先执行child，所以直接返回child节点
    return fiber.child;
  }
  //当当前dom树的所有child节点都执行完毕后，再执行sibling节点，child-->sibling-->parent 不断的归到root fiber
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.silbing) {
      return nextFiber.silbing;
    }
    //从sibling-->parent
    nextFiber = nextFiber.parent;
  }
}

//判断是否为需要的属性
const isProperty = (key) => key !== "children";

//根据传入的fiber对象创建dom元素
function createDom(fiber) {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  //这里需要排除children属性
  Reflect.ownKeys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
}

//render
function render(container, element) {
  //使用传入的元素创建一个新的root fiber
  currentFiber = {
    dom: container,
    props: {
      children: [element],
    },
  };
  nextUnitOfWork = currentFiber;
}

//挂载
function commitRoot() {
  commitWork(currentFiber.child);
  currentFiber = null;
}
//递归添加dom节点
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  //获取到父级dom
  const domParent = fiber.parent.dom;

  domParent.appendChild(fiber.dom); //添加节点到父级
  commitWork(fiber.child); //添加子节点
  commitWork(fiber.silbing); //添加兄弟节点
}

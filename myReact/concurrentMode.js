//并发模式，
//为何要采用并发模式，因为之前的模式是通过递归实现的。如果有很多节点需要添加，那么递归的时间就会很长，
//浏览器中的线程会被长时间占用，因为递归一开始就没办法停止。
//反映到界面上就会掉帧，卡顿。

let nextUnitOfWork = null;
function workloop(deadline) {
  let shouldYield = false; //是否需要等待浏览器执行其他任务
  //如果有下一个单元到任务同时不需要等待浏览器执行其他任务
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = preformUnitOfWork(nextUnitOfWork); //执行当前任务单元，并且返回下一次的任务单元
    shouldYield = deadline.timeRemaining() < 1; //如果当前剩余执行任务的时间小于1ms，那么不再执行下一次循环
  }

  //增加挂载
  // if (!nextUnitOfWork && wipRoot) {
  //   commitRoot();
  // }

  requestIdleCallback(workloop); //将循环放到下一次空闲时间中执行
}

/**
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback
 * 使用空闲回调来创建这样一个循环，可以把它当做一个setTimeout,我们不会主动的去触发它的运行。
 * 而是在浏览器主线程空闲下来的时候自动去回调.
 *
 * react目前已经不在使用这个，而是使用scheduler这个包来实现
 */
requestIdleCallback(workloop);

//执行本次的单元任务，并且返回下一单元的任务
function preformUnitOfWork(nextUnitOfWork) {
  //todo
  //   1，add the element to the DOM
  //   2，create the fibers for the element’s children
  //   3，select the next unit of work
  //
}

//fiber和reconcile
let nextUnitOfWork = null;
function workLoop(deadline) {
  let shouldYield = false; //是否跳出此次循环
  //存在下一个单元的任务，同时还剩余了执行任务的时间
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = preformUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; //判断剩余执行任务的时间是否小于1ms
  }
  //将后续需要执行的单元r任务放入下一个空闲循环中
  requestIdleCallback(workloop);
}

requestIdleCallback(workloop); //当浏览器空闲时，执行此循环任务

/**
 * 执行单元任务，并且返回下一单元的任务
 */
function preformUnitOfWork(nextUnitOfWork) {
  //执行单元任务
}

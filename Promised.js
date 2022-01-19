class Promised {
  // 定义静态状态
  static PENDING = "pending";
  static FUlFILLED = "fulfilled";
  static REJECTED = "rejected";
  // 接受一个包含resolve reject的方法
  constructor(executor) {
    // 初始状态为pending
    this.state = Promised.PENDING;
    // 初始化结果
    this.result = null;
    // relove方法队列,多次调用时保存方法
    this.resolveFcn = [];
    // reject方法队列
    this.rejectFcn = [];
    // 定义resolve，
    let resolve = (v) => {
      // resolve是异步执行，所以用setTimeout来模拟异步
      setTimeout(() => {
        // 调用resolve时将状态置为fulfilled
        this.state = Promised.FUlFILLED;
        // 并保存结果
        this.result = v;
        // 如果方法队列中有保存方法则依次执行
        if (this.resolveFcn.length) {
          for (let fn of this.resolveFcn) {
            fn(this.result);
          }
        }
      });
    };
    // 定义reject方法
    let reject = (v) => {
      //setTimeout模拟异步
      setTimeout(() => {
        // 调用reject将状态置为rejected
        this.state = Promised.REJECTED;
        // 并保存结果
        this.result = v;
        // 如果方法队列中有保存方法则依次执行
        if (this.rejectFcn.length) {
          for (let fn of this.rejectFcn) {
            fn(this.result);
          }
        }
      });
    };
    // 自动执行excutor方法
    executor(resolve, reject);
  }
  /* 
  定义then方法
  接受两个方法onFulfilled,onRejected分别再fulfilled和rejected时调用
  */
  then(onFulfilled, onRejected) {
    // 对入参进行预处理
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : (v) => v;
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (r) => {
            throw r;
          };
    // 由于then的链式调用，所以then返回一个新的promise对象
    const promise2 = new Promised((resolve, reject) => {
      // 定义通用执行方法
      const excuter = (handler) => {
        try {
          let x = handler(this.result);
          // 取then的返回值根据不同的类型进行解决
          resolvePromise(promise2, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      };
      if (this.state === Promised.FUlFILLED) {
        // 犹豫promise.then做异步处理，所以用setTimeout模拟
        setTimeout(() => {
          excuter(onFulfilled);
        });
      }
      if (this.state === Promised.REJECTED) {
        setTimeout(() => {
          excuter(onRejected);
        });
      }
      // 当出现多次调用是保存方法置队列
      if (this.state === Promised.PENDING) {
        this.resolveFcn.push(() => {
          setTimeout(() => {
            excuter(onFulfilled);
          });
        });
        this.rejectFcn.push(() => {
          setTimeout(() => {
            excuter(onRejected);
          });
        });
      }
    });
    return promise2;
  }
}
 
/* 
对resolve()、reject() 进行改造增强 针对resolve()和reject()中不同值情况 进行处理
promise2 promise1.then方法返回的新的promise对象
x         promise1中onFulfilled或onRejected的返回值
resolve   promise2的resolve方法
reject    promise2的reject方法
*/
function resolvePromise(promise2, x, resolve, reject) {
  // 如果promise2与x相同则抛出异常避免陷入死循环
  if (promise2 === x) {
    return reject(new TypeError("Chaining cycle detected for promise"));
  }
  // 如果x为promise
  if (x instanceof Promised) {
    // 如果x为fulfilled状态则直接resolve
    if (x.state === Promised.FUlFILLED) {
      resolve(x.result);
    }
    if (x.state === Promised.REJECTED) {
      reject(x.result);
    }
    // 如果x为pedding状态则等待执行完成，将其结果再次判断执行
    if (x.state === Promised.PENDING) {
      x.then((y) => {
        resolvePromise(promise2, y, resolve, reject);
      }, reject);
    }
  }
  // 如果x为对象或者function,则取 x.then 的值，如果抛出错误 e ，则以 e 为据因拒绝 promise
  else if (x != null && (typeof x === "object" || typeof x === "function")) {
    let then;
    try {
      then = x.then;
    } catch (e) {
      return reject(e);
    }
    // 当作promise再处理一次
    if (typeof then === "function") {
      // 调用标识 避免多次调用
      //  // 2.3.3.3.3 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
      let called;
      try {
        then.call(
          x,
          (y) => {
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          (e) => {
            if (called) return;
            called = true;
            reject(e);
          }
        );
      } catch (e) {
        if (called) return;
        called = true;
        reject(e);
      }
    } else {
      resolve(x);
    }
  } else {
    // 如果不是promise对象直接返回值
    return resolve(x);
  }
}
Promised.deferred = function () {
  let result = {};
  result.promise = new Promised((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;
};

module.exports = Promised;

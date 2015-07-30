'use strict';

var log = console;

log.info('Queue.push(hello)');

var maxCount = 1e6;
var expected = maxCount * (maxCount + 1) / 2; // sum(1..maxCount)
var startTime;

function runner(func, name) {
  function start() {
    startTime = +new Date();
  }

  function stop(aSum) {
    var elapsed = +new Date() - startTime;
    log.info('time::%s %d ms for %d events', name, elapsed, maxCount);
    log.info('%s::Expected %d, got %d: %s', name, expected, aSum, (expected === aSum) ? 'OK' : 'NOT OK');
    return elapsed;
  }
  return function() {
    return Promise.resolve(42)
      .then(start)
      .then(func)
      .then(stop);
  };
}

function simple() {
  var sum = 0;
  for (var i = 1; i <= maxCount; i++) {
    sum += i;
  }
  return Promise.resolve(sum);
}

// with promises
function simpleP() {
  var i = 1;
  var sum = 0;

  function loop() {
    // log.info('enter %d', i);
    sum += i++;
    var p = Promise.resolve(sum);
    if (i <= maxCount) {
      p = p.then(loop);
    }
    return p;
  }

  return loop();
}

Promise.resolve(42)
  .then(runner(simple, 'Simple'))
  .then(runner(simpleP, 'Promise'));

'use strict';

var log=console;

log.info('Queue.push(hello)');

var maxCount = 1e6;
var startTime;

function start() {
  startTime = +new Date()
}

function stop() {
  var elapsed =  +new Date() - startTime;
  log.info('time: %d ms for %d events',elapsed,maxCount);
  return elapsed;
}

function simple() {
  var sum = 0;
  var expected = maxCount * (maxCount + 1) / 2; // sum(1..maxCount)

  for (var i = 1; i <= maxCount; i++) {
    sum += i;
  }
  log.info('Expected %d, got %d: %s', expected, sum, (expected === sum) ? 'OK' : 'NOT OK');

}

Promise.resolve(42)
  .then(start)
  .then(simple)
  .then(stop);

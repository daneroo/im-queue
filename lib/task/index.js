'use strict';

/*
  This wraps all tasks and a default runner

  For now the tasks are just Promise return functions (which should take maxCount and other options as a parameter)
*/
// dependencies - core-public-internal
var log = require('../log');

exports = module.exports = {
  runner: runner,
  tasks: {
    simple: simple,
    simpleP: simpleP,
    redis: redis,
  }
};

// Setup iterating processes
var maxCount = 1e2;
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

// Kue section
var kue = require('kue'),
  queue = kue.createQueue({
    prefix: 'q',
    redis: {
      // port: 6379,
      host: 'red',
      // host: 'docker',
      // auth: 'password',
      // db: 3, // if provided select a non-default redis db
      options: {
        // see https://github.com/mranney/node_redis#rediscreateclient
      }
    }
  });

function publishKueJob(i) {
  return new Promise(function(resolve, reject) {
    var job = queue.create('integer', {
      i: i
    }).save(function(error) {
      if (!error) {
        log.info('job.id', job.id);
        resolve(i);
      } else {
        log.error('publishKueJob::Error', error);
        reject(error);
      }
    });

  });
}

function redis() {

  var p = Promise.resolve(42);
  for (var i = 0; i < maxCount; i++) {
    p = p.then(function() {
      var ii = i;
      return publishKueJob(ii);
    });
  }

  queue.process('integer', function(job, done) {
    log.info('processing job.data', job.data);
    done();
  });
  return simple();
}

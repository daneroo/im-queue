'use strict';

/*
  This wraps all tasks and a default runner

  For now the tasks are just Promise return functions (which should take maxCount and other options as a parameter)
*/
// dependencies - core-public-internal
var Rx = require('rx');
var kue = require('kue');
var log = require('../log');

exports = module.exports = {
  runner: runner,
  tasks: {
    simple: simple,
    simpleP: simpleP,
    redis: redis,
    reactive: reactive
  }
};

// Setup iterating processes
var maxCount = 1e1;
var expected = maxCount * (maxCount + 1) / 2; // sum(1..maxCount)

function runner(func, name) {
  var startTime;

  function start() {
    startTime = +new Date();
  }

  function stop(aSum) {
    var elapsed = +new Date() - startTime;
    var rate = (maxCount / (elapsed / 1000)).toExponential(1);
    // var rate = maxCount / (elapsed / 1000);
    log.info('-%s rate %s/s [%d events / %d ms', name, rate, maxCount, elapsed);
    if (expected !== aSum) {
      log.warn('%s::Expected %d, got %d: %s', name, expected, aSum);
    }
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

function reactive() {
  return new Promise(function(resolve, reject) {
    // Creates an observable sequence of 5 integers, starting from 1
    var source = Rx.Observable.range(1, maxCount);

    var sum = 0;

    // Prints out each item
    var subscription = source.subscribe(
      function(x) {
        // log.info('onNext: %s', x);
        sum += x;
      },
      function(error) {
        log.error('onError: %s', error);
        reject(error)
      },
      function() {
        // log.info('onCompleted sum=%d', sum);
        resolve(sum);
      });
  });

}

// Kue section
var queueSingleton;

function createQueue() {
  var host = process.env.REDIS_HOST || 'red';
  // only create queue once
  var first = !queueSingleton;
  log.info('-createQueue on: %s', host,first,queueSingleton.client.address);
  queueSingleton = queueSingleton || kue.createQueue({
    prefix: 'q',
    redis: {
      // port: 6379,
      // override with: REDIS_HOST=docker npm start
      host: host,
      // host: 'docker',
      // auth: 'password',
      // db: 3, // if provided select a non-default redis db
      options: {
        // see https://github.com/mranney/node_redis#rediscreateclient
      }
    }
  });
  log.info('+createQueue on: %s', host,first,queueSingleton.client.address);
  // log.info('REDIS pointing to: ', queueSingleton.client.address,first);
  if (first) {
    log.info('REDIS pointing to: ', queueSingleton.client.address);
  }
  return queueSingleton;
}

function publishKueJob(i) {
  var queue = createQueue();
  log.info('-%d REDIS pointing to: ', i, queue.client.address);

  return new Promise(function(resolve, reject) {
    var job = queue.create('integer', {
      i: i
    }).save(function(error) {
      if (!error) {
        log.info('job.id', job.id);
        // log.info('job', job);
        resolve(i);
      } else {
        log.error('publishKueJob::Error', error);
        reject(error);
      }
    });

  });
}

//TODO redo iteration, once we get reactive!
function redis() {
  log.info('start redis');
  return new Promise(function(resolve, reject) {
    // Creates an observable sequence of 5 integers, starting from 1
    var source = Rx.Observable.range(1, maxCount);

    var sum = 0;

    // Prints out each item
    var subscription = source.subscribe(
      function(x) {
        log.info('onNext: %s', x);
        publishKueJob(x);
        log.info('+onNext: %s', x);
        sum += x;
      },
      function(error) {
        log.error('onError: %s', error);
        reject(error)
      },
      function() {
        // log.info('onCompleted sum=%d', sum);
        resolve(sum);
      });
  });
  queue.process('integer', function(job, done) {
    log.info('processing job.data', job.data);
    done();
  });


  return simple();
}

'use strict';

/*
  This wraps all tasks and a default runner

  For now the tasks are just Promise return functions (which should take maxCount and other options as a parameter)
*/
// dependencies - core-public-internal
var Rx = require('rx');
var kue = require('kue');
var log = require('../log');
var metrics = require('../metrics');

exports = module.exports = {
  runner: runner,
  tasks: {
    simple: simple,
    simpleP: simpleP,
    reactive: reactive,
    mysql: mysql,
    redis: redis,
    rabbit: rabbit
  }
};

simple.engine = 'Simple';
simpleP.engine = 'SimpleP';
reactive.engine = 'Reactive';
mysql.engine = 'MySQL';
redis.engine = 'RedisKue';
rabbit.engine = 'RabbitMQ';

// Setup iterating processes
var maxCount = 1e3;
var expected = maxCount * (maxCount + 1) / 2; // sum(1..maxCount)

function runner(func) {
  var name = func.engine;
  var startTime;

  function start() {
    startTime = +new Date();
  }

  function stop(aSum) {
    var elapsed = Math.max(+new Date() - startTime,1)
    var rate = (maxCount / (elapsed / 1000));
    metrics.set({
      name: 'batch_rate',
      engine: name,
    }, rate);

    rate = rate.toExponential(1);
    log.info('-%s rate %s/s [%d events / %d ms]', name, rate, maxCount, elapsed);

    if (expected !== aSum) {
      log.warn('%s::Expected %d, got %d', name, expected, aSum);
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
    /* var subscription = */
    source.subscribe(
      function(x) {
        // log.info('onNext: %s', x);
        sum += x;
      },
      function(error) {
        log.error('onError: %s', error);
        reject(error);
      },
      function() {
        // log.info('onCompleted sum=%d', sum);
        resolve(sum);
      });
  });

}

// Kue section
var queueSingleton;
// create or return the queue singleton
function createQueue() {
  var host = process.env.REDIS_HOST || 'red';
  // only create queue once
  var first = !queueSingleton;
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
  // log.info('REDIS pointing to: ', queueSingleton.client.address,first);
  if (first) {
    // log.info('+createQueue on redis: %s', host, first, queueSingleton.client.address);
  }
  return queueSingleton;
}

var isStarted = false;
var globalSum = 0;
var globalResolver;

function startConsumerIfNotStartedAndResolveWith(nuResolver) {
  var messagesAtATime = 10;
  var queue = createQueue();
  globalResolver = nuResolver;

  globalSum = 0;
  if (!isStarted) {
    isStarted = true;
    queue.process('integer', messagesAtATime, function(job, ctx, done) {
      globalSum += job.data.i;
      // log.info('processing job.data:%d sum:%d', job.data.i, globalSum);
      done();
      metrics.increment({
        name: 'pop_total',
        engine: 'Redis'
      });

      // is the whole sequence done?
      if (job.data.done) {
        // log.info('RedisKue batch done');
        // ctx.pause(); // cause I create a new worker every bartch!!!!
        globalResolver(globalSum);
      }
    });

  }

}

function publishKueJob(x) {
  var queue = createQueue();
  // log.info('-%d REDIS pointing to: ', i, queue.client.address);

  return new Promise(function(resolve, reject) {
    /*var job = */
    queue.create('integer', x)
      .priority(x.done ? 'low' : 'normal')
      .removeOnComplete(true)
      .save(function(error) {
        if (!error) {
          // log.info('job.id', job.id);
          resolve(x);
          metrics.increment({
            name: 'push_total',
            engine: 'Redis'
          });
        } else {
          log.error('publishKueJob::Error', error);
          reject(error);
        }
      });

  });
}

function redis() {
  // log.info('start redis');
  return new Promise(function(resolve, reject) {
    // Creates an observable sequence of maxCount integers, starting from 1
    var source = Rx.Observable
      .range(1, maxCount)
      .map(function(i) {
        return {
          i: i,
          done: i === maxCount
        };
      });

    startConsumerIfNotStartedAndResolveWith(resolve);

    /*var subscription = */
    source.subscribe(
      function(x) {
        // log.info('onNext: %s', x);
        publishKueJob(x);
        // log.info('+onNext: %s', x);
        // sum    qq+= x;
      },
      function(error) {
        log.error('onError: %s', error);
        reject(error);
      },
      function() {
        // log.info('onCompleted sum=%d', sum);
        // resolve in the consummer.
        // resolve(sum);
      });

  });

}

// Rabbit section

var globalRabbit;

function getRabbit() {
  globalRabbit = globalRabbit || require('amqplib').connect('amqp://rabbit')
    .then(null, log.warn);
  return globalRabbit;
}

// Is it ok to use a single channel for both pub and sub?
var globalRabbitChannel;

function getRabbitChannel() {
  globalRabbitChannel = globalRabbitChannel || getRabbit()
    .then(function(conn) {
      return conn.createChannel();
    })
    .then(null, log.warn);
  return globalRabbitChannel;
}

var rabbitConsumerStarted = false;
var rabbitSum = 0;
var rabbitResolver;

function rabbit() {
  return new Promise(function(resolve, reject) {
    rabbitResolver = resolve;
    var q = 'tasks';

    var source = Rx.Observable
      .range(1, maxCount)
      .map(function(i) {
        return {
          i: i,
          done: i === maxCount
        };
      });

    function setupConsumer() {
      rabbitSum = 0;

      if (rabbitConsumerStarted) {
        // log.info('Rabbit::Consumer already setup: %d', rabbitSum);
        return;
      }
      // log.info('Rabbit::Setup new consumer: %d', rabbitSum);
      // Consumer
      getRabbitChannel()
        .then(function(ch) {
          ch.assertQueue(q);
          ch.consume(q, function(msg) {
            if (msg !== null) {
              var jobData = JSON.parse(msg.content.toString());
              // console.log(jobData);
              ch.ack(msg);
              rabbitSum += jobData.i;

              metrics.increment({
                name: 'pop_total',
                engine: 'RabbitMQ'
              });
              if (jobData.done) {
                // log.info('This would be a good time to resolve %d',rabbitSum);
                rabbitResolver(rabbitSum);
              }
            }
          });
          rabbitConsumerStarted = true;
        });
    }
    setupConsumer();

    // Publisher
    getRabbitChannel()
      .then(function(ch) {
        ch.assertQueue(q);
        /*var subscription = */
        source.subscribe(
          function(x) {
            // log.info('onNext: %s', x);
            ch.sendToQueue(q, new Buffer(JSON.stringify(x)));

            metrics.increment({
              name: 'push_total',
              engine: 'RabbitMQ'
            });

          },
          function(error) {
            log.error('onError: %s', error);
            // reject(error);
          },
          function() {
            // log.info('onCompleted sum=%d', sum);
            // resolve in the consummer.
            // resolve(sum);
          });
      });

  });

}

// MySQL Section

var mysqlQ = require('./mysqlQ');

function mysql() {
  return new Promise(function(resolve, reject) {

    var source = Rx.Observable
      .range(1, maxCount)
      .map(function(i) {
        return {
          i: i,
          done: i === maxCount
        };
      });

    // start consumer if not started, resolve when done.
    mysqlQ.consume(resolve);

    // Publisher
    mysqlQ.initializeDatabase()
      .then(function(attempt) {
        // log.info('initializeDatabase should be done attempt:', attempt);
        //  subscribe - make new observables, concat to fletten
        source.map(function(x) {
            // log.info('-mysql.push(%j)', x);
            // return a sub-sequence(from a promise)
            return Rx.Observable.defer(function() {
              // log.info('+mysql.push(%j)', x);
              return mysqlQ.push(x);
            });
          })
          .concatAll()
          .subscribe(function(result) {
              // log.info('async return for id:', result[0].insertId);
            }, function(error) {
              log.error('onError: %s', error);
            },
            function() {
              // log.info('MySQL.push completed');
            });
      })
      .catch(function(error) {
        log.error('Could not initialize database', error.code);
      });


  });

}

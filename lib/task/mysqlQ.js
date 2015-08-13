'use strict';

// dependencies - core-public-internal
var bluebird = require('bluebird');
var mysql = require('mysql');
var log = require('../log');
var metrics = require('../metrics');

exports = module.exports = {
  initializeDatabase: initializeDatabase,
  push: push,
  consume: consume
};

bluebird.promisifyAll(require('mysql/lib/Connection').prototype);
bluebird.promisifyAll(require('mysql/lib/Pool').prototype);

var host = process.env.MYSQL_HOST || 'mydb';
var pool = mysql.createPool({
  connectionLimit: 10,
  host: host,
  port: 3306,
  database: 'queue',
  user: 'imetrical',
  password: 'secret',
  connectTimeout: 1000
});

function initializeDatabase(attempt) {
  var maxRetries = 100;
  attempt = attempt || 1;
  // log.info('-initializeDatabase', attempt);
  var jobsDDL = 'CREATE TABLE IF NOT EXISTS jobs (id INT NOT NULL AUTO_INCREMENT, i INT NOT NULL, done BOOL NOT NULL, PRIMARY KEY (id))';
  return pool.queryAsync(jobsDDL)
    .then(function() {
      // log.info('+initializeDatabase', attempt);
      return attempt;
    })
    .catch(function(err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        // this is ok...
        return attempt;
      }
      if (attempt > maxRetries || err.code !== 'ECONNREFUSED') {
        log.error('initializeDatabase', attempt, err.code);
        throw err;
      }
      return bluebird.delay(500).then(function() {
        return initializeDatabase(attempt + 1);
      });
    });
}

function push(x) {
  // should I reconnect?
  // log.info('-push:%j', x);
  metrics.push_counter.increment({
    engine: 'MySQL'
  });
  return pool.queryAsync('INSERT INTO jobs SET ?', {
    i: x.i,
    done: x.done ? 1 : 0
  });
}

var mysqlConsumerStarted = false;
var mysqlSum = 0;
var mysqlResolver;

function consume(resolve) {
  mysqlResolver = resolve;
  mysqlSum = 0;

  if (mysqlConsumerStarted) {
    // log.info('MySQL::Consumer already setup: %d', mysqlSum);
    return;
  }

  // log.info('MySQL::Setup new consumer: %d', mysqlSum);
  // Consumer
  initializeDatabase()
    .then(function() {
      setInterval(function() {
        if (pollRunning) {
          // console.log('poll already running');
        } else {
          poll();
        }
      }, 1000);
    });
  mysqlConsumerStarted = true;
}

// coordinate the setTimeout, and recurse invocations
var pollRunning = false;

function poll() {
  pollRunning = true;
  var sql = 'select * from jobs order by id limit 10';
  pool.queryAsync(sql)
    .then(function(result) {
      var rows = result[0];
      // log.info('poll', rows.length);
      bluebird.each(rows, function(row) {
          // log.info('handling', row);

          // handle the data
          mysqlSum += row.i;

          metrics.pop_counter.increment({
            engine: 'MySQL'
          });

          var rmsql = 'DELETE FROM jobs WHERE id = ' + pool.escape(row.id);
          return pool.queryAsync(rmsql)
            .then(function(result) {
              // log.info('DELETE', result);
              if (row.done) {
                // log.info('MySQL::done', row);
                mysqlResolver(mysqlSum);
              }
            });
        })
        .then(function() {
          // if 10 results, go again
          if (rows.length == 10) {
            // lets not out-compete the push process
            setTimeout(poll, 1);
          } else {
            pollRunning = false;
          }
        });
    });

}

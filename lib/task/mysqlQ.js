'use strict';

// dependencies - core-public-internal
var Promise = require('bluebird');
var mysql = require('mysql');
var log = require('../log');

exports = module.exports = {
  initializeDatabase: initializeDatabase,
  push: function(x) {
    return initializeDatabase().then(function() {
      push(x);
    });
  }
};

Promise.promisifyAll(require('mysql/lib/Connection').prototype);
Promise.promisifyAll(require('mysql/lib/Pool').prototype);

var connection;

function initializeDatabase() {
  // var config = require('./config/'); // todo should this come from Grunt?
  // var done = this.async();

  // log.info('--initializeDatabase');
  // make this a singleton generator;
  // if (connection) {
  //   log.info('--initializeDatabase:: return previous connection synchronously');
  //   return Promise.resolve(connection);
  // }

  connection = mysql.createConnection({
    host: 'mydb',
    port: 3306,
    database: 'queue',
    user: 'imetrical',
    password: 'secret'
  });

  // log.info('-initializeDatabase');
  return connection.connectAsync()
    // .then(function() {
    //   return connection.queryAsync('DROP DATABASE IF EXISTS queue');
    // })
    // .then(function() {
    //   return connection.queryAsync('CREATE DATABASE queue');
    // })
    // .then(function() {
    //   return connection.queryAsync('USE queue');
    // })
    .then(function() {
      return connection.queryAsync('CREATE TABLE IF NOT EXISTS jobs (id INT NOT NULL AUTO_INCREMENT, i INT NOT NULL, done BOOL NOT NULL, PRIMARY KEY (id))');
    })
    // this is so we can chain, and reuse the connection
    .then(function() {
      // log.info('+initializeDatabase');
      return connection;
    })
    .catch(function(err) {
      log.error('initializeDatabase',err);
      connection = null;
    });
}

function push(x) {
  // should I reconnect?
  log.info('-push:%j', x);
  // log.info('inserting %j', x);
  // if (x) {
  //   return Promise.resolve({
  //     id: 'NOTNOTNOT'
  //   });
  // }
  return connection.queryAsync('INSERT INTO jobs SET ?', {
      i: x.i,
      done: x.done ? 1 : 0
    })
    .then(function(result) {
      log.info('+inserted result:%j', result);
      return result;
    });
}

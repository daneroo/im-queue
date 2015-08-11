'use strict';

// dependencies - core-public-internal
var Promise = require('bluebird');
var mysql = require('mysql');
var log = require('../../log');

exports = module.exports = {
  initializeDatabase: initializeDatabase
};

Promise.promisifyAll(require('mysql/lib/Connection').prototype);
Promise.promisifyAll(require('mysql/lib/Pool').prototype);

function initializeDatabase() {
  // var config = require('./config/'); // todo should this come from Grunt?
  // var done = this.async();

  var connection = mysql.createConnection({
    host: 'mydb',
    port: 3306,
    database:'queue',
    user: 'imetrical',
    password: 'secret'
  });

  return connection.connectAsync()
    .then(function() {
      return connection.queryAsync('DROP DATABASE IF EXISTS queue');
    })
    .then(function() {
      return connection.queryAsync('CREATE DATABASE queue');
    })
    .then(function() {
      return connection.queryAsync('CREATE TABLE jobs (id INT NOT NULL AUTO_INCREMENT, i INT NOT NULL, done BOOL NOT NULL, PRIMARY KEY (id))');
    })
    .catch(function(err) {
      log.error(err);
    });
}


CREATE TABLE jobs (
     id INT NOT NULL AUTO_INCREMENT,
     i INT NOT NULL,
     done BOOL NOT NULL,
     PRIMARY KEY (id)
)

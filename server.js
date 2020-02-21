#!/usr/bin/env node
'use strict';

require('dotenv').config({silent: true});

const server = require('./app');
const port = process.env.PORT || 3000;

const startServer = server.listen(port, function() {
  console.log('Server running on port: %d', port);
});

const close = () => {
  startServer.close();
}

module.exports = {
  close: close
};

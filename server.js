#!/usr/bin/env node
'use strict';

const config = require('./config/global');
const server = require('./app')(config); // pass the config settings to the app function
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

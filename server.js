#!/usr/bin/env node
'use strict';

const config = require('./config/global')
const server = require('./app')(config) // pass the config settings to the app function
const port = config.server.port || 3000

const listener = server.listen(port, function() {
  console.log('Server running on port: %d', port);
});

const close = () => {
  listener.close();
}

module.exports = {
  close: close
};

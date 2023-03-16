'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var cli_1 = require('./cli')
var process_1 = require('./process')
;(0, cli_1.cli)()
  .then(function (cmd) {
    ;(0, process_1.process)(cmd)
  })
  .catch(function (e) {
    throw new Error('Cli input error : '.concat(e))
  })

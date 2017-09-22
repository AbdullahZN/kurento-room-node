var utils = require('./utils')
var config = require('../config')

module.exports = {
  loaders: utils.cssLoaders({
    sourceMap: config.dev.cssSourceMap,
    extract: false
  })
}

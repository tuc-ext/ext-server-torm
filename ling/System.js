'use strict'

const enviconfig = require('base-envar-config')
const wo = global.wo

const DAD = (module.exports = class System {
  static api = {
    async getUserEnvar () {
      const result = {
        _state: 'SUCCESS',
        envarDynamic: enviconfig.get_dynamic_envar(),
      }
      return result
    },
  }
})

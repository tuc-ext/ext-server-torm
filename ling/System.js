'use strict'

const basendEnvar = require('basend-envar')
const wo = global.wo

const DAD = (module.exports = class System {
  static api = {
    async getUserEnvar () {
      const result = {
        _state: 'SUCCESS',
        envarDynamic: basendEnvar.get_dynamic_envar(),
      }
      return result
    },
  }
})

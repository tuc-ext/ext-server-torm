'use strict'

const enviconfig = require('base.enviconfig')
const wo = global.wo

module.exports = class System {
  
  static api = {

    async getUserEnvar () {
      const result = {
        _state: 'SUCCESS',
        envarDynamic: enviconfig.getDynamicEnvar(),
      }
      return result
    },
    
  }

}

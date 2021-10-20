'use strict'

const enviconfig = require('base.enviconfig')
const wo = global.wo

module.exports = class System {
  
  static api = {

    async getConfiguration () {
      const result = {
        _state: 'SUCCESS',
        configDynamic: enviconfig.getDynamicConfig(),
      }
      console.log(result)
      return result
    },
    
  }

}

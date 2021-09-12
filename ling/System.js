'use strict'
const torm = require('typeorm')
const enviconfig = require('sol.enviconfig')

const DAD = (module.exports = class System {})

DAD.api = {}

DAD.api.getConfiguration = async function () {

  const result = {
    _state: 'SUCCESS',
    configDynamic: enviconfig.getDynamicConfig(),
  }
  console.log(result)
  return result
}

const my = {
  async sum({ table, field, where } = {}) {
    return (await torm.getRepository(table).createQueryBuilder().select(`SUM(${field})`, 'sum').where(where).getRawOne()).sum
  },

}

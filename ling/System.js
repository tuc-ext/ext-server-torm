'use strict'
const torm = require('typeorm')

const DAD = (module.exports = class System {})

DAD.api = {}

DAD.api.getConfiguration = async function () {

  const result = {
    _state: 'SUCCESS',
    configDynamic: wo.tool.getDynamicConfig(),
  }
  console.log(result)
  return result
}

const my = {
  async sum({ table, field, where } = {}) {
    return (await torm.getRepository(table).createQueryBuilder().select(`SUM(${field})`, 'sum').where(where).getRawOne()).sum
  },

}

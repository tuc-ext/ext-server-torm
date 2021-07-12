'use strict'

const Trade = require('./Trade.js')
const Place = require('./Place.js')
const User = require('./User.js')
const torm = require('typeorm')

const DAD = (module.exports = class System extends torm.BaseEntity {})

DAD.api = {}

DAD.api.getConfiguration = async function () {

  const result = {
    _state: 'SUCCESS',
    configDynamic: my.getDynamicConfig(),
  }
  console.log(result)
  return result
}

const my = {
  async sum({ table, field, where } = {}) {
    return (await torm.getRepository(table).createQueryBuilder().select(`SUM(${field})`, 'sum').where(where).getRawOne()).sum
  },

  getDynamicConfig() {
    if (fs.existsSync(path.join(process.cwd(), '../ConfigBasic.js'))) {
      delete require.cache[require.resolve('../ConfigDynamic.js')] // delete require.cache['../ConfigDynamic.js'] 不起作用
      return require('../ConfigDynamic.js')
    } else {
      return {}
    }
  },
}

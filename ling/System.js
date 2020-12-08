'use strict'

const Config = require('so.base/Config.js')
const Trade = require('./Trade.js')
const Place = require('./Place.js')
const User = require('./User.js')
const to = require('typeorm')

const DAD = (module.exports = class System extends to.BaseEntity {})

DAD.api = {}

DAD.api.getUsd2Cny = DAD.api.getLog2Cny = async function () {
  delete require.cache[require.resolve('../ConfigDynamic.js')] // delete require.cache['../ConfigDynamic.js'] 不起作用
  const result = require('../ConfigDynamic.js')
  return { _state: 'SUCCESS', usd2cny: result.usd2cny }
  // 另一个方案：从数据库里读取
  // let data = await DAD.findOne()
  // if (data) {
  //   return data.usd2cny
  // }
  // DAD.save({usd2cny:7, when: new Date()}) // 如果数据库里还不存在第一条数据
  // return 7
}

DAD.api.getLinks = async () => {
  delete require.cache[require.resolve('../ConfigDynamic.js')] // delete require.cache['../ConfigDynamic.js'] 不起作用
  let result = require('../ConfigDynamic.js')
  return { _state: 'SUCCESS', weixingroup: result.weixingroup }
}

DAD.api.getConfiguration = async function () {
  for (const coin in Config.depositCoinSet) {
    Config.depositCoinSet[coin].exchangeRate = Trade.getExchangeRate({
      coin: coin,
    })
  }
  for (const coin in Config.withdrawCoinSet) {
    Config.withdrawCoinSet[coin].exchangeRate = Trade.getExchangeRate({
      coin: coin,
    })
  }
  delete require.cache[require.resolve('../ConfigDynamic.js')] // delete require.cache['../ConfigDynamic.js'] 不起作用
  let configDynamic = require('../ConfigDynamic.js')

  const result = {
    depositCoinSet: Config.depositCoinSet,
    withdrawCoinSet: Config.withdrawCoinSet,
    configDynamic: configDynamic,
  }
  result.estateCount = await Place.count()
  result.estateBuySum = await my.sum({ table: 'Place', field: 'buyPrice' })
  result.estateStartSum = await my.sum({ table: 'Place', field: 'startPrice' })
  result.estateSellSum = await my.sum({ table: 'Place', field: 'sellPrice' })
  result.estateHoldingCostSum = await my.sum({ table: 'User', field: 'estateHoldingCost' })
  result.estateHoldingValueSum = await my.sum({ table: 'User', field: 'estateHoldingValue' })
  result.depositUsdtSumByTrades = await my.sum({ table: 'Trade', field: 'amountSource', where: { txType: 'DEPOSIT_USDT' } })
  result.depositLogSumByTrades = await my.sum({ table: 'Trade', field: 'amount', where: { txType: 'DEPOSIT_USDT' } })
  result.userCount = await User.count()
  result.depositUsdtSumByUsers = await my.sum({ table: 'User', field: 'depositUsdtSum' })
  result.depositLogSumByUsers = await my.sum({ table: 'User', field: 'depositLogSum' })
  result.systemFeeSum = await my.sum({ table: 'User', field: 'estateFeeSum' })
  result.systemTaxSum = await my.sum({ table: 'User', field: 'estateTaxSum' })
  result.systemFeeAndTax = await my.sum({ table: 'Trade', field: 'amountSystem' })
  result.systemMining = await my.sum({ table: 'Trade', field: 'amountMining' })
  result.rewardSum = await my.sum({ table: 'Trade', field: 'amount', where: { txType: 'REWARD_REGIST' } })
  result.userBalanceSum = await my.sum({ table: 'User', field: 'balance' })
  result.userEstateCount = await my.sum({ table: 'User', field: 'estateHoldingNumber' })
  console.log(result)
  return result
}

const my = {
  async sum({ table, field, where } = {}) {
    return (await to.getRepository(table).createQueryBuilder().select(`SUM(${field})`, 'sum').where(where).getRawOne()).sum
  },
}

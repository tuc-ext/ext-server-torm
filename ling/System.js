'use strict'

const Config = require('so.base/Config.js')
const Trade = require('./Trade.js')
const Place = require('./Place.js')
const User = require('./User.js')
const Ling = require('so.ling/Ling.to.js')

const DAD = module.exports = class System extends Ling { // 构建类

  static schema = {
    name: this.name,
    target: this,
    columns:{
      aiid: { type: 'int', generated: true, primary: true },
      usd2cny: { type: Number, default:null },
      when: { type: Date, nullable:true }
    }
  }

}

DAD.api={}

DAD.api.getLog2Cny = async function(){
  let data = await DAD.findOne()
  if (data) {
    return data.usd2cny
  }
  DAD.save({usd2cny:7, when: new Date()})
  return 7
}

DAD.api.getConfiguration=async function(){
  for (let coin in Config.depositCoinSet){
    Config.depositCoinSet[coin].exchangeRate = Trade.getExchangeRate({coin:coin})
  }
  for (let coin in Config.withdrawCoinSet){
    Config.withdrawCoinSet[coin].exchangeRate = Trade.getExchangeRate({coin:coin})
  }
  let result = {
    depositCoinSet: Config.depositCoinSet,
    withdrawCoinSet: Config.withdrawCoinSet,
  }
  result.estateCount = await Place.count(),
  result.estateBuySum = await Place.sum({field:'buyPrice'}),
  result.estateStartSum = await Place.sum({field:'startPrice'}),
  result.estateSellSum = await Place.sum({field:'sellPrice'}),
  result.estateHoldingCostSum = await User.sum({field:'estateHoldingCost'}),
  result.estateHoldingValueSum = await User.sum({field:'estateHoldingValue'}),
  result.userCount = await User.count(),
  result.depositUsdtSumByTrades = await Trade.sum({field:'amountSource', where:{txType:'DEPOSIT_USDT'}}),
  result.depositUsdtSumByUsers = await User.sum({field:'depositUsdtSum'}),
  result.depositLogSumByTrades = await Trade.sum({field:'amount', where:{txType:'DEPOSIT_USDT'}}),
  result.depositLogSumByUsers = await User.sum({field:'depositLogSum'}),
  result.systemFeeSum = await User.sum({field:'estateFeeSum'}),
  result.systemTaxSum = await User.sum({field:'estateTaxSum'}),
  result.systemFeeAndTax = await Trade.sum({field:'amountSystem'}),
  result.systemMining = await Trade.sum({field:'amountMining'}),
  result.rewardSum = await Trade.sum({field:'amount', where:{txType:'REWARD_REGIST'}}),
  result.userBalanceSum = await User.sum({field:'balance'}),
  result.userEstateCount = await User.sum({field:'estateHoldingNumber'})
  console.log(result)
  return result
}
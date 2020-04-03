'use strict'

/****************** 类和原型 *****************/
const DAD = module.exports = function System (prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}

const MOM = DAD.prototype // 原型对象

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

const alphabet = 'e5fcdg3hqa4b1n0pij2rstuv67mwx89klyz'
const base = 16367

/****************** API方法 ******************/
DAD.api={}

DAD.api.getConfiguration=async function(){
  for (let coin in wo.Config.depositCoinSet){
    wo.Config.depositCoinSet[coin].exchangeRate = wo.Trade.exchangeRate({coin:coin})
  }
  for (let coin in wo.Config.withdrawCoinSet){
    wo.Config.withdrawCoinSet[coin].exchangeRate = wo.Trade.exchangeRate({coin:coin})
  }
  let result = { 
    depositCoinSet: wo.Config.depositCoinSet,
    withdrawCoinSet: wo.Config.withdrawCoinSet,
    estateCount : (await wo.Place.getCount()).count,
    estateBuySum : (await wo.Place.getSum({field:'buyPrice'})).sum,
    estateSellSum : (await wo.Place.getSum({field:'sellPrice'})).sum,
    estateHoldingCostSum : (await wo.User.getSum({field:'estateHoldingCost'})).sum,
    estateHoldingValueSum : (await wo.User.getSum({field:'estateHoldingValue'})).sum,
    userCount : (await wo.User.getCount()).count,
    depositUsdtSumByTrades : (await wo.Trade.getSum({field:'amountSource', Trade:{txType:'DEPOSIT_USDT'}})).sum,
    depositUsdtSumByUsers : (await wo.User.getSum({field:'depositUsdtSum'})).sum,
    depositLogSumByTrades : (await wo.Trade.getSum({field:'amount', Trade:{txType:'DEPOSIT_USDT'}})).sum,
    depositLogSumByUsers : (await wo.User.getSum({field:'depositLogSum'})).sum,
    systemFeeSum : (await wo.User.getSum({field:'estateFeeSum'})).sum,
    systemTaxSum : (await wo.User.getSum({field:'estateTaxSum'})).sum,
    systemFeeAndTax : (await wo.Trade.getSum({field:'amountSystem'})).sum,
    systemMining : (await wo.Trade.getSum({field:'amountMining'})).sum,
    rewardSum: (await wo.Trade.getSum({field:'amount', Trade:{txType:'REWARD_REGIST'}})).sum,
    userBalanceSum: (await wo.User.getSum({field:'balance'})).sum,
    userEstateCount: (await wo.User.getSum({field:'estateHoldingNumber'})).sum
  }
  console.log(result)
  return result
}
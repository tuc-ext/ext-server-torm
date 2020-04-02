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
    Place_estateCount : (await wo.Place.getCount()).count,
    Place_estateBuySum : (await wo.Place.getSum({field:'buyPrice'})).sum,
    Place_estateSellSum : (await wo.Place.getSum({field:'sellPrice'})).sum,
    User_estateHoldingCostSum : (await wo.User.getSum({field:'estateHoldingCost'})).sum,
    User_estateHoldingValueSum : (await wo.User.getSum({field:'estateHoldingValue'})).sum,
    User_userCount : (await wo.User.getCount()).count,
    Trade_depositUsdtSum : (await wo.Trade.getSum({field:'amountSource', Trade:{txType:'DEPOSIT_USDT'}})).sum,
    User_depositUsdtSum : (await wo.User.getSum({field:'depositUsdtSum'})).sum,
    Trade_depositLogSum : (await wo.Trade.getSum({field:'amount', Trade:{txType:'DEPOSIT_USDT'}})).sum,
    User_depositLogSum : (await wo.User.getSum({field:'depositLogSum'})).sum,
    User_systemFeeSum : (await wo.User.getSum({field:'estateFeeSum'})).sum,
    User_systemTaxSum : (await wo.User.getSum({field:'estateTaxSum'})).sum,
    Trade_systemFeeAndTax : (await wo.Trade.getSum({field:'amountSystem'})).sum,
    Trade_systemMining : (await wo.Trade.getSum({field:'amountMining'})).sum,
    Trade_rewardSum: (await wo.Trade.getSum({field:'amount', Trade:{txType:'REWARD_REGIST'}})).sum,
    User_userBalanceSum: (await wo.User.getSum({field:'balance'})).sum
  }
  console.log(result)
  return result
}
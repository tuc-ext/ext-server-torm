'use strict'

/****************** 类和原型 *****************/
const DAD = module.exports = class System { // 构建类
  
}

/****************** API方法 ******************/
DAD.api={}

DAD.api.getConfiguration=function(){
  for (let coin in wo.Config.coinSet){
    wo.Config.coinSet[coin].exchangeRate = wo.Trade.exchangeRate({})
  }
  return { 
//    EXCHANGE_RATE: wo.Config.EXCHANGE_RATE,
    coinSet: wo.Config.coinSet,
    EPOCH: wo.Config.EPOCH
  }
}
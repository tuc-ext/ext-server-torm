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


DAD.aiid2regcode=function(aiid) {
  let num = (aiid+base)*(base - alphabet.length)
  let code = ''
  let mod
  while ( num > 0) {
      mod = num % alphabet.length;
      num = (num - mod) / alphabet.length
      code = code+alphabet[mod] // 倒序存放
  }
  return code;
}

DAD.regcode2aiid=function(code) {
  let len = code.length
  let num = 0
  for (let i=0; i < len; i++) {
      num += alphabet.indexOf(code[i]) * Math.pow(alphabet.length, i)
  }
  return num/(base - alphabet.length)-base
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
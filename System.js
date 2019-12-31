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

DAD.encode=function(aiid) {
  let alphabet = 'e5fcdg3hqa4b1n0pij2rstuv67mwx89klyz'
  let base = 16367
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

DAD.decode=function(code) {
  let alphabet = 'e5fcdg3hqa4b1n0pij2rstuv67mwx89klyz'
  let base = 16367
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
  return { 
//    EXCHANGE_RATE: wo.Config.EXCHANGE_RATE,
    coinSet: wo.Config.coinSet,
  }
}
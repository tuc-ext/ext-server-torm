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

/****************** API方法 ******************/
DAD.api={}

DAD.api.getConfiguration=function(){
  return { 
//    EXCHANGE_RATE: wo.Config.EXCHANGE_RATE,
    coinSet: wo.Config.coinSet,
  }
}
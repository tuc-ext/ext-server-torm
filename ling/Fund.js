'use strict'
const Ling = require('so.ling')
const ticCrypto = require('tic.crypto')
const Webtoken = require('so.base/Webtoken.js')

/****************** 类和原型 *****************/
const DAD = module.exports = function Fund (prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
DAD._table = DAD.name

const MOM = DAD.prototype // 原型对象
MOM.__proto__ = Ling.prototype
MOM._tablekey = 'uuid'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  uuid: { default: undefined, sqlite: 'TEXT PRIMARY KEY', mysql: 'VARCHAR(64) PRIMARY KEY' },
  phone: { default: undefined, sqlite: 'TEXT' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/
DAD.getAddressEth=function(){
  
}

/****************** API方法 ******************/
DAD.api=DAD.api1={}


'use strict'
const Ling = require('so.ling')
const DAY_MILLIS = 24*60*60*1000

/****************** 类和原型 *****************/
const DAD = module.exports = function Trade(prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
DAD._table = DAD.name

const MOM = DAD.prototype // 原型对象
MOM.__proto__ = Ling.prototype
MOM._tablekey = 'uuid'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  aiid: { default: undefined, sqlite: 'INTEGER PRIMARY KEY' },
  uuid: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'VARCHAR(64) PRIMARY KEY' },
  json: { default: {}, sqlite: 'TEXT' }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
  uuidEstate: { default: undefined, sqlite: 'TEXT' },
  uuidBuyer: { default: undefined, sqlite: 'TEXT' },
  uuidSeller: { default: undefined, sqlite: 'TEXT' },
  dealTime: { default: undefined, sqlite: 'TEXT' },
  dealPrice: { default: undefined, sqlite: 'REAL' },
  dealFee: { default: undefined, sqlite: 'REAL' }, 
}

/****************** 私有属性 (private members) ******************/
const my = {}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}


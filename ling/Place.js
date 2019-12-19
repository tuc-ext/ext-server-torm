'use strict'
const Ling = require('so.ling')

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
  aiid: { default: undefined, sqlite: 'INTEGER PRIMARY KEY' },
  uuid: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'VARCHAR(64) PRIMARY KEY' },
  name: { default: undefined, sqlite: 'TEXT' },
  desc: { default: undefined, sqlite: 'TEXT' },
  amount: { default: 1, sqlite: 'INTEGER' },
  profitRate: { default: 0.05, sqlite: 'REAL' },
  createTime: { default: undefined, sqlite: 'TEXT' },
  startTime: { default: undefined, sqlite: 'TEXT' },
  startPrice: { default: undefined, sqlite: 'REAL' },
  dealPrice: { default: undefined, sqlite: 'REAL' },
  dealOwner: { default: undefined, sqlite: 'TEXT' },
  dealTime: { default: undefined, sqlite: 'TEXT' }, // 交易达成的时间
  releaseTime: { default: undefined, sqlite: 'TEXT' },
  releasePrice: { default: undefined, sqlite: 'TEXT' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api=DAD.api1={}

DAD.api.getPlaceList=async function(option){
  return [
    {uuid: 'sfsafas', name: '慕尼黑', price: '50', releaseTime: '2019-12-19 18:00', profit: '15'},
    {uuid: 'sfasdas', name: '新加坡', price: '30', releaseTime: '2019-12-19 7:35', profit: '5'}
  ]
  return await DAD.getAll(option)
}

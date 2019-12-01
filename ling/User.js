'use strict'
var Ling = require('so.ling')

/****************** 类和原型 *****************/
const DAD = module.exports = function User (prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
DAD._table = DAD.name

const MOM = DAD.prototype // 原型对象
MOM.__proto__ = Ling.prototype
MOM._tablekey = 'hash'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  hash: { default: undefined, sqlite: 'TEXT', mysql: 'VARCHAR(64) PRIMARY KEY' },
  version: { default: 0, sqlite: 'INTEGER', mysql: 'INT' }, // 用来升级
  type: { default: '', sqlite: 'TEXT', mysql: 'VARCHAR(100)' }, // 用来分类：普通块，虚拟块（如果某获胜节点没有及时出块，就用虚块填充）
  timestamp: { default: undefined, sqlite: 'TEXT', mysql: 'CHAR(24)' },
  height: { default: undefined, sqlite: 'INTEGER UNIQUE', mysql: 'BIGINT' },
  lastBlockHash: { default: null, sqlite: 'TEXT', mysql: 'VARCHAR(64)' },
  numberAction: { default: 0, sqlite: 'INTEGER', mysql: 'INT' },
  totalAmount: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
  totalFee: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
  rewardWinner: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
  rewardPacker: { default: 0, sqlite: 'NUMERIC' },
  packerPubkey: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(32)' },
  packerSignature: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(64)' },
  winnerPubkey: { default: '', sqlite: 'TEXT' }, // 抽签获胜者
  winnerMessage: { default: '', sqlite: 'TEXT' },
  winnerSignature: { default: '', sqlite: 'TEXT' },
  actionHashRoot: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(32)' }, // 虽然已经存了actionHashList，但存一个梅克根有助于轻钱包。
  actionHashList: { default: [], sqlite: 'TEXT' }, // 要不要在Block里记录每个事务？还是让每个事务自己记录所属Block？
  message: { default: '', sqlite: 'TEXT', mysql: 'VARCHAR(256)' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api={}

DAD.api.identify = function(){

}
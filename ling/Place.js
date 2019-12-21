'use strict'
const Ling = require('so.ling')

/****************** 类和原型 *****************/
const DAD = module.exports = function Place(prop) { // 构建类
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
  uuidOwner: {default: undefined, sqlite: 'TEXT UNIQUE' },
  name: { default: undefined, sqlite: 'TEXT' },
  desc: { default: undefined, sqlite: 'TEXT' },
  amount: { default: 1, sqlite: 'INTEGER' },
  profitRate: { default: 0.05, sqlite: 'REAL' },
  createTime: { default: undefined, sqlite: 'TEXT' },
  startTime: { default: undefined, sqlite: 'TEXT' },
  startPrice: { default: undefined, sqlite: 'REAL' },
  buyPrice: { default: undefined, sqlite: 'REAL' },
  buyTime: { default: undefined, sqlite: 'TEXT' }, // 交易达成的时间
  sellTime: { default: undefined, sqlite: 'TEXT' },
  sellPrice: { default: undefined, sqlite: 'TEXT' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my = {}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}

DAD.api.getPlaceList = async function (option) {
  if (wo.Config.env === 'production') {
    return await DAD.getAll(option)
  }else {
    return [
      { aiid:1, uuid:'sfsafas', name: '慕尼黑', profitRate:'0.05', buyPrice:50, buyTime:'2019-12-30T16:37:08.235Z', sellTime:'2019-12-31T16:37:08.235Z', sellPrice:'52.5' },
      { aiid:2, uuid:'sfasdas', name: '新加坡', profitRate:'0.15', buyPrice:100, buyTime:'2019-12-19T08:25:35.546Z', sellTime:'2019-12-20T08:25:35.546Z', sellPrice:'115' }, 
    ]  
  }
}

DAD.api.payToBuyEstate = async function(option){
  let buyer = await wo.User.getOne({User:{uuid:option._passtokenSource.uuid}})
  let estate = await DAD.getOne({Place:{uuid:option.Place.uuid}})
  if (buyer.balance >= estate.sellPrice){
    buyer.balance -= estate.sellPrice
    estate.uuidOwner = buyer.uuid
    estate.buyPrice = estate.sellPrice
    estate.sellPrice = estate.buyPrice*(1+estate.profitRate)
    estate.buyTime = new Date()
    estate.sellTime = new Date(estate.buyTime.valueOf() + 24*60*60*1000)
    await estate.setMe()
    await buyer.setMe()
    return {
      _state: 'TRADE_SUCCESS',
      estate
    }
  }
}
'use strict'
const Ling = require('so.ling')
const DAY_MILLIS = 24*60*60*1000

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
  uuidOwner: {default: undefined, sqlite: 'TEXT' },
  name: { default: undefined, sqlite: 'TEXT' },
  desc: { default: undefined, sqlite: 'TEXT' },
  amount: { default: 1, sqlite: 'INTEGER' },
  profitRate: { default: 0.05, sqlite: 'REAL' },
  createTime: { default: undefined, sqlite: 'TEXT' },
  startTime: { default: undefined, sqlite: 'TEXT' },
  startPrice: { default: undefined, sqlite: 'REAL' },
  buyTime: { default: undefined, sqlite: 'INTEGER' }, // 交易达成的时间
  buyTimeHourly: { default: undefined, sqlite: 'INTEGER'},
  buyPrice: { default: undefined, sqlite: 'REAL' },
  sellTime: { default: undefined, sqlite: 'INTEGER' },
  sellTimeHourly: { default: undefined, sqlite: 'INTEGER'},
  sellPrice: { default: undefined, sqlite: 'REAL' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my = {}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}

DAD.api.getPlaceList = async function (option) {
  if (true) { // wo.Config.env === 'production') {
    return await DAD.getAll(option)
  }else {
    return [
      { aiid:1, uuid:'sfsafas', name: '慕尼黑', profitRate:'0.05', 
        buyTime:new Date('2019-12-30T16:37:08.235Z').valueOf(), 
        buyTimeHourly:new Date('2019-12-30T16:37:08.235Z').valueOf() % DAY_MILLIS,
        buyPrice:50, 
        sellTime:new Date('2019-12-31T16:37:08.235Z').valueOf(), 
        sellTimeHourly:new Date('2019-12-31T16:37:08.235Z').valueOf() % DAY_MILLIS, 
        sellPrice:'52.5' },
      { aiid:2, uuid:'sfasdas', name: '新加坡', profitRate:'0.15', 
        buyTime:new Date('2019-12-19T08:25:35.546Z').valueOf(), 
        buyTimeHourly:new Date('2019-12-19T08:25:35.546Z').valueOf() % DAY_MILLIS, 
        buyPrice:100, 
        sellTime:new Date('2019-12-20T08:25:35.546Z').valueOf(), 
        sellTimeHourly:new Date('2019-12-20T08:25:35.546Z').valueOf() % DAY_MILLIS, 
        sellPrice:'115' 
      }, 
    ]  
  }
}

DAD.api.getMyPlaceList = async function(option){
  if (true) { // wo.Config.env === 'production') {
    option.Place = option.Place || {}
    option.Place.uuidOwner=option._passtokenSource.uuid
    return await DAD.getAll(option)
  }else {
    return [
      { aiid:1, uuid:'sfsafas', name: '慕尼黑', profitRate:'0.05', buyPrice:50, buyTime:new Date('2019-12-30T16:37:08.235Z').valueOf(), sellTime:new Date('2019-12-31T16:37:08.235Z').valueOf(), sellPrice:'52.5' },
      { aiid:2, uuid:'sfasdas', name: '新加坡', profitRate:'0.15', buyPrice:100, buyTime:new Date('2019-12-19T08:25:35.546Z').valueOf(), sellTime:new Date('2019-12-20T08:25:35.546Z').valueOf(), sellPrice:'115' }, 
    ]  
  }
}

DAD.api.payToBuyPlace = async function(option){
  let buyer = await wo.User.getOne({User:{uuid:option._passtokenSource.uuid}})
  let place = await DAD.getOne({Place:{uuid:option.Place.uuid}})
  if ( place.sellTime < Date.now() // 再次确认，尚未被买走
    && buyer.balance >= place.sellPrice){
    buyer.balance -= place.sellPrice
    place.uuidOwner = buyer.uuid
    place.buyPrice = place.sellPrice
    place.sellPrice = place.buyPrice*(1+place.profitRate)
    place.buyTime = Date.now()
    place.buyTimeHourly = place.buyTime % DAY_MILLIS
    place.sellTime = place.buyTime + DAY_MILLIS
    place.sellTimeHourly = place.sellTime % DAY_MILLIS
    let transaction = new wo.Trade({
      uuidPlace: place.uuid,
      uuidBuyer: buyer.uuid,
      uuidSeller: place.uuidOwner,
      dealPrice: place.sellPrice,
      dealTime: place.buyTime
    })

    if (await place.setMe() && await buyer.setMe()){
      return {
        _state: 'TRADE_SUCCESS',
        place
      }  
    }
  }
  return { 
    _state: 'TRADE_FAILED' 
  }
}
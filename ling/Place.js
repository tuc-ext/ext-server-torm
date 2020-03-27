'use strict'
const Ling = require('so.ling')
const ticCrypto = require('tic.crypto')
const DAY_MILLIS = 24*60*60*1000

const Config = require('so.base/Config.js')
const Story = require('./Story.js')
const to = require('typeorm')

/****************** 类和原型 *****************/
const DAD = module.exports = class Place extends Ling { // 构建类
  constructor(prop){
    super(prop)
    this._class = this.constructor.name
    this.setProp(prop)
  }
}

const MOM = DAD.prototype // 原型对象
MOM._table = DAD.name
MOM._tablekey = 'uuid'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  aiid: { default: undefined, sqlite: 'INTEGER PRIMARY KEY' },
  uuid: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'VARCHAR(64) PRIMARY KEY' },
  pcode: { default: undefined, sqlite: 'TEXT UNIQUE', info:'人工定义的地区编号，用于防止重复' },
  uuidOwner: { default: undefined, sqlite: 'TEXT' },
  uuidPreowner: { default: undefined, sqlite: 'TEXT', info:'交易对手的uuid' },
  name: { default: {}, sqlite: 'TEXT' },
  intro: { default: undefined, sqlite: 'TEXT' },
  image: { default: undefined, sqlite: 'TEXT' },
  amount: { default: 1, sqlite: 'INTEGER' },
  profitRate: { default: 0.05, sqlite: 'REAL', info: '卖家盈利，是成本价的一个比例' },
  feeRate: { default: 0.005, sqlite: 'REAL', info: '抵消成本的费用，通常是固定数额，也可是原始销售价格的一个比例'},
  taxRate: { default: 0.005, sqlite: 'REAL', info: '公共税收，通常是原始销售价格的一个比例'},
  startTime: { default: undefined, sqlite: 'TEXT' },
  startPrice: { default: undefined, sqlite: 'REAL' },
  buyTimeUnix: { default: undefined, sqlite: 'INTEGER' }, // 交易达成的时间
  buyTimeUnixDaily: { default: undefined, sqlite: 'INTEGER'},
  buyPrice: { default: undefined, sqlite: 'REAL' },
  sellTimeUnix: { default: undefined, sqlite: 'INTEGER' },
  sellTimeUnixDaily: { default: undefined, sqlite: 'INTEGER'},
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
  return await DAD.getAll(option)
}

DAD.api.getMyPlaceList = async function(option){
  option.Place = option.Place || {}
  option.Place.uuidOwner=option._passtokenSource.uuid
  return await DAD.getAll(option)
}

DAD.api.payToCreatePlace = async function(option){
  let creator = await wo.User.getOne({User:{uuid:option._passtokenSource.uuid}})

  if (creator.estateHoldingNumber >= 10){
    return { _state: 'EXCEED_HOLDING_NUMBER' }
  }

  if (option.Place.startPrice && creator.balance<option.Place.startPrice){
    return { _state: 'BALANCE_NOT_ENOUGH' }
  }

  let txTimeUnix = Date.now()
  if (option.Place.name && option.Place.profitRate) {
    let place = new DAD(option.Place)
    place.uuidOwner = option._passtokenSource.uuid
    place.feeRate = Config.FEE_RATE
    place.taxRate = Config.TAX_RATE
    place.buyPrice = place.startPrice
    place.sellPrice = place.buyPrice*(1+place.profitRate)*(1+place.feeRate+place.taxRate)
    place.startTime = new Date(txTimeUnix)
    place.buyTimeUnix = txTimeUnix
    place.buyTimeUnixDaily = place.buyTimeUnix % DAY_MILLIS
    place.sellTimeUnix = place.buyTimeUnix + DAY_MILLIS
    if (Config.env!=='production') place.sellTimeUnix = place.buyTimeUnix + DAY_MILLIS/6 // 开发测试环境下，每4小时到期
    place.sellTimeUnixDaily = place.sellTimeUnix % DAY_MILLIS

    creator.balance -= place.startPrice
    // 创建新地产时，不需要交税费
    creator.estateHoldingNumber += 1
    creator.estateHoldingValue += place.startPrice*(1+place.profitRate)
    creator.estateHoldingProfit += place.startPrice*place.profitRate

    if (await place.addMe() && await creator.setMe()) {
      let txBuyer = new wo.Trade({
        uuidPlace: place.uuid,
        uuidUser: creator.uuid,
        uuidOther: 'SYSTEM', // 前任主人就是这次交易的对家
        amount: -place.sellPrice, // 作为买家，是负数
        txGroup: 'ESTATE_TX',
        txType: 'ESTATE_CREATE',
        txTimeUnix: txTimeUnix,
        txTime: new Date(txTimeUnix),
        json: { Place:{name: place.name} }
      })
      txBuyer.txHash = ticCrypto.hash(txBuyer.getJson({exclude:['aiid','uuid']}))
      if (await txBuyer.addMe()) {
        return { _state: 'ESTATE_CREATE_SUCCESS',
          place,
          trade: txBuyer
        }
      }
    }

    return { 
      _state: 'ESTATE_CREATE_FAILED' 
    }
  }
}

DAD.api.payToBuyPlace = async function(option){
  let buyer = await wo.User.getOne({User:{uuid:option._passtokenSource.uuid}})
  let place = await DAD.getOne({Place:{uuid:option.Place.uuid}})

  let fromTimeUnix = place.buyTimeUnix

  if (buyer.estateHoldingNumber >= 10){
    return { _state: 'EXCEED_HOLDING_NUMBER' }
  }

  if (buyer.balance<place.sellPrice){
    return { _state: 'BALANCE_NOT_ENOUGH' }
  }

  let txTimeUnix = Date.now()
  if ( place.sellTimeUnix < txTimeUnix ){ // 再次确认，尚未被买走
    buyer.balance -= place.sellPrice
    buyer.estateFeeSum += place.buyPrice*place.feeRate
    buyer.estateTaxSum += place.buyPrice*place.taxRate
    buyer.estateHoldingNumber += 1
    buyer.estateHoldingValue += place.sellPrice*(1+place.profitRate)
    buyer.estateHoldingProfit += place.sellPrice*place.profitRate

    let txBuyer = new wo.Trade({
      uuidPlace: place.uuid,
      uuidUser: buyer.uuid,
      uuidOther: place.uuidOwner, // 前任主人就是这次交易的对家
      amount: -place.sellPrice, // 作为买家，是负数
      txGroup: 'ESTATE_TX',
      txType: 'ESTATE_BUYIN',
      txTimeUnix: txTimeUnix,
      txTime: new Date(txTimeUnix),
      json: { Place:{name: place.name} }
    })
    txBuyer.txHash = ticCrypto.hash(txBuyer.getJson({exclude:['aiid','uuid']}))

    if (place.uuidOwner) { // 如果有前任主人。（如果没有，就是系统初始化状态）
      let seller = await wo.User.getOne({User:{uuid:place.uuidOwner}})
      seller.balance += place.buyPrice*(1+place.profitRate)
      seller.estateProfitSum += place.buyPrice*place.profitRate
      seller.estateHoldingNumber -= 1
      seller.estateHoldingValue -= place.buyPrice*(1+place.profitRate)
      seller.estateHoldingProfit -= place.buyPrice*place.profitRate
      await seller.setMe()

      let txSeller = new wo.Trade({
        uuidPlace: place.uuid,
        uuidUser: seller.uuid,
        uuidOther: buyer.uuid,
        amount: place.buyPrice*(1+place.profitRate), // 注意不包含税费
        txGroup: 'ESTATE_TX',
        txType: 'ESTATE_SELLOUT',
        txTimeUnix: txTimeUnix,
        txTime: new Date(txTimeUnix),
        json: { Place:{name: place.name} }
      })
      txSeller.txHash = ticCrypto.hash(txSeller.getJson({exclude:['aiid','uuid']}))
      await txSeller.addMe()
    }

    place.uuidPreowner = place.uuidOwner
    place.uuidOwner = buyer.uuid
    place.buyPrice = place.sellPrice
    place.sellPrice = place.buyPrice*(1+place.profitRate)*(1+place.feeRate+place.taxRate)
    place.buyTimeUnix = txTimeUnix
    place.buyTimeUnixDaily = place.buyTimeUnix % DAY_MILLIS
    place.sellTimeUnix = place.buyTimeUnix + DAY_MILLIS
    if (Config.env!=='production') place.sellTimeUnix = place.buyTimeUnix + DAY_MILLIS/24 // 开发测试环境下，每1小时到期
    place.sellTimeUnixDaily = place.sellTimeUnix % DAY_MILLIS
    
    if (await place.setMe() && await buyer.setMe() && await txBuyer.addMe()){
      if (place.uuidPreowner) {
        Story.create({
          image: Story.findOne({image: place.image}) ? null : place.image, // 不要提交重复的照片（如果新主人没有更换图片）
          text: Story.findOne({intro: place.intro}) ? null : place.intro, 
          owner: place.uuidPreowner, 
          place: place.uuid,
          fromTime: new Date(fromTimeUnix),
          toTime: new Date(txTimeUnix),
        })
        .save()
      }
      return {
        _state: 'ESTATE_BUYIN_SUCCESS',
        place,
        trade: txBuyer
      }  
    }
  }
  return { 
    _state: 'ESTATE_BUYIN_FAILED' 
  }
}

DAD.api.uploadImage = async function(option){ // Estate 尚未存入数据库，只是上传图片，不修改数据库
  if (option._passtokenSource && option._passtokenSource.isOnline) {
    let file = option._req.file
    if (file &&  /^image\//.test(file.mimetype)) {
      return Object.assign(file, {_state:'SUCCESS'})
    }else {
      return { _state: 'FILE_NOT_IMAGE'}
    }
  }else{
    return { _state: 'USER_NOT_ONLINE' }
  }
}

DAD.api.changeImage=async function(option){
  if (option._passtokenSource && option._passtokenSource.isOnline
    && option.Place && option.Place.uuid) {
    let place = await DAD.getOne({Place:{uuid:option.Place.uuid}})
    if (place && place.uuidOwner === option._passtokenSource.uuid) {
      let file = option._req.file
      if (file && /^image\//.test(file.mimetype)) {
        await DAD.setOne({Place:{image:option._req.file.filename}, cond:{uuid: option.Place.uuid}})
        return Object.assign(file, { _state: 'SUCCESS'})
      }else{
        return { _state: 'FILE_NOT_IMAGE'}
      }
    }else {
      return { _state: 'NOT_ESTATE_OWNER' }
    }
  }else{
    return { _state: 'USER_NOT_ONLINE' }
  }
}

DAD.api.changeIntro=async function(option){
  if (option._passtokenSource && option._passtokenSource.isOnline
    && option.Place && option.Place.uuid && option.Place.intro) {
      // todo: 确认 option.Place.uuidOwner === option._passtokenSource.uuid
      await DAD.setOne({Place:{intro:option.Place.intro}, cond:{uuid:option.Place.uuid}})
      return { _state: 'SUCCESS' }
    }else {
      return { _state: 'INPUT_MALFORMED' }
    }
}
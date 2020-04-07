'use strict'
const Config = require('so.base/Config.js')
const ticCrypto = require('tic.crypto')
const Ling = require('./Ling.js')
const Story = require('./Story.js')
const TO = require('typeorm')

const DAY_MILLIS = 24*60*60*1000
const ESTATE_RESTRICT = 100

/****************** 类和原型 *****************/
const DAD = module.exports = class Place extends Ling { // 构建类

  static schema = {
    name: this.name,
    target: this,
    columns:{
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      pcode: { type: String, nullable: true, unique: true, comment:'人工定义的地区编号，用于防止重复' },
      uuidOwner: { type: String, nullable: true },
      uuidPreowner: { type: String, nullable: true, comment:'交易对手的uuid' },
      name: { type: 'simple-json', default: '{}', nullable: true },
      intro: { type: String, nullable: true },
      image: { type: String, nullable: true },
      amount: { type: 'int', default: 1 },
      profitRate: { type: 'real', default: 0.05, comment: '卖家盈利，是成本价的一个比例' },
      feeRate: { type: 'real', default: 0.005, comment: '抵消成本的费用，通常是固定数额，也可是原始销售价格的一个比例'},
      taxRate: { type: 'real', default: 0.005, comment: '公共税收，通常是原始销售价格的一个比例'},
      startTime: { type: String, nullable: true },
      startPrice: { type: 'real', nullable: true },
      buyTimeUnix: { type: 'int', nullable: true }, // 交易达成的时间
      buyTimeUnixDaily: { type: 'int', nullable: true},
      buyPrice: { type: 'real', nullable: true },
      sellTimeUnix: { type: 'int', nullable: true },
      sellTimeUnixDaily: { type: 'int', nullable: true},
      sellPrice: { type: 'real', nullable: true },
      json: { type: 'simple-json', default: '{}', nullable: true } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构  
    }
  }

}


/****************** API方法 ******************/
DAD.api = DAD.api1 = {}

DAD.api.getPlaceList = async function ({from, to, length, order={sellTimeUnixDaily:'ASC'}, take=10}={}) {
  let fromWhere
  if (length>0)
    fromWhere = TO.MoreThan
  else
    fromWhere = TO.MoreThanOrEqual
  let result
  if (from<to){
    result = await DAD.createQueryBuilder().select().where({sellTimeUnixDaily: fromWhere(from)}).andWhere({sellTimeUnixDaily: TO.LessThan(to)}).orderBy(order).limit(take).getMany()
  }else{
    result = await DAD.find({where:[ { sellTimeUnixDaily: fromWhere(from) }, { sellTimeUnixDaily: TO.LessThan(to) } ], order, take})
  }
  return result
}

DAD.api.getMyPlaceList = async function({_passtokenSource, maxtime, order={buyTimeUnix:'DESC'}, take=10}={}){
  let where = { uuidOwner: _passtokenSource.uuid }
  if (maxtime)
    where.buyTimeUnix = TO.LessThan(maxtime)
  let result = await DAD.find({where, order, take})
  return result
}

DAD.api.payToCreatePlace = async function(option){
  let creator = await wo.User.findOne({uuid:option._passtokenSource.uuid})

  if (creator.estateHoldingNumber >= ESTATE_RESTRICT){
    return { _state: 'EXCEED_HOLDING_NUMBER' }
  }

  if (option.Place.startPrice && creator.balance < option.Place.startPrice){
    return { _state: 'BALANCE_NOT_ENOUGH' }
  }

  let txTimeUnix = Date.now()
  if (option.Place.name && option.Place.profitRate) {
    let place = DAD.create(option.Place)
    place.uuidOwner = option._passtokenSource.uuid
    place.feeRate = Config.FEE_RATE
    place.taxRate = Config.TAX_RATE
    place.startPrice = Number(place.startPrice)
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
    creator.estateHoldingCost += place.startPrice
    creator.estateHoldingValue += place.startPrice*(1+place.profitRate)
    creator.estateHoldingProfit += place.startPrice*place.profitRate

    if (await place.save() && await creator.save()) {
      let txBuyer = wo.Trade.create({
        uuidPlace: place.uuid,
        uuidUser: creator.uuid,
        uuidOther: 'SYSTEM', // 前任主人就是这次交易的对家
        amount: -place.buyPrice, // 作为买家，是负数
        txGroup: 'ESTATE_TX',
        txType: 'ESTATE_CREATE',
        txTimeUnix: txTimeUnix,
        txTime: new Date(txTimeUnix),
        json: { Place:{name: place.name} }
      })
      txBuyer.txHash = ticCrypto.hash(txBuyer.getJson({exclude:['aiid','uuid']}))
      if (await txBuyer.save()) {
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
  let place = await DAD.findOne({uuid:option.Place.uuid})
  let buyer = await wo.User.findOne({uuid:option._passtokenSource.uuid})

  let fromTimeUnix = place.buyTimeUnix

  if (buyer.estateHoldingNumber >= ESTATE_RESTRICT){
    return { _state: 'EXCEED_HOLDING_NUMBER' }
  }

  if (buyer.balance < place.sellPrice){
    return { _state: 'BALANCE_NOT_ENOUGH' }
  }

  let txTimeUnix = Date.now()
  if ( place.sellTimeUnix < txTimeUnix ){ // 再次确认，尚未被买走
    buyer.balance -= place.sellPrice
    buyer.estateFeeSum += place.buyPrice*(1+place.profitRate)*place.feeRate
    buyer.estateTaxSum += place.buyPrice*(1+place.profitRate)*place.taxRate
    buyer.estateHoldingNumber += 1
    buyer.estateHoldingCost += place.sellPrice
    buyer.estateHoldingValue += place.sellPrice*(1+place.profitRate) // 包括了buyer买入后的预期盈利，让buyer更高兴
    buyer.estateHoldingProfit += place.sellPrice*place.profitRate

    let txBuyer = wo.Trade.create({
      uuidPlace: place.uuid,
      uuidUser: buyer.uuid,
      uuidOther: place.uuidOwner || 'SYSTEM', // 前任主人就是这次交易的对家
      amount: -place.sellPrice, // 作为买家，是负数
      // amountBuyer: -place.sellPrice,
      // amountSeller: place.buyPrice*(1+place.profitRate), // 注意不包含税费
      amountSystem: place.buyPrice*(1+place.profitRate)*(place.feeRate+place.taxRate), // |amountBuyer| = amountSeller+amountSystem
      // 交易产生的LOG币也是USDT挖矿得到的，交易本身不是挖矿所得  amountMining: place.uuidOwner ? place.sellPrice-place.buyPrice : 0, // place.buyPrice*place.profitRate + place.buyPrice*(1+place.profitRate)*(place.feeRate+place.taxRate), 
      txGroup: 'ESTATE_TX',
      txType: 'ESTATE_BUYIN',
      txTimeUnix: txTimeUnix,
      txTime: new Date(txTimeUnix),
      json: { Place:{name: place.name} }
    })
    let json = txBuyer.getJson({exclude:['aiid','uuid']})
    txBuyer.txHash = ticCrypto.hash(json)

    if (place.uuidOwner) { // 如果有前任主人。（如果没有，就是系统初始化状态）
      let seller = await wo.User.findOne({uuid:place.uuidOwner})
      seller.balance += place.buyPrice*(1+place.profitRate)
      seller.estateProfitSum += place.buyPrice*place.profitRate
      seller.estateHoldingNumber -= 1
      seller.estateHoldingCost -= place.buyPrice
      seller.estateHoldingValue -= place.buyPrice*(1+place.profitRate)
      seller.estateHoldingProfit -= place.buyPrice*place.profitRate
      await seller.save()

      let txSeller = wo.Trade.create({
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
      await txSeller.save()
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
    
    if (await place.save() && await buyer.save() && await txBuyer.save()){
      if (place.uuidPreowner) {
        let image = await Story.findOne({image: place.image}) ? null : place.image // 不要提交重复的照片（如果新主人没有更换图片）
        let text = await Story.findOne({intro: place.intro}) ? null : place.intro
        Story.create({
          image: image,
          text: text,
          owner: place.uuidPreowner, 
          place: place.uuid,
          fromTime: new Date(fromTimeUnix),
          toTime: new Date(txTimeUnix),
          fromTimeUnix: fromTimeUnix,
          toTimeUnix: txTimeUnix,
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
    let place = await DAD.findOne({uuid:option.Place.uuid})
    if (place && place.uuidOwner === option._passtokenSource.uuid) {
      let file = option._req.file
      if (file && /^image\//.test(file.mimetype)) {
        await place.save({image:option._req.file.filename})
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
      let place = await DAD.findOne({uuid:option.Place.uuid})
      if (place && place.uuidOwner === option._passtokenSource.uuid) {
        place.save({intro:option.Place.intro})
        return { _state: 'SUCCESS' }
      }else {
        return { _state: 'NOT_ESTATE_OWNER' }
      }
    }else {
      return { _state: 'INPUT_MALFORMED' }
    }
}
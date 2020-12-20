'use strict'

const ticCrypto = require('tic.crypto')
const torm = require('typeorm')

const DAY_MILLIS = 24 * 60 * 60 * 1000
const FROZEN_MILLIS = 60 * 60 * 1000 // 购入后，冻结多久
const ESTATE_RESTRICT = 100

/****************** 类和原型 *****************/
const DAD = (module.exports = class Place extends (
  torm.BaseEntity
) {
  // 构建类
  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      pcode: { type: String, default: null, unique: true, comment: '人工定义的地区编号，用于防止重复' },
      ownerUuid: { type: String, default: null },
      preownerUuid: { type: String, default: null, comment: '交易对手的uuid' },
      creatorUuid: { type: String, default: null },
      name: { type: String, default: null },
      intro: { type: String, default: null },
      image: { type: String, default: null },
      video: { type: String, default: null },
      address: { type: 'simple-json', default: '{}', nullable: true },
      geoposition: { type: 'simple-json', default: '{}', nullable: true },
      tagList: { type: 'simple-json', default: '[]', nullable: true },
      amount: { type: 'int', default: 1 },
      profitRate: { type: 'real', default: 0.05, comment: '卖家盈利，是成本价的一个比例' },
      feeRate: { type: 'real', default: 0.005, comment: '抵消成本的费用，通常是固定数额，也可是原始销售价格的一个比例' },
      taxRate: { type: 'real', default: 0.005, comment: '公共税收，通常是原始销售价格的一个比例' },
      startTime: { type: Date, default: null },
      startTimeUnix: { type: 'int', default: null },
      startPrice: { type: 'real', default: null },
      buyTimeUnix: { type: 'int', default: null }, // 交易达成的时间
      buyTimeUnixDaily: { type: 'int', default: null },
      buyPrice: { type: 'real', default: null },
      sellTimeUnix: { type: 'int', default: null },
      sellTimeUnixDaily: { type: 'int', default: null },
      sellPrice: { type: 'real', default: null },
      json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
      countLike: { type: 'int', default: 0 },
      countDislike: { type: 'int', default: 0 },
      countComment: { type: 'int', default: 0 },
    },
  }
})

DAD.parseOne = (place) => {
  place.json = JSON.parse(place.json)
  place.geoposition = JSON.parse(place.geoposition)
  place.address = JSON.parse(place.address)
  place.tagList = JSON.parse(place.tagList)
  place.startTime = new Date(place.startTime)
  return place
}

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}

DAD.api.getPlaceList = async function ({ _passtokenSource, skip = 0, order = { startTime: 'DESC' }, take = 10 } = {}) {
  // let [placeList, count] = await DAD.findAndCount({ skip, take, order })

  let placeList = await DAD.createQueryBuilder('place') // 用这样复杂的算法，主要是为了得到 like.status，其他都可以在前端直接获取。
    .leftJoinAndSelect(wo.User, 'owner', 'place.ownerUuid = owner.uuid')
    .leftJoinAndSelect(wo.Like, 'like', 'like.userUuid = :onlineUser and place.uuid = like.placeUuid', { onlineUser: _passtokenSource.uuid })
    .select(['place.*', 'owner.portrait', 'owner.nickname', 'like.status']) // 应当写在 leftJoin 之后，否则，会把所有 owner.* 都转成 owner_* 返回，不论有没有指明select哪些字段。
    .offset(skip)
    .limit(take)
    .orderBy(order)
    .getRawMany()
  let count = await DAD.count()
  if (Array.isArray(placeList)) {
    placeList.forEach((place, index) => {
      DAD.parseOne(place)
    })
    return { _state: 'SUCCESS', placeList, count }
  }
  return { _state: 'FAIL', placeList: [], count: 0 }
}

DAD.api.getMyLikedSceneList = async ({ _passtokenSource, skip = 0, take = 10, order = {} }) => {
  let sceneList = await DAD.createQueryBuilder('place')
    .leftJoinAndSelect(wo.User, 'owner', 'place.ownerUuid = owner.uuid')
    .leftJoinAndSelect(wo.Like, 'like', 'like.userUuid = :onlineUser and place.uuid = like.placeUuid', {
      onlineUser: _passtokenSource.uuid,
    })
    .select(['place.*', 'owner.portrait', 'owner.nickname', 'like.status']) // 应当写在 leftJoin 之后，否则，会把所有 owner.* 都转成 owner_* 返回，不论有没有指明select哪些字段。
    .where('like.status = :liked', { liked: 'LIKE' }) // 不知为何，必须放在这里才见效，不能在 leftJoinAndSelect(... like.status=:liked ...)
    .offset(skip)
    .limit(take)
    .orderBy(order)
    //    .getSql()
    .getRawMany()
  let countLike = await wo.Like.count({ where: { userUuid: _passtokenSource.uuid, status: 'LIKE' } })
  if (Array.isArray(sceneList)) {
    sceneList.forEach((scene, index) => {
      DAD.parseOne(scene)
    })
    return { _state: 'SUCCESS', estateList: sceneList, count: countLike }
  }
  return { _state: 'FAIL', estateList: [], count: 0 }
}

DAD.api.getMyCreatedSceneList = async ({ _passtokenSource, skip = 0, take = 10, order = {} }) => {
  let sceneList = await DAD.createQueryBuilder('place')
    .leftJoinAndSelect(wo.User, 'owner', 'place.creatorUuid = owner.uuid')
    .select(['place.*', 'owner.portrait', 'owner.nickname']) // 应当写在 leftJoin 之后，否则，会把所有 owner.* 都转成 owner_* 返回，不论有没有指明select哪些字段。
    .where({ creatorUuid: _passtokenSource.uuid })
    .offset(skip)
    .limit(take)
    .orderBy(order)
    //    .getSql()
    .getRawMany()
  let countCreated = await DAD.count({ where: { creatorUuid: _passtokenSource.uuid } })
  if (Array.isArray(sceneList)) {
    sceneList.forEach((scene, index) => {
      DAD.parseOne(scene)
    })
    return { _state: 'SUCCESS', estateList: sceneList, count: countCreated }
  }
  return { _state: 'FAIL', estateList: [], count: 0 }
}

DAD.api.getMyPlaceList = async ({ _passtokenSource, order = { buyTimeUnix: 'DESC' }, skip = 0, take = 10 } = {}) => {
  // let where = { ownerUuid: _passtokenSource.uuid }
  // let [estateList, count] = await DAD.findAndCount({ where, order, skip, take })
  // return { _state: 'SUCCESS', estateList, count }

  let placeList = await DAD.createQueryBuilder('place')
    .leftJoinAndSelect(wo.User, 'owner', 'place.ownerUuid=owner.uuid')
    .leftJoinAndSelect(wo.Like, 'like', 'like.userUuid=place.ownerUuid and like.placeUuid=place.uuid')
    .select(['place.*', 'owner.portrait', 'owner.nickname', 'like.status']) // 应当写在 leftJoin 之后，否则，会把所有 owner.* 都转成 owner_* 返回，不论有没有指明select哪些字段。
    .where({ ownerUuid: _passtokenSource.uuid })
    .offset(skip)
    .limit(take)
    .orderBy(order)
    .getRawMany()
  let count = await DAD.count({ where: { ownerUuid: _passtokenSource.uuid } })
  if (Array.isArray(placeList)) {
    placeList.forEach((place, index) => {
      DAD.parseOne(place)
    })
    return { _state: 'SUCCESS', estateList: placeList, count }
  }
  return { _state: 'FAIL', estateList: [], count: 0 }
}

DAD.api.payToCreatePlace = async function ({ _passtokenSource, Place }) {
  let creator = await wo.User.findOne({ uuid: _passtokenSource.uuid })

  if (creator.estateHoldingNumber >= ESTATE_RESTRICT) {
    return { _state: 'EXCEED_HOLDING_NUMBER' }
  }

  if (Place.startPrice && creator.balance < Place.startPrice) {
    return { _state: 'BALANCE_NOT_ENOUGH' }
  }

  let txTimeUnix = Date.now()
  if (Place.name && Place.profitRate) {
    let place = DAD.create(Place)
    place.creatorUuid = _passtokenSource.uuid
    place.ownerUuid = _passtokenSource.uuid
    place.feeRate = wo.config.FEE_RATE
    place.taxRate = wo.config.TAX_RATE
    place.startPrice = Number(place.startPrice)
    place.buyPrice = place.startPrice
    place.sellPrice = place.buyPrice * (1 + place.profitRate) * (1 + place.feeRate + place.taxRate)
    place.startTime = new Date(txTimeUnix)
    place.startTimeUnix = txTimeUnix
    place.buyTimeUnix = txTimeUnix
    place.buyTimeUnixDaily = place.buyTimeUnix % DAY_MILLIS
    place.sellTimeUnix = place.buyTimeUnix + FROZEN_MILLIS
    place.sellTimeUnixDaily = place.sellTimeUnix % DAY_MILLIS

    creator.balance -= place.startPrice
    // 创建新地产时，不需要交税费
    creator.estateHoldingNumber += 1
    creator.estateHoldingCost += place.startPrice
    creator.estateHoldingValue += place.startPrice * (1 + place.profitRate)
    creator.estateHoldingProfit += place.startPrice * place.profitRate

    await place.save()
    await creator.save()
    let txBuyer = wo.Trade.create({
      uuidPlace: place.uuid,
      uuidUser: creator.uuid,
      uuidOther: 'SYSTEM', // 前任主人就是这次交易的对家
      amount: -place.buyPrice, // 作为买家，是负数
      txGroup: 'ESTATE_TX',
      txType: 'ESTATE_CREATE',
      txTimeUnix: txTimeUnix,
      txTime: new Date(txTimeUnix),
      json: { Place: { name: place.name } },
    })
    txBuyer.txHash = ticCrypto.hash(wo.tool.sortAndFilterJson({ fields: txBuyer.constructor.schema.columns, entity: txBuyer, exclude: ['aiid', 'uuid'] }))
    if (await txBuyer.save()) {
      return {
        _state: 'ESTATE_CREATE_SUCCESS',
        place,
        trade: txBuyer,
      }
    }

    return {
      _state: 'ESTATE_CREATE_FAILED',
    }
  }
}

DAD.api.payToBuyPlace = async function ({ _passtokenSource, Place }) {
  let place = await DAD.findOne({ uuid: Place.uuid })
  let buyer = await wo.User.findOne({ uuid: _passtokenSource.uuid })

  if (buyer.estateHoldingNumber >= ESTATE_RESTRICT) {
    return { _state: 'EXCEED_HOLDING_NUMBER' }
  }

  if (buyer.balance < place.sellPrice) {
    return { _state: 'BALANCE_NOT_ENOUGH' }
  }

  let txTimeUnix = Date.now()
  if (place.sellTimeUnix < txTimeUnix) {
    // 再次确认，尚未被买走
    buyer.balance -= place.sellPrice
    buyer.estateFeeSum += place.buyPrice * (1 + place.profitRate) * place.feeRate
    buyer.estateTaxSum += place.buyPrice * (1 + place.profitRate) * place.taxRate
    buyer.estateHoldingNumber += 1
    buyer.estateHoldingCost += place.sellPrice
    buyer.estateHoldingValue += place.sellPrice * (1 + place.profitRate) // 包括了buyer买入后的预期盈利，让buyer更高兴
    buyer.estateHoldingProfit += place.sellPrice * place.profitRate

    let txBuyer = wo.Trade.create({
      uuidPlace: place.uuid,
      uuidUser: buyer.uuid,
      uuidOther: place.ownerUuid || 'SYSTEM', // 前任主人就是这次交易的对家
      amount: -place.sellPrice, // 作为买家，是负数
      // amountBuyer: -place.sellPrice,
      // amountSeller: place.buyPrice*(1+place.profitRate), // 注意不包含税费
      amountSystem: place.buyPrice * (1 + place.profitRate) * (place.feeRate + place.taxRate), // |amountBuyer| = amountSeller+amountSystem
      // 交易产生的LOG币也是USDT挖矿得到的，交易本身不是挖矿所得  amountMining: place.ownerUuid ? place.sellPrice-place.buyPrice : 0, // place.buyPrice*place.profitRate + place.buyPrice*(1+place.profitRate)*(place.feeRate+place.taxRate),
      txGroup: 'ESTATE_TX',
      txType: 'ESTATE_BUYIN',
      txTimeUnix: txTimeUnix,
      txTime: new Date(txTimeUnix),
      json: { Place: { name: place.name } },
    })
    let json = ticCrypto.hash(wo.tool.sortAndFilterJson({ fields: txBuyer.constructor.schema.columns, entity: txBuyer, exclude: ['aiid', 'uuid'] }))
    txBuyer.txHash = ticCrypto.hash(json)

    let seller
    if (place.ownerUuid) {
      // 如果有前任主人。（如果没有，就是系统初始化状态）
      seller = await wo.User.findOne({ uuid: place.ownerUuid })
      seller.balance += place.buyPrice * (1 + place.profitRate)
      seller.estateProfitSum += place.buyPrice * place.profitRate
      seller.estateHoldingNumber -= 1
      seller.estateHoldingCost -= place.buyPrice
      seller.estateHoldingValue -= place.buyPrice * (1 + place.profitRate)
      seller.estateHoldingProfit -= place.buyPrice * place.profitRate
      await seller.save()

      let txSeller = wo.Trade.create({
        uuidPlace: place.uuid,
        uuidUser: seller.uuid,
        uuidOther: buyer.uuid,
        amount: place.buyPrice * (1 + place.profitRate), // 注意不包含税费
        txGroup: 'ESTATE_TX',
        txType: 'ESTATE_SELLOUT',
        txTimeUnix: txTimeUnix,
        txTime: new Date(txTimeUnix),
        json: { Place: { name: place.name } },
      })
      txSeller.txHash = ticCrypto.hash(wo.tool.sortAndFilterJson({ fields: txSeller.constructor.schema.columns, entity: txSeller, exclude: ['aiid', 'uuid'] }))
      await txSeller.save()
    }

    let originalBuyTimeUnix = place.buyTimeUnix

    place.preownerUuid = place.ownerUuid
    place.ownerUuid = buyer.uuid
    place.buyPrice = place.sellPrice
    place.sellPrice = place.buyPrice * (1 + place.profitRate) * (1 + place.feeRate + place.taxRate)
    place.buyTimeUnix = txTimeUnix
    place.buyTimeUnixDaily = place.buyTimeUnix % DAY_MILLIS
    place.sellTimeUnix = place.buyTimeUnix + FROZEN_MILLIS
    place.sellTimeUnixDaily = place.sellTimeUnix % DAY_MILLIS

    await place.save()
    await buyer.save()
    await txBuyer.save()

    return {
      _state: 'ESTATE_BUYIN_SUCCESS',
      place,
      trade: txBuyer,
    }
  }
  return {
    _state: 'ESTATE_BUYIN_FAILED',
  }
}

DAD.api.uploadImage = async function ({ _passtokenSource, _req }) {
  // Estate 尚未存入数据库，只是上传图片，不修改数据库
  if (_passtokenSource && _passtokenSource.isOnline) {
    let file = _req.file
    if (file && /^image\//.test(file.mimetype)) {
      return Object.assign(file, { _state: 'SUCCESS' })
    } else {
      return { _state: 'FILE_NOT_IMAGE' }
    }
  } else {
    return { _state: 'USER_NOT_ONLINE' }
  }
}

DAD.api.changeImage = async function ({ _passtokenSource, Place, _req }) {
  if (_passtokenSource && _passtokenSource.isOnline && Place && Place.uuid) {
    let place = await DAD.findOne({ uuid: Place.uuid })
    if (place && place.ownerUuid === _passtokenSource.uuid) {
      let file = _req.file
      if (file && /^image\//.test(file.mimetype)) {
        await DAD.update({ uuid: Place.uuid }, { image: _req.file.filename })
        return Object.assign(file, { _state: 'SUCCESS' })
      } else {
        return { _state: 'FILE_NOT_IMAGE' }
      }
    } else {
      return { _state: 'NOT_ESTATE_OWNER' }
    }
  } else {
    return { _state: 'USER_NOT_ONLINE' }
  }
}
DAD.api.changeImage2Cloud = async function ({ _passtokenSource, Place }) {
  if (_passtokenSource && _passtokenSource.isOnline && Place && Place.uuid && Place.image) {
    let place = await DAD.findOne({ uuid: Place.uuid })
    if (place && place.ownerUuid === _passtokenSource.uuid) {
      await DAD.update({ uuid: Place.uuid }, { image: Place.image })
      return Object.assign({ _state: 'SUCCESS' })
    } else {
      return { _state: 'NOT_ESTATE_OWNER' }
    }
  } else {
    return { _state: 'FAIL' }
  }
}

DAD.api.changeIntro = async function ({ _passtokenSource, Place }) {
  if (_passtokenSource && _passtokenSource.isOnline && Place && Place.uuid && Place.intro) {
    let place = await DAD.findOne({ uuid: Place.uuid })
    if (place && place.ownerUuid === _passtokenSource.uuid) {
      await DAD.update({ uuid: Place.uuid }, { intro: Place.intro })
      return { _state: 'SUCCESS' }
    } else {
      return { _state: 'NOT_ESTATE_OWNER' }
    }
  } else {
    return { _state: 'INPUT_MALFORMED' }
  }
}

DAD.api.deletePlace = async function ({ _passtokenSource, place }) {
  if (place && place.uuid && _passtokenSource && _passtokenSource.uuid) {
    return await torm.getManager().transaction(async (txman) => {
      await txman.delete(DAD, { uuid: place.uuid, ownerUuid: _passtokenSource.uuid })
      return { _state: 'SUCCESS' }
    })
  }
  return { _state: 'FAILED' }
}

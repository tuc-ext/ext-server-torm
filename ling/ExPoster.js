// import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"
const to = require('typeorm')
const Ling = require('so.ling/Ling.to.js')

const DAD = (module.exports = class ExPoster extends Ling {
  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      json: { type: 'simple-json', nullable: true },
      ownerUuid: { type: String, default: null },
      type: { type: String, default: null },
      amount: { type: 'real', default: 0 },
      frozenAmount: { type: 'real', default: 0 },
      price: { type: 'real', default: 1 },
      payChannel: { type: 'simple-json', default: '{}' },
      startTime: { type: Date, default: null },
      notes: { type: String, default: null },
      status: { type: String, default: 'ACTIVE', nullable: true },
    },
  }
})

DAD.api = {}

DAD.api.createPoster = async ({ ExPoster, _passtokenSource } = {}) => {
  if (_passtokenSource && _passtokenSource.uuid && ExPoster) {
    let onlineUser = await wo.User.findOne({ uuid: _passtokenSource.uuid })
    if (onlineUser.kycStateL1 !== 'PASSED' || onlineUser.kycStateL2 !== 'PASSED') {
      return { _state: 'USER_NOT_KYC' }
    }
    ExPoster.ownerUuid = _passtokenSource.uuid
    ExPoster.startTime = new Date()
    ExPoster.amount = Number(ExPoster.amount) || 0
    if (ExPoster.type === 'SELL') {
      if (onlineUser.balance < ExPoster.amount) {
        return { _state: 'BALANCE_NOT_ENOUGH' }
      }
      await onlineUser.constructor.update(
        { uuid: _passtokenSource.uuid },
        { balance: onlineUser.balance - ExPoster.amount, frozenBalance: onlineUser.frozenBalance + ExPoster.amount }
      )
    }
    let poster = await DAD.create(ExPoster).save()
    return {
      _state: 'SUCCESS',
      poster,
    }
  }
  return {
    _state: 'INVALID_INPUT',
  }
}

DAD.api.cancelPoster = async ({ ExPoster: { uuid } = {}, _passtokenSource } = {}) => {
  let poster = await wo.ExPoster.findOne({ uuid: uuid })
  if (poster && _passtokenSource.uuid === poster.ownerUuid) {
    // 如果本广告还有进行中的订单，就不能撤销。
    let suborderCount = await wo.ExOrder.count({ where: { posterUuid: uuid, status: to.Not('ORDER_COMPLETED') } })
    if (suborderCount > 0) {
      return { _state: 'ORDER_IN_PROCESS' }
    }

    await to.getManager().transaction(async (txman) => {
      if (poster.type === 'SELL') {
        let onlineUser = await wo.User.findOne({ uuid: _passtokenSource.uuid })
        await txman.update(
          wo.User,
          { uuid: poster.ownerUuid },
          {
            balance: onlineUser.balance + poster.amount,
            frozenBalance: onlineUser.frozenBalance - poster.amount,
          }
        )
      }
      await txman.update(DAD, { uuid: uuid }, { status: 'CANCELED' })
    })
    return { _state: 'SUCCESS' }
  }
}

DAD.api.getSellPosterList = async ({ order = { price: 'ASC' }, take = 10, skip = 0 } = {}) => {
  let [posterList, count] = await DAD.findAndCount({ where: { type: 'SELL', status: to.Not('CANCELED') }, take, order, skip })
  if (posterList) {
    for (let poster of posterList) {
      let owner = await wo.User.findOne({ uuid: poster.ownerUuid })
      poster.ownerName = owner.nickname
      poster.ownerPortrait = owner.portrait
    }
    return { _state: 'SUCCESS', posterList, count }
  }
  return { _state: 'FAILED' }
}
DAD.api.getBuyPosterList = async ({ order = { price: 'DESC' }, take = 10, skip = 0 } = {}) => {
  let [posterList, count] = await DAD.findAndCount({ where: { type: 'BUY', status: to.Not('CANCELED') }, take, order, skip })
  if (posterList) {
    for (let poster of posterList) {
      let owner = await wo.User.findOne({ uuid: poster.ownerUuid })
      poster.ownerName = owner.nickname
      poster.ownerPortrait = owner.portrait
    }
    return { _state: 'SUCCESS', posterList, count }
  }
  return { _state: 'FAILED' }
}

DAD.api.getMyPosterList = async ({ _passtokenSource, skip = 0, take = 10, order = { startTime: 'DESC' } } = {}) => {
  if (_passtokenSource && _passtokenSource.uuid) {
    let [myPosterList, count] = await DAD.findAndCount({ where: { ownerUuid: _passtokenSource.uuid }, skip, take, order })
    return { _state: 'SUCCESS', myPosterList, count }
  } else {
    return { _state: 'INVALID_INPUT' }
  }
}

DAD.api.getSuborderList = async ({ _passtokenSource, posterUuid, order = { startTime: 'DESC' }, take = 10 } = {}) => {
  if (posterUuid && _passtokenSource && _passtokenSource.uuid) {
    let poster = await DAD.findOne({ uuid: posterUuid })
    if (poster && poster.ownerUuid === _passtokenSource.uuid) {
      let suborderList = await wo.ExOrder.find({ where: { posterUuid: posterUuid }, take, order })
      for (let order of suborderList) {
        let seller = await wo.User.findOne({ uuid: order.sellerUuid })
        order.sellerName = seller.nickname
        order.sellerPortrait = seller.portrait
        let buyer = await wo.User.findOne({ uuid: order.buyerUuid })
        order.buyerName = buyer.nickname
        order.buyerPortrait = buyer.portrait
      }
      return { _state: 'SUCCESS', suborderList }
    } else {
      return { _state: 'Unauthorized' }
    }
  }
}

DAD.api.getMyOrder = async ({ _passtokenSource, posterUuid, type } = {}) => {
  // 一个广告下，我只能有一个正在进行中的订单。
  let myOrder = await wo.ExOrder.findOne({ posterUuid: posterUuid, ownerUuid: _passtokenSource.uuid, type: type, status: to.Not('ORDER_COMPLETED') })
  return { _state: 'SUCCESS', myOrder }
}

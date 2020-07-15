// import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"
const to = require('typeorm')
const Ling = require('so.ling/Ling.to.js')

const DAD = (module.exports = class ExOrder extends Ling {
  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      json: { type: 'simple-json', nullable: true },
      ownerUuid: { type: String, default: null },
      sellerUuid: { type: String, default: null },
      buyerUuid: { type: String, default: null },
      type: { type: String, default: null },
      amount: { type: 'real', default: 0 },
      //      price: { type: 'real', default: 1 },
      startTime: { type: Date, default: null },
      payTime: { type: Date, default: null },
      releaseTime: { type: Date, default: null },
      status: { type: String, default: null },
      notes: { type: String, default: null },
      posterUuid: { type: String, default: null },
      poster: { type: 'simple-json', default: '{}' },
    },
  }
})

DAD.api = {}

DAD.api.createOrder = async ({ ExOrder, _passtokenSource } = {}) => {
  if (_passtokenSource && _passtokenSource.uuid && ExOrder && ExOrder.posterUuid) {
    let onlineUser = await wo.User.findOne({ uuid: _passtokenSource.uuid })
    if (onlineUser.kycStateL1 !== 'PASSED' || onlineUser.kycStateL2 !== 'PASSED') {
      return { _state: 'USER_NOT_KYC' }
    }

    // 一个人在一个广告下，只能同时有一个进行中的订单
    let myOrder = await DAD.findOne({ ownerUuid: _passtokenSource.uuid, status: to.Not('ORDER_COMPLETED') })
    if (myOrder) {
      return { _state: 'ORDER_IN_PROCESS' }
    }

    ExOrder.poster = await wo.ExPoster.findOne({ uuid: ExOrder.posterUuid })
    if (ExOrder.poster.status === 'CANCELED') {
      // 确认该广告还有效
      return { _state: 'POSTER_CANCELED' }
    }
    ExOrder.ownerUuid = _passtokenSource.uuid
    ExOrder.startTime = new Date()
    ExOrder.status = 'WAITING_PAY'
    ExOrder.amount = Number(ExOrder.amount) || 0

    if (ExOrder.poster.type === 'BUY') {
      ExOrder.sellerUuid = _passtokenSource.uuid
      ExOrder.buyerUuid = ExOrder.poster.ownerUuid
      ExOrder.type = 'SELL'
      // 冻结我的 LOG
      let onlineUser = await wo.User.findOne({ uuid: _passtokenSource.uuid })
      if (onlineUser.balance < ExOrder.amount) {
        return { _state: 'BALANCE_NOT_ENOUGH' }
      }
      await wo.User.update(
        { uuid: _passtokenSource.uuid },
        { balance: onlineUser.balance - ExOrder.amount, frozenBalance: onlineUser.frozenBalance + ExOrder.amount }
      )
      // 把订单出售数量从卖主广告里冻结
      await wo.ExPoster.update(
        { uuid: ExOrder.posterUuid },
        { amount: ExOrder.poster.amount - ExOrder.amount, frozenAmount: ExOrder.poster.frozenAmount + ExOrder.amount }
      )
      let order = await DAD.create(ExOrder).save()
      order.poster = ExOrder.poster // 严重注意, 直接 DAD.save(ExOrder) 后，ExOrder的json字段会变空，导致 order.poster = ExOrder.poster 不起作用。解法1: DAD.create(ExOrder).save() 就可以了
      let seller = await wo.User.findOne({ uuid: order.sellerUuid })
      order.sellerName = seller.nickname
      order.sellerPortrait = seller.portrait
      wo.appSocket.sendToOne({ skevent: 'SELL_ORDER_CREATED', order }, order.poster.ownerUuid) // 通知卖家
      return { _state: 'SUCCESS', order }
    } else if (ExOrder.poster.type === 'SELL') {
      ExOrder.sellerUuid = ExOrder.poster.ownerUuid
      ExOrder.buyerUuid = _passtokenSource.uuid
      ExOrder.type = 'BUY'
      // 把订单购买数量从卖家广告里冻结
      await wo.ExPoster.update(
        { uuid: ExOrder.posterUuid },
        { amount: ExOrder.poster.amount - ExOrder.amount, frozenAmount: ExOrder.poster.frozenAmount + ExOrder.amount }
      )
      let order = await DAD.create(ExOrder).save()
      order.poster = ExOrder.poster
      let buyer = await wo.User.findOne({ uuid: order.buyerUuid })
      order.buyerName = buyer.nickname
      order.buyerPortrait = buyer.portrait
      wo.appSocket.sendToOne({ skevent: 'BUY_ORDER_CREATED', order }, order.poster.ownerUuid) // 通知卖家
      return { _state: 'SUCCESS', order }
    }
  }
  return {
    _state: 'INVALID_INPUT',
  }
}

DAD.api.getMyOrderList = async ({ _passtokenSource, order = { startTime: 'DESC' }, take = 10 } = {}) => {
  if (_passtokenSource && _passtokenSource.uuid) {
    let myOrderList = await DAD.find({ where: { ownerUuid: _passtokenSource.uuid }, order, take })
    return { _state: 'SUCCESS', myOrderList }
  } else {
    return { _state: 'INVALID_INPUT' }
  }
}

DAD.api.confirmPay = async ({ ExOrder, _passtokenSource } = {}) => {
  if (_passtokenSource && _passtokenSource.uuid && ExOrder.uuid) {
    let order = await DAD.findOne({ uuid: ExOrder.uuid })
    if (order && new Date() - order.startTime <= 30 * 60 * 1000) {
      order.status = 'WAITING_RELEASE'
      order.payTime = new Date()
      await DAD.update({ uuid: ExOrder.uuid }, { status: order.status, payTime: order.payTime })
      wo.appSocket.sendToOne({ skevent: 'PAY_CONFIRMED', order: { status: order.status, payTime: order.payTime } }, order.sellerUuid) // 通知卖家
      return { _state: 'SUCCESS', order }
    } else {
      return { _state: 'PAY_EXPIRED' }
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.confirmRelease = async ({ ExOrder, _passtokenSource } = {}) => {
  if (_passtokenSource && _passtokenSource.uuid && ExOrder && ExOrder.uuid) {
    let order = await DAD.findOne({ uuid: ExOrder.uuid })
    if (order) {
      if (order.status === 'ORDER_COMPLETED') {
        // 防止重复确认
        return { _state: 'SUCCESS', order }
      } else if (new Date() - order.payTime > 30 * 60 * 1000) {
        return { _state: 'RELEASE_EXPIRED' }
      }
      order.status = 'ORDER_COMPLETED'
      order.releaseTime = new Date()
      await to.getManager().transaction(async (txman) => {
        // 更新买家卖家
        await txman.decrement(wo.User, { uuid: order.sellerUuid }, 'frozenBalance', order.amount)
        await txman.increment(wo.User, { uuid: order.buyerUuid }, 'balance', order.amount)
        // 更新订单
        await txman.update(DAD, { uuid: order.uuid }, { releaseTime: order.releaseTime, status: order.status })
        // 更新广告
        await txman.decrement(wo.ExPoster, { uuid: order.posterUuid }, 'frozenAmount', order.amount)
      })
      wo.appSocket.sendToOne({ skevent: 'RELEASE_CONFIRMED', order: { releaseTime: order.releaseTime, status: order.status } }, order.buyerUuid) // 通知买家
      return { _state: 'SUCCESS', order }
    } else {
      return { _state: 'INVALID_ORDER' }
    }
  } else {
    return { _state: 'INPUT_MALFORMED' }
  }
}

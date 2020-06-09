// import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"
const to = require('typeorm')
const Ling = require('so.ling/Ling.to.js')

const DAD = module.exports = class ExOrder extends Ling{

  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      json: { type: 'simple-json', nullable: true, },
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
      poster: { type: 'simple-json', default: null },
    }
  }

}

DAD.api = {}

DAD.api.createOrder = async ({ExOrder, _passtokenSource}={})=>{
  if (_passtokenSource && _passtokenSource.uuid 
    && ExOrder && ExOrder.posterUuid) {
    ExOrder.ownerUuid = _passtokenSource.uuid
    ExOrder.startTime = new Date()
    ExOrder.status = 'WAITING_PAY'
    ExOrder.poster = await wo.ExPoster.findOne({uuid: ExOrder.posterUuid})
    if (ExOrder.poster.type==='BUY'){
      ExOrder.sellerUuid = _passtokenSource.uuid
      ExOrder.buyerUuid = ExOrder.poster.ownerUuid
      ExOrder.type = 'SELL'
      // 冻结我的 LOG
    }else if (ExOrder.poster.type==='SELL'){
      ExOrder.sellerUuid = ExOrder.poster.ownerUuid
      ExOrder.buyerUuid = _passtokenSource.uuid
      ExOrder.type = 'BUY'
      // 冻结广告商的 LOG
    }

    let order = await DAD.create(ExOrder).save()
    order.poster = ExOrder.poster
    // todo: 减少原广告 log 数额
    return { 
      _state:'SUCCESS',
      order
    }
  }
  return { 
    _state: 'INVALID_INPUT'
  }
}

DAD.api.getMyOrderList = async ({_passtokenSource, order={startTime: 'DESC'}, take=10}={})=>{
  if ( _passtokenSource && _passtokenSource.uuid ){
    let myOrderList = await DAD.find({where:{ownerUuid:_passtokenSource.uuid}, take})
    return { _state:'SUCCESS', myOrderList }
  }else {
    return { _state:'INVALID_INPUT' }
  }
}

DAD.api.confirmPay = async ({ExOrder, _passtokenSource}={})=>{
  if (_passtokenSource && _passtokenSource.uuid && ExOrder.uuid) {
    let order = await DAD.findOne({uuid:ExOrder.uuid})
    if (order && new Date() - order.startTime <= 30*60*1000) {
      order.status = 'WAITING_RELEASE'
      order.payTime = new Date()
      await DAD.update( { uuid:ExOrder.uuid }, { status: order.status, payTime: order.payTime })
      wo.appSocket.sendToOne({skevent: 'PAY_CONFIRMED', order:{ status: order.status, payTime: order.payTime }}, order.sellerUuid) // 通知卖家
      return { _state: 'SUCCESS', order }
    }else{
      return { _state: 'PAY_EXPIRED' }
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.confirmRelease = async ({ExOrder, _passtokenSource}={}) => {
  if (_passtokenSource && _passtokenSource.uuid && ExOrder && ExOrder.uuid) {
    let order = await DAD.findOne({uuid:ExOrder.uuid})
    if (order && new Date() - order.payTime <= 30*60*1000) {
      order.status = 'ORDER_COMPLETED'
      order.releaseTime = new Date()
      await to.getManager().transaction(async txman=>{
        await txman.decrement(wo.User, {uuid:order.sellerUuid}, 'frozenBalance', order.amount)
        await txman.increment(wo.User, {uuid:order.buyerUuid}, 'frozenBalance', order.amount)
        await txman.update(DAD, {uuid:order.uuid}, {releaseTime: order.releaseTime, status:order.status})
      })
      wo.appSocket.sendToOne({skevent: 'RELEASE_CONFIRMED', order: { releaseTime: order.releaseTime, status:order.status }}, order.buyerUuid) // 通知买家
      return { _state: 'SUCCESS', order } 
    }else {
      return { _state: 'RELEASE_EXPIRED' }
    }
  }
}


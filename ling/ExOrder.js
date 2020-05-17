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
      owner: { type: String, default: null },
      type: { type: String, default: null },
      amount: { type: 'real', default: 0 },
      price: { type: 'real', default: 1 },
      startTime: { type: Date, default: null },
      status: { type: String, default: null },
      notes: { type: String, default: null },
      poster: { type: String, default: null }
    }
  }

}

DAD.api = {}

DAD.api.createOrder = async ({ExOrder, _passtokenSource}={})=>{
  if (_passtokenSource && _passtokenSource.isOnline 
    && ExOrder && ExOrder.poster) {
    ExOrder.owner = _passtokenSource.uuid
    ExOrder.startTime = new Date()
    ExOrder.status = 'WAITING_PAY'
    let poster = await wo.ExPoster.findOne({uuid: ExOrder.poster})
    ExOrder.type = poster.type==='BUY' ? 'SELL' : 'BUY'
    ExOrder.price = poster.price
    let order = await DAD.create(ExOrder).save()
    return { 
      _state:'SUCCESS',
      order
    }
  }
  return { 
    _state: 'INVALID_INPUT'
  }
}

DAD.api.getMyOrderList = async ({_passtokenSource, take=10}={})=>{
  if ( _passtokenSource && _passtokenSource.uuid ){
    let myOrderList = await DAD.find({where:{owner:_passtokenSource.uuid}, take})
    return { _state:'SUCCESS', myOrderList }
  }else {
    return { _state:'INVALID_INPUT' }
  }
}

DAD.api.confirmPay = async ({ExOrder, _passtokenSource}={})=>{
  if (_passtokenSource && _passtokenSource.uuid && ExOrder.uuid) {
    await DAD.update({uuid:ExOrder.uuid}, { status: 'WAITING_RELEASE' })
    return { _state: 'SUCCESS', order: await DAD.findOne({uuid:ExOrder.uuid}) }
  }
}
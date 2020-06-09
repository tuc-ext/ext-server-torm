// import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"
const to = require('typeorm')
const Ling = require('so.ling/Ling.to.js')

const DAD = module.exports = class ExPoster extends Ling{

  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      json: { type: 'simple-json', nullable: true, },
      ownerUuid: { type: String, default: null },
      type: { type: String, default: null },
      amount: { type: 'real', default: 0 },
      price: { type: 'real', default: 1 },
      payChannel: {type: 'simple-json', default:null },
      startTime: { type: Date, default: null },
      notes: { type: String, default: null },
      status: { type: String, default: null },
    }
  }

}

DAD.api = {}

DAD.api.createPoster = async ({ExPoster, _passtokenSource}={})=>{
  if (_passtokenSource && _passtokenSource.uuid && ExPoster ) {
    ExPoster.ownerUuid = _passtokenSource.uuid
    ExPoster.startTime = new Date()
    let myOrder = await wo.ExOrder.findOne({ ownerUuid: _passtokenSource.uuid, status:to.Not('ORDER_COMPLETED') })
    if (!myOrder){
      let poster = await DAD.create(ExPoster).save()
      return { 
        _state:'SUCCESS',
        poster
      }
    }else{
      return { _state: 'ORDER_INCOMPLETE' }
    }
  }
  return { 
    _state: 'INVALID_INPUT'
  }
}

DAD.api.cancelPoster = async ({ExPoster:{uuid}})=>{
  await DAD.update({uuid:uuid}, {status:'CANCELED'})
  return { _state: 'SUCCESS' }
}

DAD.api.getSellPosterList = async ({ order={price:'ASC'}, take=10 }={})=>{
  let posterList = await DAD.find({where:{type:'SELL'}, take, order})
  if (posterList) {
    return { _state:'SUCCESS', posterList }
  }
  return { _state:'FAILED' }
}
DAD.api.getBuyPosterList = async ({ order={price:'DESC'}, take=10 }={})=>{
  let posterList = await DAD.find({where:{type:'BUY'}, take, order})
  if (posterList) {
    return { _state:'SUCCESS', posterList }
  }
  return { _state:'FAILED' }
}

DAD.api.getMyPosterList = async ({ _passtokenSource, take=10, order={startTime:'DESC'} }={})=>{
  if ( _passtokenSource && _passtokenSource.uuid ){
    let myPosterList = await DAD.find({where:{ownerUuid:_passtokenSource.uuid}, take, order})
    return { _state:'SUCCESS', myPosterList }
  }else {
    return { _state:'INVALID_INPUT' }
  }
}

DAD.api.getSuborderList = async ( { _passtokenSource, posterUuid, order, take=10 }={} )=>{
  if (posterUuid && _passtokenSource && _passtokenSource.uuid){
    let poster = await DAD.findOne({uuid:posterUuid})
    if (poster && poster.ownerUuid === _passtokenSource.uuid) {
      let suborderList = await wo.ExOrder.find({where:{posterUuid:posterUuid}, take, order})
      return { _state: 'SUCCESS', suborderList }
    }else{
      return { _state: 'Unauthorized'}
    }
  }
}

DAD.api.getMyOrder = async ( { _passtokenSource, posterUuid, type }={} ) => { // 一个广告下，我只能有一个正在进行中的订单。
  let myOrder = await wo.ExOrder.findOne({ posterUuid: posterUuid, ownerUuid: _passtokenSource.uuid, type: type, status: to.Not('ORDER_COMPLETED') })
  return { _state: 'SUCCESS', myOrder }
}

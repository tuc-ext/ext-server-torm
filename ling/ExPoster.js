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
      owner: { type: String, default: null },
      type: { type: String, default: null },
      amount: { type: 'real', default: 0 },
      price: { type: 'real', default: 1 },
      payChannel: {type: 'simple-json', default:null },
      startTime: { type: Date, default: null },
      notes: { type: String, default: null }
    }
  }

}

DAD.api = {}

DAD.api.createPoster = async ({ExPoster, _passtokenSource}={})=>{
  if (_passtokenSource && _passtokenSource.isOnline && ExPoster ) {
    ExPoster.owner = _passtokenSource.uuid
    ExPoster.startTime = new Date()
    let poster = await DAD.create(ExPoster).save()
    return { 
      _state:'SUCCESS',
      poster
    }
  }
  return { 
    _state: 'INVALID_INPUT'
  }
}

DAD.api.getSellPosterList = async ({ take=10 }={})=>{
  let posterList = await DAD.find({where:{type:'SELL'}, take})
  if (posterList) {
    return { _state:'SUCCESS', posterList }
  }
  return { _state:'FAILED' }
}

DAD.api.getMyPosterList = async ({ _passtokenSource, take=10 }={})=>{
  if ( _passtokenSource && _passtokenSource.uuid ){
    let myPosterList = await DAD.find({where:{owner:_passtokenSource.uuid}, take})
    return { _state:'SUCCESS', myPosterList }
  }else {
    return { _state:'INVALID_INPUT' }
  }
}
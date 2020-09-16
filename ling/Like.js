// import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"
const to = require('typeorm')
const Ling = require('so.ling/Ling.to.js')

const DAD = (module.exports = class Like extends Ling {
  static schema = {
    name: this.name,
    target: this,
    columns: {
      // aiid: { type: 'int', generated: true, primary: true },
      // uuid: { type: String, generated: 'uuid', unique: true },
      userUuid: { type: String, primary: true },
      placeUuid: { type: String, primary: true },
      status: { type: String, nullable: true },
      editTimeUnix: { type: 'int', default: 0 },
      createTimeUnix: { type: 'int', default: 0 },
      json: { type: 'simple-json', default: '{}', nullable: true },
    },
  }
})

DAD.api = {}

DAD.api.like = async ({ _passtokenSource, placeUuid }) => {
  if (_passtokenSource && _passtokenSource.uuid && placeUuid) {
    let like = new DAD({ userUuid: _passtokenSource.uuid, placeUuid, status: 'LIKE', editTimeUnix: Date.now() })
    return await to.getManager().transaction(async (txman) => {
      await txman.save(like)
      await txman.increment(wo.Place, { uuid: placeUuid }, 'countLike', 1)
      return { _state: 'SUCCESS', like }
    })
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.dislike = async ({ _passtokenSource, placeUuid }) => {
  if (_passtokenSource && _passtokenSource.uuid && placeUuid) {
    let like = new DAD({ userUuid: _passtokenSource.uuid, placeUuid, status: 'DISLIKE', editTimeUnix: Date.now() })
    return await to.getManager().transaction(async (txman) => {
      await txman.save(like)
      await txman.increment(wo.Place, { uuid: placeUuid }, 'countDislike', 1)
      return { _state: 'SUCCESS', like }
    })
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.clear = async ({ _passtokenSource, placeUuid, statusNow }) => {
  if (_passtokenSource && _passtokenSource.uuid && placeUuid && ['0', 'LIKE', 'DISLIKE'].indexOf(statusNow)) {
    return await to.getManager().transaction(async (txman) => {
      let like = await DAD.find({ userUuid: _passtokenSource.uuid, placeUuid, status: statusNow })
      if (like) {
        await txman.update(DAD, { userUuid: _passtokenSource.uuid, placeUuid }, { status: null, editTimeUnix: Date.now() })
        await txman.decrement(wo.Place, { uuid: placeUuid }, statusNow === 'LIKE' ? 'countLike' : 'countDislike', 1)
        return { _state: 'SUCCESS', like }
      }
      return { _state: 'INPUT_INVALID' }
    })
  }
  return { _state: 'INPUT_MALFORMED' }
}

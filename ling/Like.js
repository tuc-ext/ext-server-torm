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
  let like = new DAD({ userUuid: _passtokenSource.uuid, placeUuid, status: 'LIKE', editTimeUnix: Date.now() })
  await like.save()
  return { _state: 'SUCCESS', like }
}

DAD.api.dislike = async ({ _passtokenSource, placeUuid }) => {
  let like = new DAD({ userUuid: _passtokenSource.uuid, placeUuid, status: 'DISLIKE', editTimeUnix: Date.now() })
  await like.save()
  return { _state: 'SUCCESS', like }
}

DAD.api.clear = async ({ _passtokenSource, placeUuid }) => {
  let like = new DAD({ userUuid: _passtokenSource.uuid, placeUuid, status: null, editTimeUnix: Date.now() })
  await like.save()
  return { _state: 'SUCCESS', like }
}

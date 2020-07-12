// import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"
const to = require('typeorm')
const Ling = require('so.ling/Ling.to.js')

const DAD = module.exports = class Story extends Ling {

  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      image: { type: String, nullable: true },
      text: { type: String, nullable: true },
      owner: { type: String, nullable: true },
      place: { type: String, nullable: true },
      fromTime: { type: Date, nullable: true },
      toTime: { type: Date, nullable: true },
      fromTimeUnix: { type: 'int', nullable: true },
      toTimeUnix: { type: 'int', nullable: true },
      json: { type: 'simple-json', default: '{}', nullable: true, }
    }
  }

}

DAD.api = {}
DAD.api.getStoryList = async ({ Place } = {}) => {
  let [list, count] = await DAD.findAndCount({ where: { place: Place.uuid }, skip: 0, take: 10, order: { aiid: 'DESC' } })
  return { _state: 'SUCCESS', list, count }
}


// import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"
const to = require('typeorm')

const DAD = module.exports = class Story extends to.BaseEntity{

  static schema = {
    name: Story.name,
    target: Story,
    columns: {
      aiid: { type: Number, primary: true, generated: true },
      uuid: { type: String, generated: 'uuid', },
      image: { type: String, nullable: true },
      text: { type: String, nullable: true },
      owner: { type: String, nullable: true },
      place: { type: String, nullable: true },
      fromTime: { type: Date, nullable: true },
      toTime: { type: Date, nullable: true },
      json: { type: 'simple-json', nullable: true, }
    }
  }

}

DAD.api = {}
DAD.api.getStoryList = async ({ Place } = {}) => {
  let [ list, count ] = await DAD.findAndCount({ where: {place: Place.uuid}, skip: 0, take: 10, order: {aiid: 'DESC'} })
  return { _state: 'SUCCESS', list, count }
}


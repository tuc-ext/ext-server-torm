// import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"
const to = require('typeorm')
const Ling = require('so.ling/Ling.to.js')

const DAD = (module.exports = class Story extends Ling {
  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      author: { type: 'simple-json', default: '{}' },
      placeUuid: { type: String, nullable: true },
      editTimeUnix: { type: 'int', default: 0 },
      createTimeUnix: { type: 'int', default: 0 },
      storyContent: { type: 'simple-json', default: '[]', nullable: true },
    },
  }
})

DAD.api = {}
DAD.api.getStoryList = async ({ placeUuid } = {}) => {
  let [list, count] = await DAD.findAndCount({ where: { placeUuid }, skip: 0, take: 10, order: { aiid: 'DESC' } })
  return { _state: 'SUCCESS', storyList: list, count }
}

DAD.api.publish = async ({ _passtokenSource, story: { author, placeUuid, storyContent, uuid } = {} }) => {
  if (_passtokenSource && author && _passtokenSource.uuid === author.uuid) {
    if (uuid) {
      let story = await DAD.findOne({ uuid: uuid, placeUuid: placeUuid })
      if (story && story.author && story.author.uuid === _passtokenSource.uuid && story.placeUuid === placeUuid) {
        await DAD.update({ uuid: uuid }, { placeUuid, author, storyContent, editTimeUnix: Date.now() })
        return { _state: 'SUCCESS', story: { uuid: uuid } }
      } else {
        return { _state: 'UNMATCHED_STORY' }
      }
    } else {
      let createTimeUnix = Date.now()
      let story = await DAD.save({ placeUuid, author, storyContent, createTimeUnix, editTimeUnix: createTimeUnix })
      return { _state: 'SUCCESS', story: { uuid: story.uuid } }
    }
  }
  return { _state: 'UNAUTHORIZED_AUTHOR' }
}

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
      author_uuid: { type: String, nullable: true },
      placeUuid: { type: String, nullable: true },
      editTimeUnix: { type: 'int', default: 0 },
      createTimeUnix: { type: 'int', default: 0 },
      storyContent: { type: 'simple-json', default: '[]', nullable: true },
    },
  }
})

DAD.api = {}
DAD.api.getStoryList = async ({ placeUuid, skip = 0, take = 10, order = { aiid: 'DESC' } } = {}) => {
  // let [storyList, count] = await DAD.findAndCount({ where: { placeUuid }, skip, take, order })
  let storyList = await DAD.createQueryBuilder('story')
    .leftJoinAndSelect(wo.User, 'author', 'author.uuid=story.author_uuid')
    .select(['story.*', 'author.portrait', 'author.nickname'])
    .where('story.placeUuid=:placeUuid', { placeUuid })
    .offset(skip)
    .limit(take)
    .orderBy(order)
    .getRawMany()
  storyList.forEach((story) => {
    story.storyContent = JSON.parse(story.storyContent)
  })
  let count = await DAD.count({ placeUuid })
  return { _state: 'SUCCESS', storyList, count }
}

DAD.api.deleteStory = async ({ _passtokenSource, story: { uuid } = {} }) => {
  if (uuid) {
    let story = await DAD.findOne({ uuid: uuid })
    if (story && story.author && story.author.uuid === _passtokenSource.uuid) {
      await DAD.delete({ uuid: uuid })
      return { _state: 'SUCCESS', story: { uuid: uuid } }
    }
  }
  return { _state: 'FAIL' }
}

DAD.api.publish = async ({ _passtokenSource, story: { placeUuid, storyContent, uuid } = {} }) => {
  if (_passtokenSource && placeUuid) {
    let nowTimeUnix = Date.now()
    if (uuid) {
      let story = await DAD.createQueryBuilder('story')
        .leftJoinAndSelect(wo.User, 'author', 'author.uuid=story.author_uuid')
        .select(['story.*', 'author.portrait', 'author.nickname'])
        .where('story.uuid= :storyUuid', { storyUuid: uuid })
        .getRawOne()
      story.storyContent = JSON.parse(story.storyContent)
      if (story && story.author_uuid && story.author_uuid === _passtokenSource.uuid && story.placeUuid === placeUuid) {
        await DAD.update({ uuid: uuid }, { storyContent, editTimeUnix: nowTimeUnix })
        story.storyContent = storyContent
        story.editTimeUnix = nowTimeUnix
        return { _state: 'SUCCESS', story }
      } else {
        return { _state: 'UNMATCHED_STORY' }
      }
    } else {
      let story = await DAD.save({ placeUuid, author_uuid: _passtokenSource.uuid, storyContent, createTimeUnix: nowTimeUnix, editTimeUnix: nowTimeUnix })
      story = await DAD.createQueryBuilder('story')
        .leftJoinAndSelect(wo.User, 'author', 'author.uuid=story.author_uuid')
        .select(['story.*', 'author.portrait', 'author.nickname'])
        .where('story.uuid= :storyUuid', { storyUuid: story.uuid })
        .getRawOne()
      story.storyContent = JSON.parse(story.storyContent)
      return { _state: 'SUCCESS', story }
    }
  }
  return { _state: 'UNAUTHORIZED_AUTHOR' }
}

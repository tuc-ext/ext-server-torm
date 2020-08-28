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
      authorUuid: { type: String, nullable: true },
      placeUuid: { type: String, nullable: true },
      editTimeUnix: { type: 'int', default: 0 },
      createTimeUnix: { type: 'int', default: 0 },
      storyContent: { type: 'simple-json', default: '[]', nullable: true },
    },
  }
})

DAD.api = {}
DAD.api.getStoryList = async ({ _passtokenSource, placeUuid, skip = 0, take = 10, order = { aiid: 'DESC' } } = {}) => {
  // let [storyList, count] = await DAD.findAndCount({ where: { placeUuid }, skip, take, order })
  let storyList = await DAD.createQueryBuilder('story')
    .leftJoinAndSelect(wo.User, 'author', 'author.uuid=story.authorUuid')
    .select(['story.*', 'author.portrait', 'author.nickname'])
    .where('story.placeUuid=:placeUuid', { placeUuid })
    .offset(skip)
    .limit(take)
    .orderBy(order)
    .getRawMany()
  storyList.forEach((story, index) => {
    story.storyContent = JSON.parse(story.storyContent)
  })
  let storyCount = await DAD.count({ placeUuid })
  let likeCount = await wo.Like.count({ placeUuid, status: 'LIKE' })
  return { _state: 'SUCCESS', storyList, storyCount, likeCount }
}

DAD.api.deleteStory = async ({ _passtokenSource, story: { uuid } = {} }) => {
  if (uuid) {
    await DAD.delete({ uuid: uuid, authorUuid: _passtokenSource.uuid })
    return { _state: 'SUCCESS', story: { uuid: uuid } }
  }
  return { _state: 'FAIL' }
}

DAD.api.publish = async ({ _passtokenSource, story: { placeUuid, storyContent, uuid } = {} }) => {
  if (_passtokenSource && placeUuid) {
    let nowTimeUnix = Date.now()
    if (uuid) {
      // 已经存在
      let story = await DAD.findOne({ uuid })
      if (story && story.authorUuid && story.authorUuid === _passtokenSource.uuid && story.placeUuid === placeUuid) {
        await DAD.update({ uuid: uuid }, { storyContent, editTimeUnix: nowTimeUnix })
        story.storyContent = storyContent
        story.editTimeUnix = nowTimeUnix
        return { _state: 'SUCCESS', story }
      } else {
        return { _state: 'UNMATCHED_STORY' }
      }
    } else {
      // 尚不存在
      let story = await DAD.save({ placeUuid, authorUuid: _passtokenSource.uuid, storyContent, createTimeUnix: nowTimeUnix, editTimeUnix: nowTimeUnix })
      story.storyContent = storyContent
      return { _state: 'SUCCESS', story }
    }
  }
  return { _state: 'UNAUTHORIZED_AUTHOR' }
}

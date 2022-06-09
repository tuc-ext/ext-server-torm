module.exports = {
  name: 'Comment',
  columns: {
    commentHash: { type: String, primary: true },
    commentStory: { type: 'simple-json', default: '[]', nullable: false },
    commentTarget: { type: String, nullable: false },
    commentTimeUnix: { type: 'int', default: 0, nullable: true },
    authorUuid: { type: String, nullable: false },
  },
}

module.exports = {
  name: 'Creation',
  columns: {
    storyCcidHash: { type: String, primary: true, comment: '一份故事，只能对应一个作品。crid' },
    cStoryRaw: { type: 'simple-json', default: '[]', nullable: true, comment: '链接到 centralized storage。严格去中心则不该存放于数据库。' },
    cTitle: { type: String, default: '', nullable: true },
    cCover: { type: String, default: '', nullable: true },
    sealType: { type: String, default: 'AGENT', nullable: false },
    creatorUuid: { type: String, default: null, nullable: true },
    ownerUuid: { type: String, default: null, nullable: true },
    trokenCcid: { type: String, default: null, nullable: true, comment: '用来直接访问IPFS中的 troken' },
    storyCcid: { type: String, default: null, nullable: true, comment: '用来直接访问IPFS中的 content。严格去中心则不该存放于数据库。' },
    createTimeUnix: { type: 'int', default: 0, nullable: true, comment: '' },
    //      json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
  },
}

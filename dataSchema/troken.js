module.exports = {
  name: 'Troken',
  columns: {
    version: { type: String, default: '1', nullable: false },
    trokenCcid: { type: String, primary: true, comment: 'troken hash。为了主键存放在数据库中，但不在去中心的IPFS中。' },
    lastTokenCcid: { type: String, default: null, nullable: true, unique: true, comment: '用于串联起 IPFS 里，同一个 ccid 对应的多个 troken 的修改历史。' },
    storyCcidHash: { type: String, default: '', nullable: true, comment: '同一个值，可对应存在多个troken，因为主人修改title/price等。' },
    mintTimeUnix: { type: 'int', default: 0, nullable: true, comment: '铸造成troken的时刻' },
    changeTimeUnix: { type: 'int', default: 0, nullable: true, comment: '修改troken的时刻' },
    creatorAddress: { type: String, default: null, nullable: true, comment: '原始创作者，永远不变' },
    creatorCidSeal: { type: 'simple-json', default: null, nullable: true, comment: '创作者永远可以解密。' },
    ownerAddress: { type: String, default: null, nullable: true, comment: '当前拥有者，可以转移' },
    ownerCidSeal: { type: 'simple-json', default: null, nullable: true, comment: '当前拥有者可以解密' },
    agentAddress: { type: String, default: null, nullable: true, comment: '当前代理人。无代理时为空' },
    agentCidSeal: { type: 'simple-json', default: null, nullable: true, comment: '当前代理人可以解密' },
    howtoTakeover: { type: 'simple-json', default: null, nullable: true, comment: '' },
    howtoSubscribe: {
      type: 'simple-json',
      default: '[]',
      nullable: true,
      comment: '计划可容纳多种解锁/支付方案，例如 [{price,currency,channel,amount,targetAddress}, {puzzle/数学题/script}]',
    },
  },
}

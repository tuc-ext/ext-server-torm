module.exports = {
  name: 'tranx',
  columns: {
    txHash: { type: String, primary: true },
    txGroup: { type: String, nullable: true },
    txType: { type: String, nullable: true },
    txTimeUnix: { type: 'int', nullable: true },
    uuidUser: { type: String, nullable: true, comment: '本次交易记录的主人（即这笔交易记在谁的账户下。' },
    uuidOther: { type: String, nullable: true },
    txAmount: { type: 'real', default: 0, comment: '金额' },
    amountSystem: { type: 'real', default: 0 }, // 从这一笔交易里，系统收到的税费

    amountSource: { type: 'real', nullable: true },
    exchangeRate: { type: 'real', nullable: true },

    json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构

    trokenCcid: { type: String, default: null, nullable: true, comment: '用来直接访问IPFS中的 troken' },
  },
}

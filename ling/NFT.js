'use strict'

const ticCrypto = require('tic.crypto')
const torm = require('typeorm')
const IPFS = require('ipfs-core')

/****************** 类和原型 *****************/
const DAD = (module.exports = class NFT extends torm.BaseEntity {
  // 构建类
  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
    },
  }
})

DAD.init = async () => {
  DAD.ipfs = await IPFS.create() // 不能在每次使用 ipfs 时重复创建，那样会导致 “ipfs LockExistsError: Lock already being held for file ～/.ipfs/repo.lock”
  return DAD
}

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}

DAD.api.getCid = async ({ _passtokenSource, contentData } = {}) => {
  console.info('data=', contentData)
  const { path, cid, size } = await DAD.ipfs.add(contentData)
  console.info('cid=', cid)

  return { _state: 'SUCCESS', cid: cid.toString() }
}

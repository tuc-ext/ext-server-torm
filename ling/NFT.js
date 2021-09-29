'use strict'

const ticCrypto = require('tic.crypto')
const torm = require('typeorm')
const IPFS = require('ipfs-core')

// 叫做 ASSET?

/****************** 类和原型 *****************/
const DAD = (module.exports = class NFT extends torm.BaseEntity {
  // 构建类
  static schema = {
    name: this.name,
    target: this,
    columns: {
      // aiid: { type: 'int', generated: true, primary: true },
      // uuid: { type: String, generated: 'uuid', unique: true },
      hash: { type: String, nullable: false, generated: 'uuid', primary: true},
      creator_address: { type: String, default: null, nullable: true, comment: '原始创作者' },
      creator_cipher: { type: 'simple-json', default: null, nullable: true },
      // owner_address: { type: String, default: null, nullable: true, comment: '当前拥有者' },
      // owner_cipher: { type: 'simple-json', default: null, nullable: true },
      // owner_list: { type: 'simple-json', default: null, nullable: true },
      proxy_address: { type: String, default: null, nullable: true, comment: '当前代理者' },
      proxy_cipher: { type: 'simple-json', default: null, nullable: true },
      proxy_list: { type: 'simple-json', default: null, nullable: true },
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

DAD.api.sealCid_old = async ({ creator_cipher, cid } = {}) => {
  let proxy_cipher = await ticCrypto.encrypt({ data: { type: 'ipfs', cid }, key: ticCrypto.secword2keypair(wo.envi.secwordSys).seckey, keytype: 'pwd' })
  console.log('proxy_cipher===', proxy_cipher)
  // to check cid 是否已存在
  await DAD.insert({ creator_cipher, proxy_cipher })
  return { _state: 'SUCCESS', proxy_cipher }
}

DAD.api.sealCid = async ({ _passtokenSource, cid, type, creator_address, creator_cipher }) => {
  let result
  if (type==='ALL_BY_PROXY') {
    const userNow = await wo.User.findOne({uuid: _passtokenSource.uuid})
    result = await DAD.insert({
      creator_address: ticCrypto.secword2address(wo.envi.secwordUser, { coin: 'EXT', path: userNow.coinAddress.EXT.path }),
      creator_cipher:  await ticCrypto.encrypt({data:{type:'ipfs', cid}, key: ticCrypto.secword2keypair(wo.envi.secwordSys).seckey}),
      proxy_address: ticCrypto.secword2address(wo.envi.secwordSys),
      proxy_cipher: await ticCrypto.encrypt({ data: { type: 'ipfs', cid }, key: ticCrypto.secword2keypair(wo.envi.secwordSys).seckey })
    })
  }else if (type==='HALF_BY_PROXY') {
    // todo 验证 creator_cipher 的正确性
    result = await DAD.insert({
      creator_address,
      creator_cipher,
      proxy_address: ticCrypto.secword2address(wo.envi.secwordSys),
      proxy_cipher: await ticCrypto.encrypt({ data: { type: 'ipfs', cid }, key: ticCrypto.secword2keypair(wo.envi.secwordSys).seckey })
    })
  }else if (type==='ALL_BY_USER') {
    // todo 验证 creator_cipher 的正确性
    result = await DAD.insert({ creator_address, creator_cipher, })
  }
  return {_state:'SUCCESS', result }
}

DAD.api.getNftList = async () => {
  let nftList = await DAD.find()
  return { _state: 'SUCCESS', nftList }
}

DAD.api.unsealNft = async ({ nft }) => {
  let plaindata = await ticCrypto.decrypt({ data: nft.proxy_cipher, key: ticCrypto.secword2keypair(wo.envi.secwordSys).seckey, keytype: 'pwd' })
  return { _state: 'SUCCESS', plaindata }
}

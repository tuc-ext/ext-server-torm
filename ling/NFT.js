'use strict'

const ticCrypto = require('tic.crypto')
const torm = require('typeorm')

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
      creationTitle: { type: String, default: '', nullable: true },
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

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}

DAD.api.content2nft = async ({ _passtokenSource, contentData, creationTitle } = {}) => {
  if (!_passtokenSource?.uuid){
    return {_state: 'ERROR_USER_OFFLINE' }
  }

  const { path, cid, size } = await wo.IPFS.add({path: 'uu.txt', content: contentData}) // await wo.IPFS.add(IPFS.urlSource('https://vkceyugu.cdn.bspapp.com/VKCEYUGU-eac905a3-f5f5-498c-847b-882770fa36ee/1d759fa3-1635-4c87-b016-f32bd65928d7.jpg'))
  const userNow = await wo.User.findOne({uuid: _passtokenSource.uuid})

  const nft = await DAD.save({
    creator_address: ticCrypto.secword2address(wo.envi.secwordUser, { coin: 'EXT', path: userNow.coinAddress.EXT.path }),
    creator_cipher: await ticCrypto.encrypt({data:{type:'ipfs', cid}, key: ticCrypto.secword2keypair(wo.envi.secwordSys).seckey}),
    proxy_address: ticCrypto.secword2address(wo.envi.secwordSys),
    proxy_cipher: await ticCrypto.encrypt({ data: { type: 'ipfs', cid }, key: ticCrypto.secword2keypair(wo.envi.secwordSys).seckey }),
    creationTitle
  })

  return {_state: 'SUCCESS', nft, cid: cid.toString()}
}

DAD.api.getCid = async ({ _passtokenSource, contentData } = {}) => {
  console.info('data=', contentData)
  const { path, cid, size } = await wo.IPFS.add({path: 'uu.txt', content: contentData}) // await wo.IPFS.add(IPFS.urlSource('https://vkceyugu.cdn.bspapp.com/VKCEYUGU-eac905a3-f5f5-498c-847b-882770fa36ee/1d759fa3-1635-4c87-b016-f32bd65928d7.jpg'))
  console.info('cid=', cid)
  if (cid) return { _state: 'SUCCESS', cid: cid.toString() }
  else return { _state: 'ERROR' }
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

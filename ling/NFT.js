'use strict'

const ticCrypto = require('tic.crypto')
const torm = require('typeorm')
const ipfs = require('ipfs-core')

// 叫做 ASSET?

/****************** 类和原型 *****************/
const DAD = (module.exports = class NFT extends torm.BaseEntity {
  // 构建类
  static schema = {
    name: this.name,
    target: this,
    columns: {
      uuid: { type: String, generated: 'uuid', primary: true},
      extokenHash: { type: String, default: '', nullable: false },
      creationTitle: { type: String, default: '', nullable: true },
      sealType: { type: String, default: 'AGENT', nullable: false },
      creatorAddress: { type: String, default: null, nullable: true, comment: '原始创作者' },
      creatorCidSeal: { type: 'simple-json', default: null, nullable: true, comment: '创作者永远可以解封' },
      ownerAddress: { type: String, default: null, nullable: true, comment: '当前拥有者' },
      ownerCidSeal: { type: 'simple-json', default: null, nullable: true },
//      // ownerList: { type: 'simple-json', default: null, nullable: true },
      agentAddress: { type: String, default: null, nullable: true, comment: '当前代理人。无代理时为空' },
      agentCidSeal: { type: 'simple-json', default: null, nullable: true },
//      proxyList: { type: 'simple-json', default: null, nullable: true },
      creationTimeUnix: { type: 'int', default: 0, nullable: true },
      price: { type: 'int', default: null, nullable: true, comment:'转让所有权的价格。null 代表不转让' },
//      json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
    },
  }
})

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}

DAD.api.story2nft_agent = async ({ _passtokenSource, creationStory, creationTitle } = {}) => {
  if (!_passtokenSource?.uuid){
    return {_state: 'ERROR_USER_OFFLINE' }
  }

  let ipfsResult
  if (creationStory[0].text) {
    ipfsResult = await wo.IPFS.add(creationStory[0].text)
  }else if (creationStory[0].image){
    ipfsResult = await wo.IPFS.add(ipfs.urlSource(creationStory[0].image))
  }else if (creationStory[0].video){
    ipfsResult = await wo.IPFS.add(ipfs.urlSource(creationStory[0].video))
  }
  const { path, cid, size, mode, mtime } = ipfsResult // mode==0644 for files, 0755 for directories; mtime?: { secs, nsecs }
  const cidHex = cid.toString()

  const userNow = await wo.User.findOne({uuid: _passtokenSource.uuid})

  const nft = await DAD.save({
    sealType: 'AGENT',
    creatorAddress: ticCrypto.secword2address(wo.envi.secwordUser, { coin: 'EXT', path: userNow.coinAddress.EXT.path }),
    creatorCidSeal: await ticCrypto.encrypt({data: {storeType: 'ipfs', cidHex}, key: ticCrypto.secword2keypair(wo.envi.secwordAgent).seckey}),
    agentAddress: ticCrypto.secword2address(wo.envi.secwordAgent, { coin: 'EXT'}),
    agentCidSeal: await ticCrypto.encrypt({ data: { storeType: 'ipfs', cidHex }, key: ticCrypto.secword2keypair(wo.envi.secwordAgent).seckey }),
    creationTitle,
    creationTimeUnix: Date.now(),
  })
  nft.ownerAddress = nft.creatorAddress
  nft.ownerCidSeal = nft.creatorCidSeal

  return {_state: 'SUCCESS', nft, cidHex}
}

DAD.api.story2cidHex = async ({_passtokenSource, creationStory } = {}) =>{
  let ipfsResult
  if (creationStory[0].text) {
    ipfsResult = await wo.IPFS.add(creationStory[0].text)
  }else if (creationStory[0].image){
    ipfsResult = await wo.IPFS.add(ipfs.urlSource(creationStory[0].image)) // await wo.IPFS.add(IPFS.urlSource('https://vkceyugu.cdn.bspapp.com/VKCEYUGU-eac905a3-f5f5-498c-847b-882770fa36ee/1d759fa3-1635-4c87-b016-f32bd65928d7.jpg'))
  }else if (creationStory[0].video){
    ipfsResult = await wo.IPFS.add(ipfs.urlSource(creationStory[0].video))
  }
  const { path, cid, size, mode, mtime } = ipfsResult // mode==0644 for files, 0755 for directories; mtime?: { secs, nsecs }

  if (cid) return { _state: 'SUCCESS', cidHex: cid.toString() }
  else return { _state: 'ERROR' }
}

DAD.api.selfCidSeal2nft = async ({_passtokenSource, creatorAddress, creatorCidSeal, creatorSig, creatorPubkey, creationTitle }) => {
  // todo: verify(creatorCidSeal, creatorSig, creatorPubkey) && pubkey2address(creatorPubkey)===creatorAddress
  const nft = await DAD.save({
    sealType: 'SELF',
    creatorAddress,
    creatorCidSeal,
    ownerAddress: creatorAddress,
    ownerCidSeal: creatorCidSeal,
    agentAddress: creatorAddress,
    agentCidSeal: creatorCidSeal,
    creationTitle,
    creationTimeUnix: Date.now(),
  })

  return {_state: 'SUCCESS', nft}
}

DAD.api.jointCidSeal2nft = async ({_passtokenSource, creatorAddress, creatorCidSeal, creatorSig, creatorPubkey, creationTitle, cidHex }) => {
  // todo: verify(creatorCidSeal, creatorSig, creatorPubkey) && pubkey2address(creatorPubkey)===creatorAddress
  const nft = await DAD.save({
    sealType: 'JOINT',
    creatorAddress,
    creatorCidSeal,
    ownerAddress: creatorAddress,
    ownerCidSeal: creatorCidSeal,
    agentAddress: ticCrypto.secword2address(wo.envi.secwordAgent, { coin: 'EXT'}),
    agentCidSeal: await ticCrypto.encrypt({ data: { storeType: 'ipfs', cidHex }, key: ticCrypto.secword2keypair(wo.envi.secwordAgent).seckey }),
    creationTitle,
    creationTimeUnix: Date.now(),
  })

  return {_state: 'SUCCESS', nft}
}

DAD.api.getNftList = async () => {
  const nftList = await DAD.find({order:{creationTimeUnix: 'DESC'}, take:5})
  return { _state: 'SUCCESS', nftList }
}

DAD.api.unsealNft = async ({ nft }) => {
  if ( ticCrypto.secword2address(wo.envi.secwordAgent, { coin: 'EXT'}) !== nft.agentAddress ) {
    return { _state: 'FAIL_NOT_AGENT' }
  }
  const agentCidString = await ticCrypto.decrypt({ data: nft.agentCidSeal, key: ticCrypto.secword2keypair(wo.envi.secwordAgent).seckey, keytype: 'pwd' })
  const agentCid = JSON.parse(agentCidString)
  let creationContent = ''
  for await (const chunk of wo.IPFS.cat(agentCid.cidHex)) {
    creationContent = creationContent + chunk.toString()
  }
  return { _state: 'SUCCESS', creation: { creationContent, cidHex: agentCid.cidHex }}
}

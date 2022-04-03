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
      // todo:  cidSeal改名为uri-seal。uri 可以是数字的例如ipfs，也可以是物理的例如国家公证系统。
//      uuid: { type: String, generated: 'uuid', primary: true},
      hash: { type: String, primary: true },
      creationTitle: { type: String, default: '', nullable: true },
      sealType: { type: String, default: 'AGENT', nullable: false },
      creatorAddress: { type: String, default: null, nullable: true, comment: '原始创作者，永远不变' },
      creatorCidSeal: { type: 'simple-json', default: null, nullable: true, comment: '创作者永远可以解封' },
      ownerAddress: { type: String, default: null, nullable: true, comment: '当前拥有者，可以转移' },
      ownerCidSeal: { type: 'simple-json', default: null, nullable: true, comment: '当前拥有者可以解封' },
      agentAddress: { type: String, default: null, nullable: true, comment: '当前代理人。无代理时为空' },
      agentCidSeal: { type: 'simple-json', default: null, nullable: true, comment: '当前代理人可以解封' },
      openCid: { type: 'simple-json', default: null, nullable: true, comment: '不加密，任何人可以直接访问的CID' },
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

  const nft = {
    sealType: 'AGENT',
    creatorAddress: ticCrypto.secword2address(wo.envar.secwordUser, { coin: 'EXT', path: userNow.coinAddress.EXT.path }),
    creatorCidSeal: await ticCrypto.encrypt({data: {uriType: 'ipfs', cidHex}, key: ticCrypto.secword2keypair(wo.envar.secwordAgent).seckey}),
    agentAddress: ticCrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT'}),
    agentCidSeal: await ticCrypto.encrypt({ data: { uriType: 'ipfs', cidHex }, key: ticCrypto.secword2keypair(wo.envar.secwordAgent).seckey }),
    creationTitle,
    creationTimeUnix: Date.now(),
  }
  nft.ownerAddress = nft.creatorAddress
  nft.ownerCidSeal = nft.creatorCidSeal
  nft.hash = ticCrypto.hash(wo.tool.stringifyOrdered(nft, { schemaColumns: DAD.schema.columns, excludeKeys:['hash'] }))
  await DAD.save(nft)

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
  const nft = {
    sealType: 'SELF',
    creatorAddress,
    creatorCidSeal,
    ownerAddress: creatorAddress,
    ownerCidSeal: creatorCidSeal,
    agentAddress: creatorAddress,
    agentCidSeal: creatorCidSeal,
    creationTitle,
    creationTimeUnix: Date.now(),
  }
  nft.hash = ticCrypto.hash(wo.tool.stringifyOrdered(nft, { schemaColumns: DAD.schema.columns, excludeKeys:['hash'] }))
  await DAD.save(nft)

  return {_state: 'SUCCESS', nft}
}

DAD.api.jointCidSeal2nft = async ({_passtokenSource, creatorAddress, creatorCidSeal, creatorSig, creatorPubkey, creationTitle, cidHex }) => {
  // todo: verify(creatorCidSeal, creatorSig, creatorPubkey) && pubkey2address(creatorPubkey)===creatorAddress
  const nft = {
    sealType: 'JOINT',
    creatorAddress,
    creatorCidSeal,
    ownerAddress: creatorAddress,
    ownerCidSeal: creatorCidSeal,
    agentAddress: ticCrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT'}),
    agentCidSeal: await ticCrypto.encrypt({ data: { uriType: 'ipfs', cidHex }, key: ticCrypto.secword2keypair(wo.envar.secwordAgent).seckey }),
    creationTitle,
    creationTimeUnix: Date.now(),
  }
  nft.hash = ticCrypto.hash(wo.tool.stringifyOrdered(nft, { schemaColumns: DAD.schema.columns, excludeKeys:['hash'] }))
  await DAD.save(nft)

  return {_state: 'SUCCESS', nft}
}

DAD.api.getNftList = async () => {
  const nftList = await DAD.find({order:{creationTimeUnix: 'DESC'}, take:5})
  return { _state: 'SUCCESS', nftList }
}

DAD.api.unsealNft = async ({ nft }) => {
  if ( ticCrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT'}) !== nft.agentAddress ) {
    return { _state: 'FAIL_NOT_AGENT' }
  }
  const agentCidString = await ticCrypto.decrypt({ data: nft.agentCidSeal, key: ticCrypto.secword2keypair(wo.envar.secwordAgent).seckey, keytype: 'pwd' })
  const agentCid = JSON.parse(agentCidString)
  let creationContent = ''
  for await (const chunk of wo.IPFS.cat(agentCid.cidHex)) {
    creationContent = creationContent + chunk.toString()
  }
  return { _state: 'SUCCESS', creation: { creationContent, cidHex: agentCid.cidHex }}
}

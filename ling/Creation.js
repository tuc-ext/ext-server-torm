'use strict'

const ticCrypto = require('tic.crypto')
const torm = require('typeorm')
const ipfs = require('ipfs-core')

// 叫做 ASSET?

/****************** 类和原型 *****************/
const DAD = (module.exports = class Creation {
  // 构建类
  static TrokenSchema = {
    name: 'Troken',
    columns: {
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
      howToOwn: { type: 'simple-json', default: null, nullable: true, comment: '' },
      howToUnseal: {
        type: 'simple-json',
        default: null,
        nullable: true,
        comment: '计划可容纳多种解锁/支付方案，例如 [{price,currency,channel,amount,targetAddress}, {puzzle/数学题/script}]',
      },
    },
  }

  static CreationSchema = {
    name: 'Creation',
    columns: {
      storyCcidHash: { type: String, primary: true, comment: '一份故事，只能对应一个作品。crid' },
      cStoryRaw: { type: 'simple-json', default: '[]', nullable: true, comment: '链接到 centralized storage' },
      cTitle: { type: String, default: '', nullable: true },
      cCover: { type: String, default: '', nullable: true },
      sealType: { type: String, default: 'AGENT', nullable: false },
      creatorUuid: { type: String, default: null, nullable: true },
      ownerUuid: { type: String, default: null, nullable: true },
      trokenCcid: { type: String, default: null, nullable: true, comment: '用来直接访问IPFS中的 troken' },
      storyCcid: { type: String, default: null, nullable: true, comment: '用来直接访问IPFS中的 content' },
      createTimeUnix: { type: 'int', default: 0, nullable: true, comment: '' },
      //      json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
    },
  }
})

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}

DAD.api.creation_to_ccid = async ({ cStoryRaw } = {}) => {
  let ipfsResult = []
  let ipfsFiles = []
  for (let i in cStoryRaw) {
    if (cStoryRaw[i].text) {
      ipfsFiles.push({ path: `/ipfsStory/${i}.txt`, content: cStoryRaw[i].text })
    } else if (cStoryRaw[i].image) {
      let fileObject = ipfs.urlSource(cStoryRaw[i].image)
      fileObject.path = `/ipfsStory/${i}.${fileObject.path.split('.').pop()}`
      ipfsFiles.push(fileObject)
    } else if (cStoryRaw[i].video) {
      let fileObject = ipfs.urlSource(cStoryRaw[i].video)
      fileObject.path = `/ipfsStory/${i}.${fileObject.path.split('.').pop()}`
      ipfsFiles.push(fileObject)
    }
  }
  for await (const result of wo.IPFS.addAll(ipfsFiles, { cidVersion: 0, hashAlg: 'sha2-256', onlyHash: false, pin: true })) {
    ipfsResult.push(result)
  }

  const { path, cid, size, mode, mtime } = ipfsResult[cStoryRaw.length] || {} // mode==0o644=420 for files, 0o755=493 for directories; mtime?: { secs, nsecs }. 如果 add 时没有提供path，则返回path=cid.toString()

  if (cid) return { _state: 'SUCCESS', storyCcid: cid.toString() }
  else return { _state: 'ERROR' }
}

DAD.api.mint_creation_by_agent = async ({ _passtokenSource, cStoryRaw, cTitle, cCover } = {}) => {
  if (!_passtokenSource?.uuid) {
    return { _state: 'ERROR_USER_OFFLINE' }
  }

  const userNow = await wo.User.findOne({ uuid: _passtokenSource.uuid })
  if (!userNow) {
    return { _state: 'ERROR_USER_NOTEXIST' }
  }

  const { _state, storyCcid } = await DAD.api.creation_to_ccid({ cStoryRaw })
  const storyCcidHash = ticCrypto.cosh_to_cid({ cosh: ticCrypto.hash(storyCcid), cidBase: 'b32', cidVersion:1, cidCodec:'raw' })

  let creationNow = await torm.getRepository('Creation').findOne({ storyCcidHash })
  if (creationNow) {
    return { _state: 'ERROR_DUPLICATE_CREATION' }
  }

  const cidToSeal = { addressType: 'IPFS', ccid: storyCcid }
  const troken = {
    storyCcidHash,
    creatorAddress: ticCrypto.secword2address(wo.envar.secwordUser, { coin: 'EXT', path: userNow.coinAddress.EXT.path }),
    creatorCidSeal: await ticCrypto.encrypt({ data: cidToSeal, key: ticCrypto.secword2keypair(wo.envar.secwordAgent).seckey }),
    agentAddress: ticCrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT' }),
    agentCidSeal: await ticCrypto.encrypt({ data: cidToSeal, key: ticCrypto.secword2keypair(wo.envar.secwordAgent).seckey }),
    mintTimeUnix: Date.now(),
  }
  troken.ownerAddress = troken.creatorAddress
  troken.ownerCidSeal = troken.creatorCidSeal
  const { path, cid: trokenCid, mode } = await wo.IPFS.add(
    wo.tool.stringifyOrdered(troken, { schemaColumns: DAD.TrokenSchema.columns, excludeKeys: ['trokenCcid'] }),
    {
      cidVersion: 1,
      hashAlg: 'sha2-256',
      onlyHash: false,
      pin: true,
    }
  )
  troken.trokenCcid = trokenCid.toString()
  await torm.getRepository('Troken').save(troken)

  creationNow = {
    storyCcidHash: troken.storyCcidHash,
    cStoryRaw,
    cTitle,
    cCover,
    creatorUuid: _passtokenSource.uuid,
    ownerUuid: _passtokenSource.uuid,
    sealType: 'AGENT',
    trokenCcid: troken.trokenCcid,
    storyCcid,
    createTimeUnix: troken.mintTimeUnix,
  }
  await torm.getRepository('Creation').save(creationNow)

  // creationNow.cStoryRaw = null // 自己铸造的作品，不需要删掉 cStoryRaw
  creationNow.troken = troken

  return { _state: 'SUCCESS', creation: creationNow }
}

DAD.api.mint_creation_by_creator = async ({ _passtokenSource, creatorAddress, creatorCidSeal, creatorSig, creatorPubkey, cTitle }) => {
  // todo: verify(creatorCidSeal, creatorSig, creatorPubkey) && pubkey2address(creatorPubkey)===creatorAddress
  const troken = {
    creatorAddress,
    creatorCidSeal,
    ownerAddress: creatorAddress,
    ownerCidSeal: creatorCidSeal,
    agentAddress: creatorAddress,
    agentCidSeal: creatorCidSeal,
    cTitle,
    mintTimeUnix: Date.now(),
  }
  const { path, cid: trokenCid, mode } = await wo.IPFS.add(
    wo.tool.stringifyOrdered(troken, { schemaColumns: DAD.TrokenSchema.columns, excludeKeys: ['trokenCcid'] }),
    {
      cidVersion: 1,
      hashAlg: 'sha2-256',
      onlyHash: false,
      pin: true,
    }
  )
  troken.trokenCcid = trokenCid.toString()
  await torm.getRepository('Troken').save(troken)

  return { _state: 'SUCCESS', troken }
}

DAD.api.mint_creation_by_joint = async ({ _passtokenSource, creatorAddress, creatorCidSeal, creatorSig, creatorPubkey, cTitle, storyCcid }) => {
  // todo: verify(creatorCidSeal, creatorSig, creatorPubkey) && pubkey2address(creatorPubkey)===creatorAddress
  const troken = {
    creatorAddress,
    creatorCidSeal,
    ownerAddress: creatorAddress,
    ownerCidSeal: creatorCidSeal,
    agentAddress: ticCrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT' }),
    agentCidSeal: await ticCrypto.encrypt({ data: { addressType: 'IPFS', ccid: storyCcid }, key: ticCrypto.secword2keypair(wo.envar.secwordAgent).seckey }),
    cTitle,
    mintTimeUnix: Date.now(),
  }
  const { path, cid: trokenCid, mode } = await wo.IPFS.add(
    wo.tool.stringifyOrdered(troken, { schemaColumns: DAD.TrokenSchema.columns, excludeKeys: ['trokenCcid'] }),
    {
      cidVersion: 1,
      hashAlg: 'sha2-256',
      onlyHash: false,
      pin: true,
    }
  )
  troken.trokenCcid = trokenCid.toString()
  await torm.getRepository('Troken').save(troken)

  return { _state: 'SUCCESS', troken }
}

DAD.api.get_creation_list = async () => {
  const creationList = await torm.getRepository('Creation').find({ order: { createTimeUnix: 'DESC' }, take: 10 })
  for (let creation of creationList) {
    let troken = await torm.getRepository('Troken').findOne({ storyCcidHash: creation.storyCcidHash })
    creation.troken = troken
    creation.cStoryRaw = null // 不能把 cStoryRaw 返回给没有订阅的用户
  }
  return { _state: 'SUCCESS', creationList }
}

DAD.api.is_subscriber = ({ _passtokenSource, troken } = {}) => {
  return true // todo 目前不做审核
}

DAD.api.troken_to_raw_creation = async ({ _passtokenSource, troken } = {}) => {
  // 从数据库中获取作品
  if (!DAD.api.is_subscriber({ _passtokenSource, troken })) {
    return { _state: 'FAIL_NOT_SUBSCRIBER' }
  }
  if (ticCrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT' }) !== troken.agentAddress) {
    return { _state: 'FAIL_NOT_AGENT' }
  }
  const creation = await torm.getRepository('Creation').findOne({ storyCcidHash: troken.storyCcidHash })
  creation.troken = troken
  return { _state: 'SUCCESS', creation }
}

DAD.api.unseal_troken = async ({ _passtokenSource, troken }) => {
  // 通过解密，从 IPFS 中获取作品
  if (!DAD.api.is_subscriber({ _passtokenSource, troken })) {
    return { _state: 'FAIL_NOT_SUBSCRIBER' }
  }
  if (ticCrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT' }) !== troken.agentAddress) {
    return { _state: 'FAIL_NOT_AGENT' }
  }
  const agentCidString = await ticCrypto.decrypt({ data: troken.agentCidSeal, key: ticCrypto.secword2keypair(wo.envar.secwordAgent).seckey, keytype: 'pwd' })
  const agentCid = JSON.parse(agentCidString)
  let cStory = []
  for await (const sectionFile of wo.IPFS.ls(agentCid.ccid)) {
    const extension = sectionFile.name.split('.').pop()
    const url = 'https://ipfs.io/ipfs/' + sectionFile.path // todo 换用 IPFS URI? ipfs://...
    if (['txt'].includes(extension)) {
      let sectionText = ''
      for await (const chunk of wo.IPFS.cat(sectionFile.path)) {
        sectionText += chunk.toString()
      }
      cStory.push({ text: sectionText })
    } else if (['jpg', 'JPG', 'png', 'PNG', 'gif', 'GIF'].includes(extension)) {
      cStory.push({ image: url })
    } else if (['avi', 'AVI', 'mp4', 'MP4', 'mov', 'MOV', 'wmv', 'WMV'].includes(extension)) {
      cStory.push({ video: url })
    }
  }
  const { _state, creation } = await DAD.api.troken_to_raw_creation({ _passtokenSource, troken })
  creation.cStoryRaw = null
  creation.cStory = cStory
  return { _state: 'SUCCESS', creation }
}

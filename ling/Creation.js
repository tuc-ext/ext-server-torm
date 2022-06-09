'use strict'

const ticrypto = require('tic-crypto')
const torm = require('typeorm')
const ipfs = require('ipfs-core')

/**
 * 铸造：从内容到ccid
 * 加密：cidSeal
 * 封印：troken
 */

/****************** 类和原型 *****************/
const DAD = (module.exports = class Creation {})

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
  // 注意，经过筛选后 ipfsFiles.length 可能不等于 cStoryRaw.length
  for await (const result of wo.IPFS.addAll(ipfsFiles, { cidVersion: 1, hashAlg: 'sha2-256', onlyHash: false, pin: true })) {
    ipfsResult.push(result)
  }

  const { path, cid, size, mode, mtime } = ipfsResult[ipfsFiles.length] || {} // mode==0o644=420 for files, 0o755=493 for directories; mtime?: { secs, nsecs }. 如果 add 时没有提供path，则返回path=cid.toString()

  if (cid) return { _state: 'SUCCESS', storyCcid: cid.toString() }
  else return { _state: 'ERROR' }
}

DAD.api.mint_creation_by_agent = async ({ _passtokenSource, cStoryRaw, cTitle, cCover, priceAmountSubscriber, priceCurrencySubscriber } = {}) => {
  if (!_passtokenSource?.uuid) {
    return { _state: 'ERROR_USER_OFFLINE' }
  }

  const userNow = await wo.User.findOneBy({ uuid: _passtokenSource.uuid })
  if (!userNow) {
    return { _state: 'ERROR_USER_NOTEXIST' }
  }

  const { _state, storyCcid } = await DAD.api.creation_to_ccid({ cStoryRaw })
  const storyCcidHash = ticrypto.cosh_to_cid({ cosh: ticrypto.hash(storyCcid), cidBase: 'b32', cidVersion: 1, cidCodec: 'raw' })

  let creationNow = await torm.getRepository('Creation').findOneBy({ storyCcidHash })
  if (creationNow) {
    return { _state: 'ERROR_DUPLICATE_CREATION' }
  }

  const cidToSeal = { addressType: 'IPFS', ccid: storyCcid }
  const cidSealedCreator = await ticrypto.encrypt({
    data: cidToSeal,
    key: ticrypto.secword2keypair(wo.envar.secwordUser, { coin: 'EXT', path: userNow.coinAccount.EXT.path }).seckey,
  })
  const troken = {
    storyCcidHash,
    creatorAddress: userNow.coinAccount.EXT.address,
    creatorCidSeal: cidSealedCreator,
    ownerAddress: userNow.coinAccount.EXT.address,
    ownerCidSeal: cidSealedCreator,
    agentAddress: wo.envar.systemCoinAddressSet.EXT,
    agentCidSeal: await ticrypto.encrypt({ data: cidToSeal, key: ticrypto.secword2keypair(wo.envar.secwordAgent, { coin: 'EXT' }).seckey }),
    howtoSubscribe: [
      { type: 'PAY', amount: priceAmountSubscriber, currency: priceCurrencySubscriber, payToAddress: wo.envar.systemCoinAddressSet[priceCurrencySubscriber] },
    ],
    mintTimeUnix: Date.now(),
  }
  const { path, cid: trokenCid, mode } = await wo.IPFS.add(
    wo.tool.stringifyOrdered(troken, { schemaColumns: wo.dataSchema.troken.columns, excludeKeys: ['trokenCcid'] }),
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

  return { _state: 'SUCCESS', creation: Object.assign(creationNow, troken, { portrait: userNow.portrait, nickname: userNow.nickname }) }
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
    wo.tool.stringifyOrdered(troken, { schemaColumns: wo.dataSchema.troken.columns, excludeKeys: ['trokenCcid'] }),
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
    agentAddress: ticrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT' }),
    agentCidSeal: await ticrypto.encrypt({
      data: { addressType: 'IPFS', ccid: storyCcid },
      key: ticrypto.secword2keypair(wo.envar.secwordAgent, { coin: 'EXT' }).seckey,
    }),
    cTitle,
    mintTimeUnix: Date.now(),
  }
  const { path, cid: trokenCid, mode } = await wo.IPFS.add(
    wo.tool.stringifyOrdered(troken, { schemaColumns: wo.dataSchema.troken.columns, excludeKeys: ['trokenCcid'] }),
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

DAD.api.get_creation_list = async ({ limit = 10, skip = 0 }) => {
  const creationList = await torm
    .getRepository('Creation')
    .createQueryBuilder('creation')
    .leftJoinAndSelect('Troken', 'troken', 'troken.storyCcidHash=creation.storyCcidHash')
    .leftJoinAndSelect(wo.User, 'creator', 'creator.uuid=creation.creatorUuid')
    .select(['creation.*', 'troken.*', 'creator.portrait, creator.nickname'])
    //    .where('story.placeUuid=:placeUuid', { placeUuid })
    //    .offset(skip)
    .limit(limit)
    .orderBy('creation.createTimeUnix', 'DESC')
    //    .printSql()
    .getRawMany()
  if (Array.isArray(creationList)) {
    creationList.forEach((creation, index) => {
      creation.cStoryRaw = undefined // 不能把 cStoryRaw 返回给没有订阅的用户
      creation.storyCcid = undefined
      creation.howtoSubscribe = JSON.parse(creation.howtoSubscribe)
      creation.creatorCidSeal = JSON.parse(creation.creatorCidSeal)
      creation.ownerCidSeal = JSON.parse(creation.ownerCidSeal)
      creation.agentCidSeal = JSON.parse(creation.agentCidSeal)
    })
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
  if (ticrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT' }) !== troken.agentAddress) {
    return { _state: 'FAIL_NOT_AGENT' }
  }
  const creation = await torm.getRepository('Creation').findOneBy({ storyCcidHash: troken.storyCcidHash })
  creation.troken = troken
  return { _state: 'SUCCESS', creation }
}

DAD.api.unseal_troken = async ({ _passtokenSource, troken }) => {
  // 通过解密，从 IPFS 中获取作品
  if (!DAD.api.is_subscriber({ _passtokenSource, troken })) {
    return { _state: 'FAIL_NOT_SUBSCRIBER' }
  }
  if (ticrypto.secword2address(wo.envar.secwordAgent, { coin: 'EXT' }) !== troken.agentAddress) {
    return { _state: 'FAIL_NOT_AGENT' }
  }
  const agentCidString = await ticrypto.decrypt({
    data: troken.agentCidSeal,
    key: ticrypto.secword2keypair(wo.envar.secwordAgent, { coin: 'EXT' }).seckey,
    keytype: 'pwd',
  })
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

DAD.api.comment_creation = async ({ _passtokenSource, commentStory, commentTarget } = {}) => {
  const comment = {
    commentStory,
    commentTarget,
    authorUuid: _passtokenSource.uuid,
    commentTimeUnix: Date.now(),
  }
  comment.commentHash = wo.tool.stringifyOrdered(comment, { schemaColumns: wo.dataSchema.comment.columns })
  await torm.getRepository('Comment').save(comment)
  return { _state: 'SUCCESS', comment }
}

DAD.api.get_comment_list = async ({ _passtokenSource, commentTarget, skip = 0, limit = 10 }) => {
  const commentList = await torm
    .getRepository('Comment')
    .createQueryBuilder('comment')
    .leftJoinAndSelect(wo.User, 'author', 'author.uuid=comment.authorUuid')
    .select(['comment.*', 'author.portrait, author.nickname'])
    .where('comment.commentTarget=:commentTarget', { commentTarget })
    .offset(skip)
    .limit(limit)
    .orderBy('comment.commentTimeUnix', 'DESC')
    //    .printSql()
    .getRawMany()
  if (Array.isArray(commentList)) {
    commentList.forEach((comment, index) => {
      comment.commentStory = JSON.parse(comment.commentStory)
    })
  }
  return { _state: 'SUCCESS', commentList }
}

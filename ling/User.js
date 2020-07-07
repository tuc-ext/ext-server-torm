'use strict'
const Ling = require('so.ling/Ling.to.js')
const Uuid = require('uuid')
const ticCrypto = require('tic.crypto')
const Messenger = require('so.base/Messenger.js')
const Webtoken = require('so.base/Webtoken.js')
const Internation = require('so.base/Internation.js')
// const Trade = require('./Trade.js') // 因为 User也require了 Trade，这会造成循环require
const Place = require('./Place.js')
const to = require('typeorm')

const Config = require('so.base/Config.js')

/****************** 类和原型 *****************/
const DAD = module.exports = class User extends Ling { // 构建类
  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: Number, primary: true, generated: true },
      uuid: { type: String, unique: true, generated: 'uuid' },
      phone: { type: String, unique: true },
      passwordServer: { type: String, nullable: true },
      regcode: { type: String, nullable: true, comment:'我的邀请人的邀请码，不是我的邀请码' },
      portrait: { type: String, nullable: true },
      nickname: { type: String, nullable: true },
      realname: { type: String, nullable: true, default: '' },
      lang: { type: String, nullable: true },
      citizen: { type: String, nullable: true },
      idType: { type: String, nullable: true },
      idNumber: { type: String, nullable: true, default: '' },
      kycStateL1: { type: String, nullable: true },
      kycStateL2: { type: String, nullable: true },
      kycStateL3: { type: String, nullable: true },
      idCardCover: { type: String, nullable: true },
      idCardBack: { type: String, nullable: true },
      idCardSelfie: { type: String, nullable: true },
      whenRegister: { type: Date, default: null },
      coinAddress: { type: 'simple-json', default: '{}' },
      payChannel: { type: 'simple-json', default: '{}', nullable:true},
      balance: { type: 'real', default: 0 },
      frozenBalance: { type: 'real', default: 0},
      rewardSum: { type: 'real', default: 0 },
      estateProfitSum: { type: 'real', default: 0 },
      estateFeeSum: { type: 'real', default: 0 },
      estateTaxSum: { type: 'real', default: 0 },
      estateHoldingNumber: { type: 'int', default: 0 },
      estateHoldingCost: { type: 'real', default: 0 },
      estateHoldingValue: { type: 'real', default: 0 },
      estateHoldingProfit: { type: 'real', default: 0 },
      depositUsdtSum: { type: 'real', default: 0 },
      depositLogSum: { type: 'real', default: 0 },
      communityNumber: { type: 'int', default: 0 },
      communityNumberKyc: { type: 'int', default: 0 },
      communityRewardSum: { type: 'real', default: 0 },
      json: { type: 'simple-json', default:'{}', nullable: true } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
    }
  }

  static async normalize(user={}){
    user.inviterCode = ticCrypto.aiid2regcode(user.aiid) // 我的邀请码
//    user.communityNumberKyc = await DAD.count({regcode: user.inviterCode, kycStateL1: 'PASSED', kycStateL2: 'PASSED'}) || 0
    delete user.aiid
    delete user.passwordServer
    return user
  }
}

/****************** API方法 ******************/
DAD.api=DAD.api1={}
DAD.sysapi={}

DAD.api.changePortrait = async function ({_passtokenSource, _req}={}) {
  if (_passtokenSource && _passtokenSource.isOnline) {
    let file = _req.file
    if (file && /^image\//.test(file.mimetype)) {
      await DAD.update({uuid: _passtokenSource.uuid}, {portrait:file.filename})
      return Object.assign(file, { _state: 'SUCCESS'})
    }else{
      return { _state: 'FILE_NOT_IMAGE'}
    }
  }else{
    return { _state: 'USER_NOT_ONLINE' }
  }
}

DAD.api.uploadIdCard = async function(option){
  if (option._passtokenSource && option._passtokenSource.isOnline) {
    let file = option._req.file
    if (file && /^image\//.test(file.mimetype)) {
      let obj
      if (option.side==='Cover') {
        obj = {idCardCover: option._req.file.filename}
      }else if (option.side==='Back') {
        obj = {idCardBack: option._req.file.filename}
      }else if (option.side==='Selfie') {
        obj = {idCardSelfie: option._req.file.filename}
      }
      await DAD.update({uuid: option._passtokenSource.uuid}, obj)
      return Object.assign(file, { _state: 'SUCCESS'})
    }else{
      return { _state: 'FILE_NOT_IMAGE'}
    }
  }else{
    return { _state: 'USER_NOT_ONLINE' }
  }
}

DAD.api.updateKycL1 = async function(option) {
  if (option.User && option.User.realname && option.User.idNumber && option.User.idType && option.User.citizen){
    option.User.kycStateL1='SUBMITTED'
    await DAD.update({ uuid: option._passtokenSource.uuid }, option.User)
    return { _state: 'SUBMITTED' }
  }else {
    return { _state: 'INPUT_MALFORMED' }
  }
}
DAD.sysapi.passKycL1 = async function({User}){
  let result = { _state: 'ERROR' }
  await to.getManager().transaction(async txman=>{
    await txman.update(DAD, {uuid:User.uuid}, { kycStateL1: 'PASSED'})
    result._state = 'SUCCESS'
  })
  return result
}
DAD.sysapi.rejectKycL1 = async function({User}){
  let result = { _state: 'ERROR' }
  await to.getManager().transaction(async txman=>{
    await txman.update(DAD, {uuid:User.uuid}, { kycStateL1: 'REJECTED'})
    result._state = 'SUCCESS'
  })
  return result
}
DAD.api.updateKycL2 = async function(option) {
  let user = await DAD.findOne({uuid:option._passtokenSource.uuid})
  if (user && user.idCardCover && user.idCardBack){
    await DAD.update({uuid: option._passtokenSource.uuid }, {kycStateL2: 'SUBMITTED'})
    return { _state: 'SUBMITTED' }
  }else {
    return { _state: 'INPUT_MALFORMED' }
  }
}
DAD.sysapi.passKycL2 = async function({User}){
  let result = { _state: 'ERROR' }
  await to.getManager().transaction(async txman=>{
    let user = await DAD.findOne({uuid: User.uuid})
    let inviter = await DAD.findOne({aiid: ticCrypto.regcode2aiid(user.regcode)})
    let rate = wo.Trade.getExchangeRate()
    let reward = rate * 5
    let passTime = new Date()
    let txReward = wo.Trade.create({
      uuidUser: inviter.uuid,
      uuidOther: 'SYSTEM',
      txGroup: 'REWARD_TX',
      txType: 'REWARD_INVITE',
      amount: reward,
      amountMining: reward,  // 奖金是通过注册行为凭空挖出的
      exchangeRate: rate,
      txTime: passTime,
      txTimeUnix: passTime.valueOf(),
    })
    txReward.txHash = ticCrypto.hash(txReward.getJson({exclude:['aiid','uuid']}))
  
    await txman.update(DAD, {uuid:User.uuid}, { kycStateL2:'PASSED' })
    await txman.update(DAD, {uuid: inviter.uuid}, {
      balance: inviter.balance + reward, 
      communityNumberKyc: inviter.communityNumberKyc + 1, 
      communityRewardSum: inviter.communityRewardSum + reward,
      rewardSum: inviter.rewardSum + reward
    })
    await txman.save(txReward)
    result._state = 'SUCCESS'
  })
  return result
}
DAD.sysapi.rejectKycL2 = async function({User}){
  let result = { _state: 'ERROR' }
  await to.getManager().transaction(async txman=>{
    await txman.update(DAD, {uuid:User.uuid}, { kycStateL2: 'REJECTED'})
    result._state = 'SUCCESS'
  })
  return result
}

DAD.api.updateKycL3 = async function(option) {
  let user = await DAD.findOne({uuid:option._passtokenSource.uuid})
  if (user && user.idCardSelfie){
    await DAD.update({uuid: option._passtokenSource.uuid }, {kycStateL3: 'SUBMITTED'})
    return { _state: 'SUBMITTED' }
  }else {
    return { _state: 'INPUT_MALFORMED' }
  }
}
DAD.sysapi.passKycL3 = async function({User}){
  let result = { _state: 'ERROR' }
  await to.getManager().transaction(async txman=>{
    await txman.update(DAD, {uuid:User.uuid}, { kycStateL3: 'PASSED'})
    result._state = 'SUCCESS'
  })
  return result
}
DAD.sysapi.rejectKycL3 = async function({User}){
  let result = { _state: 'ERROR' }
  await to.getManager().transaction(async txman=>{
    await txman.update(DAD, {uuid:User.uuid}, { kycStateL3: 'REJECTED'})
    result._state = 'SUCCESS'
  })
  return result
}

DAD.api.identify = DAD.api1.identify = async function({phone}={}){
  if (phone && Internation.validatePhone({phone})) {
    let user = await DAD.findOne({phone})
    let _state, uuid
    if (user) {
      uuid = user.uuid
      _state = 'OLD_USER'
    } else {
      uuid = `${Uuid.v4()}`,
      _state = 'NEW_USER'
    }
    mylog.info(`identify::::::: uuid = ${uuid}`)
    return {
      _state,
      uuid,
      _passtoken: Webtoken.createToken({
        phone,
        uuid,
        identifyState: _state
      })
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.sendPasscode = async function(option){
  let _state
  let passcode = ticCrypto.randomNumber({length:6})
  mylog.info('passcode = '+passcode)
  let passcodeHash = ticCrypto.hash(passcode+option._passtokenSource.uuid)
  mylog.info('uuid = '+option._passtokenSource.uuid)
  mylog.info('passcodeHash = '+passcodeHash)
  mylog.info('phone = '+option._passtokenSource.phone)
  let passcodeSentAt = undefined
  let passcodeExpireAt = undefined
  // send SMS
  let sendResult
  if (process.env.NODE_ENV==='production') {
    sendResult = await Messenger.sendSms(
      option._passtokenSource.phone, 
      { vendor: 'aliyun',
        msgParam: {code: passcode},
        templateCode: 'SMS_142465215',
        signName: 'LOG'
      }
    )
  }else {
    sendResult = {state:'DONE'}
  }

  if (sendResult.state==='DONE') {
    _state = 'PASSCODE_SENT'
    passcodeSentAt = new Date()
    passcodeExpireAt = new Date(Date.now()+5*60*1000)
    return {
      _state,
      passcodeHash,
      passcodeSentAt,
      passcodeExpireAt,
      _passtoken: Webtoken.createToken(Object.assign(
        option._passtokenSource, {
          passcodeHash,
          passcodeState: _state,
          passcodeSentAt,
          passcodeExpireAt,
        }
      ))
    }
  }else{
    return {
      _state: 'PASSCODE_UNSENT'
    }
  }
}

DAD.api.verifyPasscode = async function(option){
  if (option._passtokenSource && Date.now() > new Date(option._passtokenSource.passcodeExpireAt)){
    return { _state: 'PASSCODE_EXPIRED'}
  }
  if (/^\d{6}$/.test(option.passcode)) {
    if (ticCrypto.hash(option.passcode+option._passtokenSource.uuid)===option._passtokenSource.passcodeHash) {
      return { 
        _state: 'VERIFY_SUCCESS',
        _passtoken: Webtoken.createToken(Object.assign(
          option._passtokenSource, 
          {
            verifyState: 'VERIFY_SUCCESS'
          }
        ))
      }
    }else {
      return { _state: 'VERIFY_FAILED' }
    }
  }else {
    return {  _state: 'PASSCODE_MALFORMED' }
  }
}

DAD.api.prepareRegister = async function({_passtokenSource, passcode, regcode}={}){
  if (_passtokenSource && Date.now() > new Date(_passtokenSource.passcodeExpireAt)){
    return { _state: 'PASSCODE_EXPIRED'}
  }
  if (/^[0-9a-zA-Z]+$/.test(regcode)){
    let aiid = ticCrypto.regcode2aiid(regcode.toLowerCase()) // 我的注册码（=我的邀请人的邀请码）
    if ( aiid<0 || !Number.isInteger(aiid) || aiid > await DAD.count() ){
      return { _state: 'REGCODE_USER_NOTEXIST' }
    } 
    // 允许 aiid>0 或 aiid===0 第一个用户登录时，需要一个系统默认的邀请码。
  }else {
    return { _state: 'REGCODE_MALFORMED' }
  }
  if (/^\d{6}$/.test(passcode)) {
    if (ticCrypto.hash(passcode+_passtokenSource.uuid)===_passtokenSource.passcodeHash) {
      return { 
        _state: 'VERIFY_SUCCESS',
        _passtoken: Webtoken.createToken(Object.assign(
          _passtokenSource, 
          {
            regcode: regcode,
            verifyState: 'VERIFY_SUCCESS'
          }
        ))
      }
    }else {
      return { _state: 'VERIFY_FAILED' }
    }
  }else {
    return {  _state: 'PASSCODE_MALFORMED' }
  }
}

DAD.api.register = DAD.api1.register = async function(option){
  mylog.info(`${__filename} register::::::: option._passtokenSource.uuid = ${option._passtokenSource.uuid}`)
  mylog.info(`${__filename} register::::::: option.passwordClient = ${option.passwordClient}`)
  if (option._passtokenSource 
    && option._passtokenSource.identifyState === 'NEW_USER'
    && option._passtokenSource.verifyState === 'VERIFY_SUCCESS'
    && option.phone && option.phone === option._passtokenSource.phone
    && option._passtokenSource.uuid && option.passwordClient) {
      let passwordServer = ticCrypto.hash(option.passwordClient + option._passtokenSource.uuid)
      let whenRegister = new Date()
      // 路径规范 BIP44: m/Purpose'/Coin'/Account'/Change/Index,
      // 但实际上 Purpose, Coin 都可任意定；' 可有可无；
      // Account/Change/Index 最大到 parseInt(0x7FFFFFFF, 16)
      // 后面还可继续延伸 /xxx/xxx/xxx/......
      let seed=ticCrypto.hash(whenRegister.valueOf()+option._passtokenSource.uuid, {hasher:'md5'})
      let part0=parseInt(seed.slice(0,6), 16)
      let part1=parseInt(seed.slice(6,12), 16)
      let part2=parseInt(seed.slice(12,18), 16)
      let part3=parseInt(seed.slice(18,24), 16)
      let part4=parseInt(seed.slice(24,30), 16)
      let part5=parseInt(seed.slice(31,32), 16)
      let path=`${part0}'/${part1}/${part2}/${part3}/${part4}/${part5}`
      let pathBTC=`m/44'/0'/${path}`
      let pathETH=`m/44'/60'/${path}`
      let coinAddress = {
        BTC: {
          path: pathBTC,
          address: ticCrypto.secword2account(Config.secword, {coin: 'BTC', path: pathBTC}).address
        },
        ETH: { 
          path: pathETH,
          address: ticCrypto.secword2account(Config.secword, {coin: 'ETH', path: pathETH}).address
        }
      }
      let txReward = wo.Trade.create({
        uuidUser: option._passtokenSource.uuid,
        uuidOther: 'SYSTEM',
        txGroup: 'REWARD_TX',
        txType: 'REWARD_REGIST',
        amount: 10 * wo.Trade.getExchangeRate({}),
        amountMining: 10 * wo.Trade.getExchangeRate({}),  // 奖金是通过注册行为凭空挖出的
        exchangeRate: wo.Trade.getExchangeRate({}),
        txTime: whenRegister,
        txTimeUnix: whenRegister.valueOf(),
      })
      txReward.txHash = ticCrypto.hash(txReward.getJson({exclude:['aiid','uuid']}))
      let user = DAD.create( { 
        uuid: option._passtokenSource.uuid,
        phone: option.phone,
        passwordServer, 
        regcode: option._passtokenSource.regcode.toLowerCase(),
        nickname: nickname,
        coinAddress,
        whenRegister,
        lang: option.lang,
        citizen: option.citizen,
        balance: 10 * wo.Trade.getExchangeRate({}),
        rewardSum: 10 * wo.Trade.getExchangeRate({})
      } )
      let aiidInviter = ticCrypto.regcode2aiid(option._passtokenSource.regcode.toLowerCase())
      await to.getManager().transaction(async txman=>{
        await txman.save(txReward)
        await txman.save(user)
        if (aiidInviter > 0) {
          await txman.increment(DAD, {aiid:aiidInviter}, 'communityNumber', 1)
        }
      })
      if (user) {
        return { 
          _state: 'REGISTER_SUCCESS',
          onlineUser: await DAD.normalize(user),
          _passtoken: Webtoken.createToken({
            uuid: option._passtokenSource.uuid,
            phone: option.phone,
            passwordClient: option.passwordClient,
            isOnline: 'ONLINE',
            onlineSince: new Date,
            onlineExpireAt: new Date(Date.now()+30*24*60*60*1000)
          })
        }
      }else {
        return { _state: 'REGISTER_FAILED' }
      }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.autologin = async function({_passtokenSource}={}){
  if (_passtokenSource && _passtokenSource.isOnline && _passtokenSource.uuid && _passtokenSource.passwordClient){
    let passwordServer = ticCrypto.hash(_passtokenSource.passwordClient+_passtokenSource.uuid)
    let onlineUser = await DAD.findOne({ uuid: _passtokenSource.uuid })
    if (onlineUser) {
      if (onlineUser.passwordServer === passwordServer 
        && onlineUser.phone === _passtokenSource.phone){
        return { _state: 'AUTOLOGIN_SUCCESS', onlineUser: await DAD.normalize(onlineUser) }
      }else{
        return { _state: 'AUTOLOGIN_FAILED_WRONG_PASSWORD' }
      }
    }else {
      return { _state: 'AUTOLOGIN_FAILED_USER_NOT_EXIST'}
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.login = DAD.api1.login = async function({passwordClient, phone, _passtokenSource}={}){
  if (passwordClient && phone 
    && _passtokenSource && _passtokenSource.uuid) {
    let passwordServer = ticCrypto.hash(passwordClient+_passtokenSource.uuid)
    let onlineUser = await DAD.findOne({ uuid: _passtokenSource.uuid })
    if (onlineUser) {
      if (onlineUser.passwordServer === passwordServer
        && onlineUser.phone === phone) { // 再次检查 phone，也许可以防止用户在一个客户端上修改了手机后，被在另一个客户端上恶意登录？
        return {
          _state: 'LOGIN_SUCCESS',
          onlineUser: await DAD.normalize(onlineUser),
          _passtoken: Webtoken.createToken({
            uuid: _passtokenSource.uuid,
            phone: phone,
            passwordClient: passwordClient,
            isOnline: 'ONLINE',
            onlineSince: new Date,
            onlineExpireAt: new Date(Date.now()+30*24*60*60*1000)
          })
        }
      }else {
        return { 
          _state: 'LOGIN_FAILED_WRONG_PASSWORD'
        }
      }
    }else {
      return { 
        _state: 'LOGIN_FAILED_USER_NOTEXIST'
      }
    }
  }
  return { _state: 'INPUT_MALFORMED'}
}

DAD.api.logout = async function({_passtokenSource}){ // 虽然现在什么也不需要后台操作，但将来也许后台把logout计入日志
  wo.appSocket.removeUserSocket(_passtokenSource.uuid)

  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.resetPassword = async function(option){
  if (option._passtokenSource 
    && option._passtokenSource.identifyState === 'OLD_USER'
    && option._passtokenSource.verifyState === 'VERIFY_SUCCESS'
    && option.phone && option.phone === option._passtokenSource.phone
    && option._passtokenSource.uuid && option.passwordClient) {
      await DAD.update({ uuid:option._passtokenSource.uuid }, {passwordServer: ticCrypto.hash(option.passwordClient + option._passtokenSource.uuid)})
      let updated = DAD.findOne({uuid:option._passtokenSource.uuid})
      if (updated) {
        return { _state: 'RESET_SUCCESS' }
      }else {
        return { _state: 'REGISTER_FAILED' }
      }
    }else{
      return { _state: 'INPUT_MALFORMED' }
    }

}

DAD.api.setLang= async function({User, _passtokenSource}={}){
  if (User && User.lang
    && _passtokenSource && _passtokenSource.isOnline){
      await DAD.update({uuid:_passtokenSource.uuid}, {lang:User.lang})
      let result = DAD.findOne({uuid:_passtokenSource.uuid})
      return result?true:false
    }
}

DAD.api.updatePayChannel= async ({channel, _passtokenSource}={})=>{
  if (channel && _passtokenSource){
    let me = await DAD.findOne({uuid: _passtokenSource.uuid})
    if (!me.payChannel) me.payChannel = {}
    me.payChannel[channel.type] = channel
    await DAD.update({uuid: _passtokenSource.uuid},{payChannel:me.payChannel})
    return { _state: 'SUCCESS'}
  }
  return { _state: 'FAILED'}
}

DAD.api.changeNickname = async ({nickname, _passtokenSource={}}={})=>{
  if (nickname && _passtokenSource.uuid){
    await DAD.update({uuid:_passtokenSource.uuid}, {nickname})
    return { _state: 'SUCCESS', nickname }
  }
  return { _state: 'FAIL' }
}

DAD.sysapi.getUserArray = async ({where, take=10, order={aiid:'ASC'}, skip=0})=>{
  let [userArray, count] = await DAD.findAndCount({where, take, order, skip})
  return { _state: 'SUCCESS', userArray, count }
}

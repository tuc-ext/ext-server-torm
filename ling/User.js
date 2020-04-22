'use strict'
const Ling = require('so.ling/Ling.to.js')
const Uuid = require('uuid')
const ticCrypto = require('tic.crypto')
const Messenger = require('so.base/Messenger.js')
const Webtoken = require('so.base/Webtoken.js')
const Internation = require('so.base/Internation.js')
const Trade = require('./Trade.js')
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
      whenRegister: { type: String, nullable: true },
      coinAddress: { type: 'simple-json', nullable: true },
      balance: { type: 'real', default: 0 },
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
      communityRewardSum: { type: 'real', default: 0 },
      json: { type: 'simple-json', nullable: true } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
    }
  }

  normalize(){
    this.inviterCode = ticCrypto.aiid2regcode(this.aiid)
    delete this.aiid
    return this
  }
}

/****************** API方法 ******************/
DAD.api=DAD.api1={}

DAD.api.changePortrait = async function (option) {
  if (option._passtokenSource && option._passtokenSource.isOnline) {
    let file = option._req.file
    if (file && /^image\//.test(file.mimetype)) {
      await DAD.update({uuid: option._passtokenSource.uuid}, {portrait:option._req.file.filename})
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

DAD.api.updateKycL2 = async function(option) {
  let user = await DAD.findOne({uuid:option._passtokenSource.uuid})
  if (user && user.idCardCover && user.idCardBack){
    await user.save({kycStateL2: 'SUBMITTED'})
    return { _state: 'SUBMITTED' }
  }else {
    return { _state: 'INPUT_MALFORMED' }
  }
}

DAD.api.updateKycL3 = async function(option) {
  let user = await DAD.findOne({uuid:option._passtokenSource.uuid})
  if (user && user.idCardSelfie){
    await user.save({kycStateL3: 'SUBMITTED'})
    return { _state: 'SUBMITTED' }
  }else {
    return { _state: 'INPUT_MALFORMED' }
  }
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
    if (aiid<0 || !Number.isInteger(aiid) || !await DAD.findOne({aiid:aiid})){
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
      let user = await DAD.save( { 
        uuid: option._passtokenSource.uuid,
        phone: option.phone,
        passwordServer, 
        regcode: option._passtokenSource.regcode.toLowerCase(),
        nickname: option.phone,
        coinAddress,
        whenRegister,
        lang: option.lang,
        citizen: option.citizen,
        balance: 10 * Trade.exchangeRate({}),
        rewardSum: 10 * Trade.exchangeRate({})
      } )
      let txReward = Trade.create({
        uuidUser: option._passtokenSource.uuid,
        uuidOther: 'SYSTEM',
        txGroup: 'REWARD_TX',
        txType: 'REWARD_REGIST',
        amount: user.balance,
        amountMining: user.balance,  // 奖金是通过注册行为凭空挖出的
        exchangeRate: Trade.exchangeRate({}),
        txTime: user.whenRegister,
        txTimeUnix: new Date(user.whenRegister).valueOf(),
      })
      txReward.txHash = ticCrypto.hash(txReward.getJson({exclude:['aiid','uuid']}))
      let reward = await txReward.save()
      if (user) {
// 或者严格按照 BIP44 的规范，代价是，需要先加入数据库获得用户aiid后才能确定路径
//        let pathBTC = `m/44'/0'/${user.aiid}'/0/0`
//        let pathETH = `m/44'/60'/${user.aiid}'/0/0`
//        let coinAddress = { ... }
//        await user.setMe({ User:{coinAddress}})
        let aiid = ticCrypto.regcode2aiid(option._passtokenSource.regcode.toLowerCase())
        if (aiid > 0) {
          DAD.increment({aiid:aiid}, 'communityNumber', 1)
        }

        return { 
          _state: 'REGISTER_SUCCESS',
          onlineUser: user.normalize(),
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

DAD.api.autologin = async function(option){
  if (option._passtokenSource && option._passtokenSource.isOnline && option._passtokenSource.uuid && option._passtokenSource.passwordClient){
    let passwordServer = ticCrypto.hash(option._passtokenSource.passwordClient+option._passtokenSource.uuid)
    let onlineUser = await DAD.findOne({ uuid: option._passtokenSource.uuid })
    if (onlineUser) {
      if (onlineUser.passwordServer === passwordServer 
        && onlineUser.phone === option._passtokenSource.phone){
        return { _state: 'AUTOLOGIN_SUCCESS', onlineUser: onlineUser.normalize() }
      }else{
        return { _state: 'AUTOLOGIN_FAILED_WRONG_PASSWORD' }
      }
    }else {
      return { _state: 'AUTOLOGIN_FAILED_USER_NOT_EXIST'}
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.login = DAD.api1.login = async function(option){
  if (option.passwordClient && option.phone 
    && option._passtokenSource && option._passtokenSource.uuid) {
    let passwordServer = ticCrypto.hash(option.passwordClient+option._passtokenSource.uuid)
    let onlineUser = await DAD.findOne({ uuid: option._passtokenSource.uuid })
    if (onlineUser) {
      if (onlineUser.passwordServer === passwordServer
        && onlineUser.phone === option.phone) { // 再次检查 phone，也许可以防止用户在一个客户端上修改了手机后，被在另一个客户端上恶意登录？
        return {
          _state: 'LOGIN_SUCCESS',
          onlineUser: onlineUser.normalize(),
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

DAD.api.logout = async function(option){ // 虽然现在什么也不需要后台操作，但将来也许后台把logout计入日志
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

DAD.api.setLang= async function(option){
  if (option && option.User && option.User.lang
    && option._passtokenSource && option._passtokenSource.isOnline){
      await DAD.update({uuid:option._passtokenSource.uuid}, {lang:option.User.lang})
      let result = DAD.findOne({uuid:option._passtokenSource.uuid})
      return result?true:false
    }
}

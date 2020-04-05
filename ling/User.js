'use strict'
const Ling = require('so.ling')
const Uuid = require('uuid')
const ticCrypto = require('tic.crypto')
const Messenger = require('so.base/Messenger.js')
const Webtoken = require('so.base/Webtoken.js')
const Internation = require('so.base/Internation.js')

const Config = require('so.base/Config.js')

/****************** 类和原型 *****************/
const DAD = module.exports = class User extends Ling { // 构建类
  constructor(prop){
    super(prop)
    this._class = this.constructor.name
    this.setProp(prop)  
  }
}

const MOM = DAD.prototype // 原型对象
MOM._table = DAD.name
MOM._tablekey = 'uuid'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  aiid: { default: undefined, sqlite:'INTEGER PRIMARY KEY' },
  uuid: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'VARCHAR(64) PRIMARY KEY' },
  phone: { default: undefined, sqlite: 'TEXT UNIQUE' },
  passwordServer: { default: undefined, sqlite: 'TEXT' },
  regcode: { default: undefined, sqlite: 'TEXT', info:'我的邀请人的邀请码' },
  portrait: { default: undefined, sqlite: 'TEXT' },
  nickname: { default: undefined, sqlite: 'TEXT' },
  realname: { default: '', sqlite: 'TEXT' },
  lang: { default: undefined, sqlite: 'TEXT' },
  citizen: { default: undefined, sqlite: 'TEXT' },
  idType: { default: undefined, sqlite: 'TEXT' },
  idNumber: { default: '', sqlite: 'TEXT' },
  kycStateL1: { default: undefined, sqlite:'TEXT' },
  kycStateL2: { default: undefined, sqlite: 'TEXT' },
  kycStateL3: { default: undefined, sqlite: 'TEXT' },
  idCardCover: { default: undefined, sqlite:'TEXT' },
  idCardBack: { default: undefined, sqlite:'TEXT' },
  idCardSelfie: { default: undefined, sqlite:'TEXT' },
  whenRegister: { default: undefined, sqlite: 'TEXT' },
  coinAddress: { default: {}, sqlite: 'TEXT' },
  balance: { default: 0, sqlite: 'REAL' },
  estateProfitSum: { default:0, sqlite: 'REAL' },
  estateFeeSum: { default:0, sqlite: 'REAL' },
  estateTaxSum: { default:0, sqlite: 'REAL' },
  estateHoldingNumber: { default:0, sqlite: 'INTEGER' },
  estateHoldingCost: { default:0, sqlite:'REAL'},
  estateHoldingValue: { default:0, sqlite:'REAL'},
  estateHoldingProfit: {default:0, sqlite:'REAL'},
  depositUsdtSum: { default:0, sqlite: 'REAL' },
  depositLogSum: { default:0, sqlite: 'REAL' },
  communityNumber: { default:0, sqlite: 'INTEGER' },
  communityRewardSum: { default:0, sqlite: 'REAL' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/
MOM.normalize=function(){
  this.inviterCode = ticCrypto.aiid2regcode(this.aiid)
  delete this.aiid
  return this
}

/****************** API方法 ******************/
DAD.api=DAD.api1={}

DAD.api.changePortrait = async function (option) {
  if (option._passtokenSource && option._passtokenSource.isOnline) {
    let file = option._req.file
    if (file && /^image\//.test(file.mimetype)) {
      await DAD.setOne({User:{portrait:option._req.file.filename}, cond:{uuid: option._passtokenSource.uuid}})
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
      await DAD.setOne({User:obj, cond:{uuid: option._passtokenSource.uuid}})
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
    await DAD.setOne({ User:option.User, cond:{uuid: option._passtokenSource.uuid } })
    return { _state: 'SUBMITTED' }
  }else {
    return { _state: 'INPUT_MALFORMED' }
  }
}

DAD.api.updateKycL2 = async function(option) {
  let user = await User.getOne({User:{uuid:option._passtokenSource.uuid}})
  if (user && user.idCardCover && user.idCardBack){
    await DAD.setOne({ User:{kycStateL2: 'SUBMITTED'}, cond:{uuid: option._passtokenSource.uuid } })
    return { _state: 'SUBMITTED' }
  }else {
    return { _state: 'INPUT_MALFORMED' }
  }
}

DAD.api.updateKycL3 = async function(option) {
  let user = await User.getOne({User:{uuid:option._passtokenSource.uuid}})
  if (user && user.idCardSelfie){
    await DAD.setOne({ User:{kycStateL3: 'SUBMITTED'}, cond:{uuid: option._passtokenSource.uuid } })
    return { _state: 'SUBMITTED' }
  }else {
    return { _state: 'INPUT_MALFORMED' }
  }
}

DAD.api.identify = DAD.api1.identify = async function(option){
  if (option.phone && Internation.validatePhone({phone:option.phone})) {
    let user = await DAD.getOne({User: {phone:option.phone}})
    let _state, uuid
    if (user) {
      uuid = user.uuid
      _state = 'OLD_USER'
    } else {
      uuid = `${DAD.name}-${Uuid.v4()}`,
      _state = 'NEW_USER'
    }
    mylog.info(`identify::::::: uuid = ${uuid}`)
    return {
      _state,
      uuid,
      _passtoken: Webtoken.createToken({
        phone: option.phone,
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
  if (option._passtokenSource && Date.now()>new Date(option._passtokenSource.passcodeExpireAt)){
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

DAD.api.prepareRegister = async function(option){
  if (option._passtokenSource && Date.now()>new Date(option._passtokenSource.passcodeExpireAt)){
    return { _state: 'PASSCODE_EXPIRED'}
  }
  if (/^[0-9a-zA-Z]+$/.test(option.regcode)){
    let aiid = ticCrypto.regcode2aiid(option.regcode.toLowerCase()) // 我的注册码（=我的邀请人的邀请码）
    if (aiid<0 || !Number.isInteger(aiid) || !await DAD.getOne({User:{aiid:aiid}})){
      return { _state: 'REGCODE_USER_NOTEXIST' }
    } 
    // 允许 aiid>0 或 aiid===0 第一个用户登录时，需要一个系统默认的邀请码。
  }else {
    return { _state: 'REGCODE_MALFORMED' }
  }
  if (/^\d{6}$/.test(option.passcode)) {
    if (ticCrypto.hash(option.passcode+option._passtokenSource.uuid)===option._passtokenSource.passcodeHash) {
      return { 
        _state: 'VERIFY_SUCCESS',
        _passtoken: Webtoken.createToken(Object.assign(
          option._passtokenSource, 
          {
            regcode: option.regcode,
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
      let user = await DAD.addOne( { User: { 
        uuid: option._passtokenSource.uuid,
        phone: option.phone,
        passwordServer, 
        regcode: option._passtokenSource.regcode.toLowerCase(),
        nickname: option.phone,
        coinAddress,
        whenRegister,
        lang: option.lang,
        citizen: option.citizen,
        balance: 10 * wo.Trade.exchangeRate({})
      } } )
      let txReward = new wo.Trade({
        uuidUser: option._passtokenSource.uuid,
        uuidOther: 'SYSTEM',
        txGroup: 'REWARD_TX',
        txType: 'REWARD_REGIST',
        amount: user.balance, // 作为买家，是负数
        amountMining: user.balance,
        exchangeRate: wo.Trade.exchangeRate({}),
        txTime: user.whenRegister,
        txTimeUnix: new Date(user.whenRegister).valueOf(),
      })
      txReward.txHash = ticCrypto.hash(txReward.getJson({exclude:['aiid','uuid']}))
      let reward = await txReward.addMe()
      if (user) {
// 或者严格按照 BIP44 的规范，代价是，需要先加入数据库获得用户aiid后才能确定路径
//        let pathBTC = `m/44'/0'/${user.aiid}'/0/0`
//        let pathETH = `m/44'/60'/${user.aiid}'/0/0`
//        let coinAddress = { ... }
//        await user.setMe({ User:{coinAddress}})
        let aiid = ticCrypto.regcode2aiid(option._passtokenSource.regcode.toLowerCase())
        if (aiid > 0) {
          let inviter = await DAD.getOne({User:{aiid:aiid }})
          if (inviter){
            inviter.communityNumber++
//            inviter.communityRewardSum+=Config.COMMUNITY_REWARD
            await inviter.setMe()
          }
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
    let onlineUser = await DAD.getOne({User:{ uuid: option._passtokenSource.uuid }})
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
    let onlineUser = await DAD.getOne({User:{ uuid: option._passtokenSource.uuid }})
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
      let onlineUser = await DAD.getOne({User:{uuid:option._passtokenSource.uuid}})
      let passwordServer = ticCrypto.hash(option.passwordClient + option._passtokenSource.uuid)
      let updated = await DAD.setOne({User:{passwordServer}, cond:{uuid:option._passtokenSource.uuid}})
      if (updated && updated.passwordServer === passwordServer){
        return { _state: 'RESET_SUCCESS' }
      }else {
        return { _state: 'RESET_FAILED' }
      }
    }else{
      return { _state: 'INPUT_MALFORMED' }
    }

}

DAD.api.setLang=function(option){
  if (option && option.User && option.User.lang
    && option._passtokenSource && option._passtokenSource.isOnline){
      let result = User.setOne({User:{lang:option.User.lang}, cond:{uuid:option._passtokenSource.uuid}})
      return result?true:false
    }
}

DAD.api.getMyCommunityNumber=async function(option){
  let myself = await DAD.getOne({User:{uuid:option._passtokenSource.uuid}})
  let myregcode = ticCrypto.aiid2regcode(myself.aiid)
  let communityNumber = await DAD.getCount({User: {regcode:myregcode}})
  return { _state: 'SUCCESS', communityNumber }
}
'use strict'
const Ling = require('so.ling')
const Uuid = require('uuid')
const ticCrypto = require('tic.crypto')
const Messenger = require('so.base/Messenger.js')
const Webtoken = require('so.base/Webtoken.js')
const Internation = require('so.base/Internation.js')

// https://cnodejs.org/topic/5721cd79fa48138c41110f05
const Multer=require('multer') // https://www.npmjs.com/package/multer
//const FileSystem=require('fs')
const Bluebird=require('bluebird') // http://bluebirdjs.com/
//const PromisedFS=Bluebird.promisifyAll(FileSystem)  // 或者：https://www.npmjs.com/package/fs-bluebird
const Uploader = Bluebird.promisify(Multer({
  //dest:'./File/', // 这样，不能自定义文件名。
  storage:Multer.diskStorage({
    destination: function (req, file, cb) { // 如果直接提供字符串，Multer会负责创建该目录。如果提供函数，你要负责确保该目录存在。
      var folder='./' // 目录是相对于本应用的入口js的，即相对于 server.js 的位置。
//      try{ FileSystem.accessSync(folder) }catch(e){ FileSystem.mkdirSync(folder)  }  // 我已确保它存在。或者用 exists 方法。
      cb(null, folder)
    },
    filename: function (req, file, cb) { // 注意，req.body 也许还没有信息，因为这取决于客户端发送body和file的顺序。
      var ext=file.originalname.replace(/^.*\.(\w+)$/,'$1')
      cb(null, req.body.usage+'-'+Date.now()+'.'+ext) // 这时还没有用 json2obj 和 decodeURIComponent 过滤，所以要专门过滤一次。
    }
  }),
  //fileFilter:function(req, file, cb) {},
  //limits:{fileSize:10485760}
}).single('portrait'))


/****************** 类和原型 *****************/
const DAD = module.exports = function User (prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
DAD._table = DAD.name

const MOM = DAD.prototype // 原型对象
MOM.__proto__ = Ling.prototype
MOM._tablekey = 'uuid'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  aiid: { default: undefined, sqlite:'INTEGER PRIMARY KEY' },
  uuid: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'VARCHAR(64) PRIMARY KEY' },
  phone: { default: undefined, sqlite: 'TEXT UNIQUE' },
  passwordServer: { default: undefined, sqlite: 'TEXT' },
  portrait: { default: undefined, sqlite: 'TEXT' },
  nickname: { default: undefined, sqlite: 'TEXT' },
  balance: { default: 0, sqlite: 'REAL' },
  whenRegister: { default: undefined, sqlite: 'TEXT' },
  coinAddress: { default: {}, sqlite: 'TEXT' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api=DAD.api1={}

DAD.api.changePortrait = async function (option) {
  await Uploader(option._req, option._res)
  console.log(option._req.body.whoami)
  console.log(typeof option._req.body.whoami)
  console.log(JSON.stringify(option._req.body)) // 对 multipart 的 HTTP Post，bodyParser过滤后的 req.body 是空的，要被 multer 过滤后才出现 req.body
  console.log(option._req.file)
  return { _state: 'SUCCESS'}
}

DAD.api.identify = DAD.api1.identify = async function(option){
  if (option.phone && Internation.validatePhone({phone:option.phone})) {
    let user = await DAD.getOne({User: {phone:option.phone}})
    let _state, uuid
    if (user) {
      uuid = user.uuid
      _state = 'OLD_USER'
    } else {
      uuid = Uuid.v4(),
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
  let _state
  if (option.passcode && option._passtokenSource && new Date() < new Date(option._passtokenSource.passcodeExpireAt)) {
    if (ticCrypto.hash(option.passcode+option._passtokenSource.uuid)===option._passtokenSource.passcodeHash) {
      _state = 'VERIFY_SUCCESS'
    }else{
      _state = 'VERIFY_FAILED'
    }
    return { 
      _state,
      _passtoken: Webtoken.createToken(Object.assign(
        option._passtokenSource, 
        {
          verifyState: _state
        }
      ))
    }
  }
  return {
    _state: 'INPUT_MALFORMED'
  }
}

DAD.api.register = DAD.api1.register = async function(option){
  mylog.info(`${__filename} register::::::: option._passtokenSource.uuid = ${option._passtokenSource.uuid}`)
  mylog.info(`${__filename} register::::::: option.passwordClient = ${option.passwordClient}`)
  if (option._passtokenSource 
    && option._passtokenSource.identifyState === 'NEW_USER'
    && option._passtokenSource.verifyState === 'VERIFY_SUCCESS'
    && option.phone && option.passwordClient
    && option.phone === option._passtokenSource.phone) {
      let passwordServer = ticCrypto.hash(option.passwordClient + option._passtokenSource.uuid)
      let whenRegister = new Date()
      // 路径规范 BIP44: m/Purpose'/Coin'/Account'/Change/Index,
      // 但实际上 Purpose, Coin 都可任意定；' 可有可无；
      // Account 最大到 parseInt(0x7FFFFFFF, 16), Coin/Index最大到 parseInt(0xFFFFFFFF, 16)
      // 后面还可继续延伸 /xxx/xxx/xxx/......
      let seed=ticCrypto.hash(whenRegister.valueOf()+option.phone, {hasher:'md5'})
      let part0=parseInt(seed.slice(0,6), 16)
      let part1=parseInt(seed.slice(6,12), 16)
      let part2=parseInt(seed.slice(12,18), 16)
      let part3=parseInt(seed.slice(18,24), 16)
      let part4=parseInt(seed.slice(24,32), 16)
      let pathBTC=`m/44'/0'/${part0}'/${part1}/${part2}/${part3}/${part4}`
      let pathETH=`m/44'/60'/${part0}'/${part1}/${part2}/${part3}/${part4}`
      let coinAddress = {
        BTC: {
          path: pathBTC,
          address: ticCrypto.secword2account(wo.Config.secword, {coin: 'BTC', path: pathBTC}).address
        },
        ETH: { 
          path: pathETH,
          address: ticCrypto.secword2account(wo.Config.secword, {coin: 'ETH', path: pathETH}).address
        }
      }
      let user = await DAD.addOne( { User: { 
        uuid: option._passtokenSource.uuid,
        phone: option.phone,
        passwordServer, 
        nickname: option.phone,
        coinAddress,
        whenRegister,
      } } )
      if (user) {
// 或者严格按照 BIP44 的规范，代价是，需要先加入数据库获得用户aiid后才能确定路径
//        let pathBTC = `m/44'/0'/${user.aiid}'/0/0`
//        let pathETH = `m/44'/60'/${user.aiid}'/0/0`
//        let coinAddress = { ... }
//        await user.setMe({ User:{coinAddress}})
        return { 
          _state: 'REGISTER_SUCCESS',
          onlineUser: user,
          _passtoken: Webtoken.createToken({
            uuid: option._passtokenSource.uuid,
            phone: option.phone,
            passwordClient: option.passwordClient,
            onlineState: 'ONLINE',
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
  if (option._passtokenSource && option._passtokenSource.uuid && option._passtokenSource.passwordClient){
    let passwordServer = ticCrypto.hash(option._passtokenSource.passwordClient+option._passtokenSource.uuid)
    let onlineUser = await DAD.getOne({User:{ uuid: option._passtokenSource.uuid }})
    if (onlineUser) {
      if (onlineUser.passwordServer === passwordServer 
        && onlineUser.phone === option._passtokenSource.phone){
        return { _state: 'AUTOLOGIN_SUCCESS', onlineUser: onlineUser }
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
          onlineUser,
          _passtoken: Webtoken.createToken({
            uuid: option._passtokenSource.uuid,
            phone: option.phone,
            passwordClient: option.passwordClient,
            onlineState: 'ONLINE',
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

DAD.api.logout = async function(){ // 虽然现在什么也不需要后台操作，但将来也许后台把logout计入日志
  return { _state: 'INPUT_MALFORMED' }
}
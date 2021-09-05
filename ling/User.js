'use strict'
const ticCrypto = require('tic.crypto')
const messenger = require('sol.messenger')
const webtoken = require('sol.webtoken')
const Internation = require('sol.i18n')
const torm = require('typeorm')

/****************** 类和原型 *****************/
const DAD = (module.exports = class User extends torm.BaseEntity {
  // 构建类
  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: Number, primary: true, generated: true },
      uuid: { type: String, unique: true, generated: 'uuid' },
      phone: { type: String, unique: true },
      passwordServer: { type: String, default: null },
      regcode: { type: String, default: null, comment: '我的邀请人的邀请码，不是我的邀请码' },
      portrait: { type: String, default: null },
      nickname: { type: String, default: null },
      realname: { type: String, nullable: true, default: '' },
      lang: { type: String, nullable: true },
      citizen: { type: String, default: null },
      idType: { type: String, default: null },
      idNumber: { type: String, nullable: true, default: '' },
      kycStateL1: { type: String, default: null },
      kycStateL2: { type: String, default: null },
      kycStateL3: { type: String, default: null },
      idCardCover: { type: String, default: null },
      idCardBack: { type: String, default: null },
      idCardSelfie: { type: String, default: null },
      whenRegister: { type: Date, default: null },
      registerTimeUnix: { type: 'int', default: null },
      coinAddress: { type: 'simple-json', default: '{}' },
      payChannel: { type: 'simple-json', default: '{}', nullable: true },
      balance: { type: 'real', default: 0 },
      frozenBalance: { type: 'real', default: 0 },
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
      json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
    },
  }

  static async normalize(user = {}) {
    user.inviterCode = ticCrypto.aiid2regcode(user.aiid) // 我的邀请码 // 只给onlineUser
    //    user.communityNumberKyc = await DAD.count({regcode: user.inviterCode, kycStateL1: 'PASSED', kycStateL2: 'PASSED'}) || 0
    delete user.aiid
    delete user.passwordServer
    return user
  }
})

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}
DAD.sysapi = {}

DAD.api.changePortrait = async function ({ _passtokenSource, _req } = {}) {
  if (_passtokenSource && _passtokenSource.isOnline) {
    let file = _req.file
    if (file && /^image\//.test(file.mimetype)) {
      await DAD.update({ uuid: _passtokenSource.uuid }, { portrait: file.filename })
      return Object.assign(file, { _state: 'SUCCESS' })
    } else {
      return { _state: 'BACKEND_FAIL_FILE_NOT_IMAGE' }
    }
  } else {
    return { _state: 'BACKEND_FAIL_USER_NOT_ONLINE' }
  }
}
DAD.api.changePortrait2Cloud = async ({ _passtokenSource, User: { portrait } = {} } = {}) => {
  if (_passtokenSource && _passtokenSource.isOnline) {
    if (portrait) {
      await DAD.update({ uuid: _passtokenSource.uuid }, { portrait: portrait })
      return { _state: 'SUCCESS' }
    } else {
      return { _state: 'FILE_NOT_EXIST' }
    }
  } else {
    return { _state: 'BACKEND_FAIL_USER_NOT_ONLINE' }
  }
}

DAD.api.uploadIdCard = async function ({ _passtokenSource, side, _req }) {
  if (_passtokenSource && _passtokenSource.isOnline && ['Cover', 'Back', 'Selfie'].indexOf(side)) {
    let file = _req.file
    if (file && /^image\//.test(file.mimetype)) {
      let obj = {}
      obj[`idCard${side}`] = _req.file.filename
      await DAD.update({ uuid: _passtokenSource.uuid }, obj)
      return Object.assign(file, { _state: 'SUCCESS' })
    } else {
      return { _state: 'BACKEND_FAIL_FILE_NOT_IMAGE' }
    }
  } else {
    return { _state: 'BACKEND_FAIL_USER_NOT_ONLINE' }
  }
}

DAD.api.updateKycL1 = async function (option) {
  if (option.User && option.User.realname && option.User.idNumber && option.User.idType && option.User.citizen) {
    option.User.kycStateL1 = 'SUBMITTED'
    await DAD.update({ uuid: option._passtokenSource.uuid }, option.User)
    return { _state: 'SUBMITTED' }
  } else {
    return { _state: 'INPUT_MALFORMED' }
  }
}
DAD.sysapi.passKycL1 = async function ({ User }) {
  let result = { _state: 'ERROR' }
  await torm.getManager().transaction(async (txman) => {
    await txman.update(DAD, { uuid: User.uuid }, { kycStateL1: 'PASSED' })
    result._state = 'SUCCESS'
  })
  return result
}
DAD.sysapi.rejectKycL1 = async function ({ User }) {
  let result = { _state: 'ERROR' }
  await torm.getManager().transaction(async (txman) => {
    await txman.update(DAD, { uuid: User.uuid }, { kycStateL1: 'REJECTED' })
    result._state = 'SUCCESS'
  })
  return result
}
DAD.api.updateKycL2 = async function ({ _passtokenSource, User }) {
  //  let user = await DAD.findOne({ uuid: option._passtokenSource.uuid })
  if (User.idCardCover && User.idCardBack) {
    await DAD.update({ uuid: _passtokenSource.uuid }, Object.assign(User, { kycStateL2: 'SUBMITTED' }))
    return { _state: 'SUBMITTED' }
  } else {
    return { _state: 'INPUT_MALFORMED' }
  }
}
DAD.sysapi.passKycL2 = async function ({ User }) {
  let result = { _state: 'ERROR' }
  await torm.getManager().transaction(async (txman) => {
    // 先更新本人的状态
    await txman.update(DAD, { uuid: User.uuid }, { kycStateL2: 'PASSED' })
    result._state = 'SUCCESS'

    // 再检查推荐人
    let user = await DAD.findOne({ uuid: User.uuid })
    let inviterAiid = ticCrypto.regcode2aiid(user.regcode)
    if (inviterAiid > 0) {
      let inviter = await DAD.findOne({ aiid: ticCrypto.regcode2aiid(user.regcode) })
      let rate = wo.Trade.getExchangeRate()
      let reward = rate * 5
      let passTime = new Date()
      let txReward = wo.Trade.create({
        uuidUser: inviter.uuid,
        uuidOther: 'SYSTEM',
        txGroup: 'REWARD_TX',
        txType: 'REWARD_INVITE',
        amount: reward,
        amountMining: reward, // 奖金是通过注册行为凭空挖出的
        exchangeRate: rate,
        txTime: passTime,
        txTimeUnix: passTime.valueOf(),
      })
      txReward.txHash = ticCrypto.hash(wo.tool.sortAndFilterJson({ fields: txReward.constructor.schema.columns, entity: txReward, exclude: ['aiid', 'uuid'] }))
      await txman.save(txReward)

      await txman.update(
        DAD,
        { uuid: inviter.uuid },
        {
          balance: inviter.balance + reward,
          communityNumberKyc: inviter.communityNumberKyc + 1,
          communityRewardSum: inviter.communityRewardSum + reward,
          rewardSum: inviter.rewardSum + reward,
        }
      )
    }
  })
  return result
}
DAD.sysapi.rejectKycL2 = async function ({ User }) {
  let result = { _state: 'ERROR' }
  await torm.getManager().transaction(async (txman) => {
    await txman.update(DAD, { uuid: User.uuid }, { kycStateL2: 'REJECTED' })
    result._state = 'SUCCESS'
  })
  return result
}

DAD.api.updateKycL3 = async function ({ _passtokenSource, User }) {
  //  let user = await DAD.findOne({ uuid: option._passtokenSource.uuid })
  if (User.idCardSelfie) {
    await DAD.update({ uuid: _passtokenSource.uuid }, { idCardSelfie: User.idCardSelfie, kycStateL3: 'SUBMITTED' })
    return { _state: 'SUBMITTED' }
  } else {
    return { _state: 'INPUT_MALFORMED' }
  }
}
DAD.sysapi.passKycL3 = async function ({ User }) {
  let result = { _state: 'ERROR' }
  await torm.getManager().transaction(async (txman) => {
    await txman.update(DAD, { uuid: User.uuid }, { kycStateL3: 'PASSED' })
    result._state = 'SUCCESS'
  })
  return result
}
DAD.sysapi.rejectKycL3 = async function ({ User }) {
  let result = { _state: 'ERROR' }
  await torm.getManager().transaction(async (txman) => {
    await txman.update(DAD, { uuid: User.uuid }, { kycStateL3: 'REJECTED' })
    result._state = 'SUCCESS'
  })
  return result
}

DAD.api.identify = DAD.api1.identify = async function ({ phone } = {}) {
  if (phone && Internation.validatePhone({ phone })) {
    let user = await DAD.findOne({ phone })
    let _state = user ? 'OLD_USER' : 'NEW_USER'
    let uuid = user ? user.uuid : ticCrypto.randomUuid()
    return {
      _state,
      uuid,
      _passtoken: webtoken.createToken(
        {
          phone,
          uuid,
          identifyState: _state,
        },
        wo.envi.tokenKey
      ),
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.sendPasscode = async function ({ _passtokenSource, phone }) {
  if (phone && Internation.validatePhone({ phone })) {
    // 用户在更换新手机
    if (phone === _passtokenSource.phone) {
      return { _state: 'NEWPHONE_IS_OLD' }
    } else if ((await DAD.count({ phone: phone })) >= 1) {
      return { _state: 'NEWPHONE_EXISTED' }
    }
  }

  let passcode = ticCrypto.randomNumber({ length: 6 })
  let passcodePhone = Internation.validatePhone({ phone }) ? phone : _passtokenSource.phone
  let passcodeHash = ticCrypto.hash(passcode + passcodePhone + _passtokenSource.uuid)
  wo.log.info('passcode = ' + passcode)
  wo.log.info('phone = ' + passcodePhone)
  wo.log.info('uuid = ' + _passtokenSource.uuid)
  wo.log.info('passcodeHash = ' + passcodeHash)
  // send SMS
  let sendResult = { sendState: 'DONE' }
  if (process.env.NODE_ENV === 'production') {
    sendResult = await messenger.sendSms(passcodePhone, {
      vendor: 'aliyun',
      msgParam: { code: passcode },
      templateCode: 'SMS_142465215',
      signName: 'LOG',
    })
  }

  if (sendResult.sendState === 'DONE') {
    let passcodeSentAt = Date.now()
    let passcodeExpireAt = Date.now() + 5 * 60 * 1000
    return {
      _state: 'PASSCODE_SENT',
      passcodeHash,
      passcodePhone,
      passcodeSentAt,
      passcodeExpireAt,
      _passtoken: webtoken.createToken(
        Object.assign(_passtokenSource, {
          passcodePhone,
          passcodeHash,
          passcodeState: 'PASSCODE_SENT',
          passcodeSentAt,
          passcodeExpireAt,
        }),
        wo.envi.tokenKey
      ),
    }
  }
  return { _state: 'PASSCODE_UNSENT' }
}

DAD.api.verifyPasscode = async function ({ _passtokenSource, passcode }) {
  if (_passtokenSource && Date.now() > _passtokenSource.passcodeExpireAt) {
    return { _state: 'PASSCODE_EXPIRED' }
  }
  if (!/^\d{6}$/.test(passcode)) {
    return { _state: 'PASSCODE_MALFORMED' }
  }
  if (
    _passtokenSource.phone === _passtokenSource.passcodePhone &&
    ticCrypto.hash(passcode + _passtokenSource.phone + _passtokenSource.uuid) === _passtokenSource.passcodeHash
  ) {
    let expire = Date.now() + 5 * 60 * 1000
    return {
      _state: 'VERIFY_SUCCESS',
      verifyExpireAt: expire,
      _passtoken: webtoken.createToken(
        Object.assign(_passtokenSource, {
          verifyState: 'VERIFY_SUCCESS',
          verifyExpireAt: expire,
        }),
        wo.envi.tokenKey
      ),
    }
  } else {
    return { _state: 'VERIFY_FAILED' }
  }
}

DAD.api.verifyAndChangePhone = async function ({ _passtokenSource, passcode }) {
  if (_passtokenSource && Date.now() > _passtokenSource.passcodeExpireAt) {
    return { _state: 'PASSCODE_EXPIRED' }
  }
  if (!/^\d{6}$/.test(passcode)) {
    return { _state: 'PASSCODE_MALFORMED' }
  }
  if (ticCrypto.hash(passcode + _passtokenSource.passcodePhone + _passtokenSource.uuid) !== _passtokenSource.passcodeHash) {
    return { _state: 'VERIFY_FAILED' }
  }
  if (_passtokenSource.phone === _passtokenSource.passcodePhone) {
    return { _state: 'NEWPHONE_IS_OLD' }
  }
  if ((await DAD.count({ phone: _passtokenSource.passcodePhone })) >= 1) {
    return { _state: 'NEWPHONE_EXISTED' }
  }

  let expire = Date.now() + 5 * 60 * 1000
  await DAD.update({ uuid: _passtokenSource.uuid }, { phone: _passtokenSource.passcodePhone })
  return {
    _state: 'SUCCESS',
    verifyExpireAt: expire,
    phone: _passtokenSource.passcodePhone,
    _passtoken: webtoken.createToken(
      Object.assign(_passtokenSource, {
        phone: _passtokenSource.passcodePhone,
      }),
      wo.envi.tokenKey
    ),
  }
}

DAD.api.verifyPasscodeAndRegcode = async function ({ _passtokenSource, passcode, regcode } = {}) {
  if (_passtokenSource && Date.now() > _passtokenSource.passcodeExpireAt) {
    return { _state: 'PASSCODE_EXPIRED' }
  }
  let aiid = ticCrypto.regcode2aiid(regcode.toLowerCase()) // 我的注册码（=我的邀请人的邀请码）
  if (aiid === null) {
    // 非法的regcode
    return { _state: 'REGCODE_MALFORMED' }
  } else if (aiid > (await DAD.count())) {
    return { _state: 'REGCODE_USER_NOTEXIST' }
  }
  if (/^\d{6}$/.test(passcode) && _passtokenSource.phone === _passtokenSource.passcodePhone) {
    if (ticCrypto.hash(passcode + _passtokenSource.phone + _passtokenSource.uuid) === _passtokenSource.passcodeHash) {
      let expire = Date.now() + 5 * 60 * 1000
      return {
        _state: 'VERIFY_SUCCESS',
        verifyExpireAt: expire,
        _passtoken: webtoken.createToken(
          Object.assign(_passtokenSource, {
            regcode: regcode,
            verifyState: 'VERIFY_SUCCESS',
            verifyExpireAt: expire,
          }),
          wo.envi.tokenKey
        ),
      }
    } else {
      return { _state: 'VERIFY_FAILED' }
    }
  } else {
    return { _state: 'PASSCODE_MALFORMED' }
  }
}

DAD.api.register = DAD.api1.register = async function ({ _passtokenSource, passwordClient, phone, lang, citizen }) {
  wo.log.info(`${__filename} register::::::: _passtokenSource.uuid = ${_passtokenSource.uuid}`)
  wo.log.info(`${__filename} register::::::: passwordClient = ${passwordClient}`)
  if (
    _passtokenSource &&
    _passtokenSource.identifyState === 'NEW_USER' &&
    _passtokenSource.verifyState === 'VERIFY_SUCCESS' &&
    _passtokenSource.verifyExpireAt > Date.now() &&
    phone &&
    phone === _passtokenSource.phone &&
    _passtokenSource.uuid &&
    passwordClient
  ) {
    let passwordServer = ticCrypto.hash(passwordClient + _passtokenSource.uuid)
    let registerTimeUnix = Date.now()

    let pathBTC = ticCrypto.seed2path(registerTimeUnix + _passtokenSource.uuid, { coin: 'BTC' })
    let pathETH = ticCrypto.seed2path(registerTimeUnix + _passtokenSource.uuid, { coin: 'ETH' })
    let coinAddress = {
      BTC: {
        path: pathBTC,
        address: ticCrypto.secword2account(wo.envi.secword, { coin: 'BTC', path: pathBTC }).address,
      },
      ETH: {
        path: pathETH,
        address: ticCrypto.secword2account(wo.envi.secword, { coin: 'ETH', path: pathETH }).address,
      },
    }

    let txReward = wo.Trade.create({
      uuidUser: _passtokenSource.uuid,
      uuidOther: 'SYSTEM',
      txGroup: 'REWARD_TX',
      txType: 'REWARD_REGIST',
      amount: 10 * wo.Trade.getExchangeRate({}),
      amountMining: 10 * wo.Trade.getExchangeRate({}), // 奖金是通过注册行为凭空挖出的
      exchangeRate: wo.Trade.getExchangeRate({}),
      txTime: new Date(registerTimeUnix),
      txTimeUnix: registerTimeUnix,
    })
    txReward.txHash = ticCrypto.hash(wo.tool.sortAndFilterJson({ fields: txReward.constructor.schema.columns, entity: txReward, exclude: ['aiid', 'uuid'] }))

    let user = DAD.create({
      uuid: _passtokenSource.uuid,
      phone: phone,
      passwordServer,
      regcode: _passtokenSource.regcode.toLowerCase(),
      nickname: `----${phone.substr(-4)}`,
      coinAddress,
      whenRegister: new Date(registerTimeUnix),
      registerTimeUnix,
      lang: lang,
      citizen: citizen,
      balance: 10 * wo.Trade.getExchangeRate({}),
      rewardSum: 10 * wo.Trade.getExchangeRate({}),
    })

    let aiidInviter = ticCrypto.regcode2aiid(_passtokenSource.regcode.toLowerCase())
    await torm.getManager().transaction(async (txman) => {
      await txman.save(txReward)
      await txman.save(user)
      if (aiidInviter > 0) {
        await txman.increment(DAD, { aiid: aiidInviter }, 'communityNumber', 1)
      }
    })

    if (user) {
      wo.EventCenter.emit('User.REGISTER_SUCCESS', { uuid: _passtokenSource.uuid })
      return {
        _state: 'REGISTER_SUCCESS',
        onlineUser: await DAD.normalize(user),
        _passtoken: webtoken.createToken(
          {
            uuid: _passtokenSource.uuid,
            phone: phone,
            passwordClient: passwordClient,
            isOnline: 'ONLINE',
            onlineSince: new Date(),
            onlineExpireAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          },
          wo.envi.tokenKey
        ),
      }
    } else {
      wo.EventCenter.emit('User.REGISTER_FAILED')
      return { _state: 'REGISTER_FAILED' }
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.autologin = async function ({ _passtokenSource } = {}) {
  if (_passtokenSource && _passtokenSource.isOnline && _passtokenSource.uuid && _passtokenSource.passwordClient) {
    let passwordServer = ticCrypto.hash(_passtokenSource.passwordClient + _passtokenSource.uuid)
    let onlineUser = await DAD.findOne({ uuid: _passtokenSource.uuid })
    if (onlineUser) {
      if (onlineUser.passwordServer === passwordServer && onlineUser.phone === _passtokenSource.phone) {
        return {
          _state: 'AUTOLOGIN_SUCCESS',
          onlineUser: await DAD.normalize(onlineUser),
          _passtoken: webtoken.createToken(
            {
              uuid: _passtokenSource.uuid,
              phone: _passtokenSource.phone,
              passwordClient: _passtokenSource.passwordClient,
              isOnline: 'ONLINE',
              onlineSince: Date.now(),
              onlineExpireAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
            wo.envi.tokenKey
          ),
        }
      } else {
        return { _state: 'AUTOLOGIN_FAILED_WRONG_PASSWORD' }
      }
    } else {
      return { _state: 'AUTOLOGIN_FAILED_USER_NOT_EXIST' }
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.login = DAD.api1.login = async function ({ passwordClient, phone, _passtokenSource } = {}) {
  if (passwordClient && phone && _passtokenSource && _passtokenSource.uuid) {
    let passwordServer = ticCrypto.hash(passwordClient + _passtokenSource.uuid)
    let onlineUser = await DAD.findOne({ uuid: _passtokenSource.uuid })
    if (onlineUser) {
      if (onlineUser.passwordServer === passwordServer && onlineUser.phone === phone) {
        // 再次检查 phone，也许可以防止用户在一个客户端上修改了手机后，被在另一个客户端上恶意登录？
        return {
          _state: 'LOGIN_SUCCESS',
          onlineUser: await DAD.normalize(onlineUser),
          _passtoken: webtoken.createToken(
            {
              uuid: _passtokenSource.uuid,
              phone: phone,
              passwordClient: passwordClient,
              isOnline: 'ONLINE',
              onlineSince: Date.now(),
              onlineExpireAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
            wo.envi.tokenKey
          ),
        }
      } else {
        return {
          _state: 'LOGIN_FAILED_WRONG_PASSWORD',
        }
      }
    } else {
      return {
        _state: 'LOGIN_FAILED_USER_NOTEXIST',
      }
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.logout = async function ({ _passtokenSource }) {
  // 虽然现在什么也不需要后台操作，但将来也许后台把logout计入日志
  wo.webServerSocket.removeUserSocket(_passtokenSource.uuid)

  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.resetPassword = async function ({ _passtokenSource = {}, phone = '', passwordClient }) {
  if (
    _passtokenSource.identifyState === 'OLD_USER' &&
    _passtokenSource.verifyState === 'VERIFY_SUCCESS' &&
    _passtokenSource.verifyExpireAt > Date.now() &&
    _passtokenSource.phone === phone &&
    _passtokenSource.uuid &&
    passwordClient
  ) {
    await DAD.update({ uuid: _passtokenSource.uuid }, { passwordServer: ticCrypto.hash(passwordClient + _passtokenSource.uuid) })
    let updated = DAD.findOne({ uuid: _passtokenSource.uuid })
    if (updated) {
      return { _state: 'RESET_SUCCESS' }
    } else {
      return { _state: 'RESET_FAILED' }
    }
  } else {
    return { _state: 'INPUT_MALFORMED' }
  }
}

DAD.api.changePassword = async ({ _passtokenSource, passwordClient, passwordNewClient }) => {
  let onlineUser = await DAD.findOne({ uuid: _passtokenSource.uuid })
  if (onlineUser.passwordServer === ticCrypto.hash(passwordClient + _passtokenSource.uuid)) {
    DAD.update({ uuid: _passtokenSource.uuid }, { passwordServer: ticCrypto.hash(passwordNewClient + _passtokenSource.uuid) })
    return {
      _state: 'SUCCESS',
      _passtoken: webtoken.createToken(
        {
          uuid: _passtokenSource.uuid,
          phone: onlineUser.phone,
          passwordClient: passwordNewClient,
          isOnline: 'ONLINE',
          onlineSince: Date.now(),
          onlineExpireAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
        wo.envi.tokenKey
      ),
    }
  }
  return { _state: 'PASSWORD_UNMATCH' }
}

DAD.api.setLang = async function ({ User, _passtokenSource } = {}) {
  if (User && User.lang && _passtokenSource && _passtokenSource.isOnline) {
    await DAD.update({ uuid: _passtokenSource.uuid }, { lang: User.lang })
    let result = DAD.findOne({ uuid: _passtokenSource.uuid })
    return result ? true : false
  }
}

DAD.api.updatePayChannel = async ({ channel, _passtokenSource } = {}) => {
  if (channel && _passtokenSource) {
    let me = await DAD.findOne({ uuid: _passtokenSource.uuid })
    if (!me.payChannel) me.payChannel = {}
    me.payChannel[channel.type] = channel
    await DAD.update({ uuid: _passtokenSource.uuid }, { payChannel: me.payChannel })
    return { _state: 'SUCCESS' }
  }
  return { _state: 'FAILED' }
}

DAD.api.changeNickname = async ({ nickname, _passtokenSource = {} } = {}) => {
  if (nickname && _passtokenSource.uuid) {
    await DAD.update({ uuid: _passtokenSource.uuid }, { nickname })
    return { _state: 'SUCCESS', nickname }
  }
  return { _state: 'FAIL' }
}

DAD.sysapi.getUserArray = async ({ where, take = 10, order = { aiid: 'ASC' }, skip = 0 }) => {
  let [userArray, count] = await DAD.findAndCount({ where, take, order, skip })
  return { _state: 'SUCCESS', userArray, count }
}

DAD.api.getCommunityMembers = async ({ _passtokenSource = {}, order = { registerTimeUnix: 'DESC' }, skip = 0, take = 10 } = {}) => {
  let result = { _state: 'ERROR' }
  if (_passtokenSource.uuid) {
    let me = await DAD.findOne({ uuid: _passtokenSource.uuid })
    let [memberArray, count] = await DAD.findAndCount({ where: { regcode: ticCrypto.aiid2regcode(me.aiid) }, order, skip, take })
    if (Array.isArray(memberArray)) {
      for (let member of memberArray) {
        delete member.aiid
        delete member.passwordServer
      }
      result.memberArray = memberArray
      result.count = count
      result._state = 'SUCCESS'
      return result
    }
  }
  return result
}

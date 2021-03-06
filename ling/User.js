'use strict'
const ticrypto = require('tic-crypto')
const messenger = require('basend-messenger')
const webtoken = require('basend-webtoken')
const i18nCore = require('corend-i18n')
const torm = require('typeorm')

/****************** 类和原型 *****************/
const DAD = (module.exports = class User extends torm.BaseEntity {
  // 构建类
  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: Number, primary: true, generated: true, comment: '这个字段就是为了和mysql等习惯用法兼容，但这个字段本身在本应用里并没有用到。' },
      uuid: { type: String, unique: true, generated: 'uuid' },
      // randomSecword: { type: String, unique: true, nullable: true, comment: '[20220602] 设计这个字段，是给 coinAccount 的生成添加一个随机量，并在返回给客户端时删除掉。' },
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
      coinAccount: { type: 'simple-json', default: '{}' },
      payChannel: { type: 'simple-json', default: '{}', nullable: true },
      coinBalance: { type: 'real', default: 0 },
      rewardSum: { type: 'real', default: 0 },
      depositUsdtSum: { type: 'real', default: 0 },
      depositPexSum: { type: 'real', default: 0 },
      communityNumber: { type: 'int', default: 0 },
      communityNumberKyc: { type: 'int', default: 0 },
      communityRewardSum: { type: 'real', default: 0 },
      json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
    },
  }

  static async normalize (user = {}) {
    user.inviterCode = wo.tool.aiid2regcode(user.aiid) // 我的邀请码 // 只给onlineUser
    // user.communityNumberKyc = await DAD.count({regcode: user.inviterCode, kycStateL1: 'PASSED', kycStateL2: 'PASSED'}) || 0
    delete user.aiid
    // delete user.randomSecword
    delete user.passwordServer
    for (let coin in user.coinAccount) {
      delete user.coinAccount[coin].path
    }
    return user
  }
})

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}
DAD.sysapi = {}

DAD.api.uploadPortrait = async function ({ _passtokenSource } = {}) {
  // receive image by server and update server database
  if (_passtokenSource && _passtokenSource.isOnline) {
    let file = wo._req.file
    if (file && /^image\//.test(file.mimetype)) {
      await DAD.update({ uuid: _passtokenSource.uuid }, { portrait: file.filename })
      return Object.assign(file, { _state: 'SUCCESS' })
    } else {
      return { _state: 'BASEND_FAIL_FILE_NOT_IMAGE' }
    }
  } else {
    return { _state: 'BASEND_FAIL_USER_NOT_ONLINE' }
  }
}
DAD.api.updatePortrait = async ({ _passtokenSource, User: { portrait } = {} } = {}) => {
  if (_passtokenSource && _passtokenSource.isOnline) {
    if (portrait) {
      await DAD.update({ uuid: _passtokenSource.uuid }, { portrait: portrait })
      return { _state: 'SUCCESS' }
    } else {
      return { _state: 'FILE_NOT_EXIST' }
    }
  } else {
    return { _state: 'BASEND_FAIL_USER_NOT_ONLINE' }
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
  //  let user = await DAD.findOneBy({ uuid: option._passtokenSource.uuid })
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
    let user = await DAD.findOneBy({ uuid: User.uuid })
    let inviterAiid = wo.tool.regcode2aiid(user.regcode)
    if (inviterAiid > 0) {
      let inviter = await DAD.findOneBy({ aiid: wo.tool.regcode2aiid(user.regcode) })
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
      txReward.txHash = ticrypto.hash(wo.tool.stringifyOrdered(txReward, { schemaColumns: txReward.constructor.schema.columns, excludeKeys: ['aiid', 'uuid'] }))
      await txman.save(txReward)

      await txman.update(
        DAD,
        { uuid: inviter.uuid },
        {
          coinBalance: inviter.coinBalance + reward,
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
  //  let user = await DAD.findOneBy({ uuid: option._passtokenSource.uuid })
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
  if (phone && i18nCore.validatePhone({ phone })) {
    let user = await DAD.findOneBy({ phone })
    let _state = user ? 'OLD_USER' : 'NEW_USER'
    let uuid = user ? user.uuid : ticrypto.randomUuid()
    return {
      _state,
      uuid,
      _passtoken: webtoken.createToken(
        {
          phone,
          uuid,
          identifyState: _state,
        },
        wo.envar.tokenKey
      ),
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.sendPasscode = async function ({ _passtokenSource, phone, phoneNew, prodev = wo?.env?.prodev } = {}) {
  if (!_passtokenSource.uuid || !_passtokenSource.phone) {
    return { _state: 'PASSTOKEN_INVALID' }
  } else if (_passtokenSource.phone !== phone) {
    return { _state: 'PHONE_MISMATCH_PASSTOKEN' }
  }

  if (phoneNew) {
    // 用户在更换新手机
    if (!i18nCore.validatePhone({ phoneNew })) {
      return { _state: 'NEWPHONE_MALFORMED' }
    } else if (phoneNew === _passtokenSource.phone) {
      return { _state: 'NEWPHONE_EQUAL_OLDPHONE' }
    } else if ((await DAD.count({ phone: phoneNew })) >= 1) {
      return { _state: 'NEWPHONE_EXISTED' }
    }
  }

  const passcode = ticrypto.randomNumber({ length: 6 })
  const passcodePhone = phoneNew || _passtokenSource.phone
  const passcodeHash = ticrypto.hash(passcode + passcodePhone + _passtokenSource.uuid)

  // send SMS
  let sendResult = { _state: 'SMS_SENT_SUCCESS' }
  if (prodev === 'production') {
    // 如果前端是生产环境，或者不是生产环境但强制要求真实发送短信（应当是开发人员要求测试真实短信），就发送，即使后台是开发环境。
    sendResult = await messenger.sendSms({
      phone: passcodePhone,
      vendor: wo.envar.SMS.vendor,
      msgParam: { passcode },
      msgTemplate: wo.envar.SMS[wo.envar.SMS.vendor].TEMPLATE_PASSCODE_SIMPLEST,
    })
  }

  if (sendResult._state === 'SMS_SENT_SUCCESS') {
    let passcodeSentAt = Date.now()
    let passcodeExpireAt = Date.now() + 5 * 60 * 1000
    return {
      _state: 'PASSCODE_SENT',
      passcode: prodev === 'development' && wo.envar.prodev === 'development' ? passcode : undefined, // 如果前端、后台都在开发环境，那么把 passcode 明文返回，方便开发测试。
      passcodeHash,
      passcodePhone,
      passcodeSentAt,
      passcodeExpireAt,
      _passtoken: webtoken.createToken(
        Object.assign(_passtokenSource, {
          passcodeState: 'PASSCODE_SENT',
          passcodePhone,
          passcodeHash,
          passcodeSentAt,
          passcodeExpireAt,
        }),
        wo.envar.tokenKey
      ),
    }
  }
  return { _state: 'PASSCODE_UNSENT', sendResult }
}

DAD.api.verifyPasscodeToChangePhone = async function ({ _passtokenSource, passcode }) {
  if (_passtokenSource && Date.now() > _passtokenSource.passcodeExpireAt) {
    return { _state: 'PASSCODE_EXPIRED' }
  }
  if (!/^\d{6}$/.test(passcode)) {
    return { _state: 'PASSCODE_MALFORMED' }
  }
  if (ticrypto.hash(passcode + _passtokenSource.passcodePhone + _passtokenSource.uuid) !== _passtokenSource.passcodeHash) {
    return { _state: 'VERIFY_FAILED' }
  }

  if (_passtokenSource.phone === _passtokenSource.passcodePhone) {
    return { _state: 'NEWPHONE_EQUAL_OLDPHONE' }
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
      wo.envar.tokenKey
    ),
  }
}

DAD.api.verifyPasscode = async function ({ _passtokenSource, passcode, regcode } = {}) {
  if (_passtokenSource && Date.now() > _passtokenSource.passcodeExpireAt) {
    return { _state: 'PASSCODE_EXPIRED' }
  }
  if (!/^\d{6}$/.test(passcode)) {
    return { _state: 'PASSCODE_MALFORMED' }
  }
  if (_passtokenSource.phone !== _passtokenSource.passcodePhone) {
    return { _state: 'PASSCODE_PHONE_MISMATCH' }
  }
  if (ticrypto.hash(passcode + _passtokenSource.phone + _passtokenSource.uuid) !== _passtokenSource.passcodeHash) {
    return { _state: 'VERIFY_FAILED' }
  }

  if (regcode) {
    // regcode 可以为空，但如果存在，就必须是有效的。
    const aiid = wo.tool.regcode2aiid(regcode.toLowerCase()) // 我的注册码（=我的邀请人的邀请码）
    if (aiid === null) {
      // 非法的regcode
      return { _state: 'REGCODE_MALFORMED' }
    } else if (aiid > (await DAD.count())) {
      return { _state: 'REGCODE_USER_NOTEXIST' }
    }
  }

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
      wo.envar.tokenKey
    ),
  }
}

DAD.api.register = DAD.api1.register = async function ({ _passtokenSource, passwordClient, phone, lang, citizen }) {
  wo.cclog(`${__filename} register::::::: _passtokenSource.uuid = ${_passtokenSource.uuid}`)
  wo.cclog(`${__filename} register::::::: passwordClient = ${passwordClient}`)
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
    const passwordServer = ticrypto.hash(passwordClient + _passtokenSource.uuid)
    //    const randomSecword = ticrypto.randomSecword()
    const registerTimeUnix = Date.now()

    const seed = wo.envar.secwordUser + _passtokenSource.uuid // + randomSecword // 通过 wo.envar.secwordUser 让种子具有既确定又随机的特性
    const pathBTC = ticrypto.seed2path({ seed, coin: 'BTC' })
    const pathETH = ticrypto.seed2path({ seed, coin: 'ETH' })
    const pathTIC = ticrypto.seed2path({ seed, coin: 'TIC' })
    const pathPEX = ticrypto.seed2path({ seed, coin: 'EXT' })
    let coinAccount = {
      BTC: { path: pathBTC, address: ticrypto.secword2address(wo.envar.secwordUser, { coin: 'BTC', path: pathBTC }) },
      ETH: { path: pathETH, address: ticrypto.secword2address(wo.envar.secwordUser, { coin: 'ETH', path: pathETH }) },
      TIC: { path: pathTIC, address: ticrypto.secword2address(wo.envar.secwordUser, { coin: 'TIC', path: pathTIC }) },
      EXT: { path: pathPEX, address: ticrypto.secword2address(wo.envar.secwordUser, { coin: 'EXT', path: pathPEX }) },
    }

    // let txReward = wo.Trade.create({
    //   uuidUser: _passtokenSource.uuid,
    //   uuidOther: 'SYSTEM',
    //   txGroup: 'REWARD_TX',
    //   txType: 'REWARD_REGIST',
    //   amount: 10 * wo.Trade.getExchangeRate({}),
    //   amountMining: 10 * wo.Trade.getExchangeRate({}), // 奖金是通过注册行为凭空挖出的
    //   exchangeRate: wo.Trade.getExchangeRate({}),
    //   txTime: new Date(registerTimeUnix),
    //   txTimeUnix: registerTimeUnix,
    // })
    // txReward.txHash = ticrypto.hash(wo.tool.stringifyOrdered(txReward, { schemaColumns: txReward.constructor.schema.columns, excludeKeys: ['aiid', 'uuid'] }))

    let user = await DAD.save({
      uuid: _passtokenSource.uuid,
      //      randomSecword: randomSecword,
      phone: phone,
      passwordServer,
      regcode: _passtokenSource.regcode?.toLowerCase(),
      nickname: `${_passtokenSource.uuid.slice(-6)}`,
      coinAccount,
      whenRegister: new Date(registerTimeUnix),
      registerTimeUnix,
      lang: lang,
      citizen: citizen,
      //      coinBalance: 10 * wo.Trade.getExchangeRate({}),
      //      rewardSum: 10 * wo.Trade.getExchangeRate({}),
    })

    // let aiidInviter = wo.tool.regcode2aiid(_passtokenSource.regcode.toLowerCase())
    // await torm.getManager().transaction(async (txman) => {
    //   await txman.save(txReward)
    //   await txman.save(user)
    //   if (aiidInviter > 0) {
    //     await txman.increment(DAD, { aiid: aiidInviter }, 'communityNumber', 1)
    //   }
    // })

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
          wo.envar.tokenKey
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
    let passwordServer = ticrypto.hash(_passtokenSource.passwordClient + _passtokenSource.uuid)
    let onlineUser = await DAD.findOneBy({ uuid: _passtokenSource.uuid })
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
            wo.envar.tokenKey
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
    let passwordServer = ticrypto.hash(passwordClient + _passtokenSource.uuid)
    let onlineUser = await DAD.findOneBy({ uuid: _passtokenSource.uuid })
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
            wo.envar.tokenKey
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
  wo.serverWebsocket.removeUserSocket(_passtokenSource.uuid)

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
    await DAD.update({ uuid: _passtokenSource.uuid }, { passwordServer: ticrypto.hash(passwordClient + _passtokenSource.uuid) })
    let updated = DAD.findOneBy({ uuid: _passtokenSource.uuid })
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
  let onlineUser = await DAD.findOneBy({ uuid: _passtokenSource.uuid })
  if (onlineUser.passwordServer === ticrypto.hash(passwordClient + _passtokenSource.uuid)) {
    DAD.update({ uuid: _passtokenSource.uuid }, { passwordServer: ticrypto.hash(passwordNewClient + _passtokenSource.uuid) })
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
        wo.envar.tokenKey
      ),
    }
  }
  return { _state: 'PASSWORD_UNMATCH' }
}

DAD.api.setLang = async function ({ User, _passtokenSource } = {}) {
  if (User && User.lang && _passtokenSource && _passtokenSource.isOnline) {
    await DAD.update({ uuid: _passtokenSource.uuid }, { lang: User.lang })
    let result = DAD.findOneBy({ uuid: _passtokenSource.uuid })
    return result ? true : false
  }
}

DAD.api.updatePayChannel = async ({ channel, _passtokenSource } = {}) => {
  if (channel && _passtokenSource) {
    let me = await DAD.findOneBy({ uuid: _passtokenSource.uuid })
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
    let me = await DAD.findOneBy({ uuid: _passtokenSource.uuid })
    let [memberArray, count] = await DAD.findAndCount({ where: { regcode: wo.tool.aiid2regcode(me.aiid) }, order, skip, take })
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

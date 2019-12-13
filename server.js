'use strict'
const fs = require('fs')
const path = require('path')
const cluster = require('cluster')
const socket = require('socket.io')
global.mylog = require('so.base/Logger.js')({ root: 'data.log', file: 'log.log' })

const i18nText = {
  zhCN: {
    tHeaderConfig: '<<<<<<<< 配置参数 >>>>>>>>',
    tDoneConfigBasic: '基础配置加载成功',
    tDoneConfigCustom: '定制配置加载成功',
    tDoneConfigSecret: '机密配置加载成功',
    tFailConfigBasic: '基础配置加载失败',
    tFailConfigCustom: '定制配置加载失败',
    tFailConfigSecret: '机密配置加载失败',
    tStartConfigCommander: '开始加载命令行参数......',
    tResultConfig: '配置加载完毕',
    tHeaderInit: '<<<<<<<< 初始化 - 单进程 >>>>>>>>',
  },
  enUS: {

  }
}
const locale = 'zhCN'
const localeText = i18nText[locale]

const Config = (function config () {
  mylog.info(localeText.tHeaderConfig)

  // 配置参数（按优先级从低到高）：
  // ConfigBasic: 系统常量（全大写） 以及 默认参数（小写开头驼峰式）
  // ConfigCustom: 用户或应用自定义参数。本文件不应纳入版本管理。
  // ConfigSecret: 机密参数，例如哈希盐，webtoken密钥，等等。本文件绝对不能纳入版本管理。
  // 命令行参数
  const commander = require('commander')
  const deepmerge = require('deepmerge')

  var Config = {}

  // 读取配置文件
  let configFile
  if (fs.existsSync(configFile = path.join(process.cwd(), './ConfigBasic.js'))) {
    Config=require(configFile)
    mylog.info(`${localeText.tDoneConfigBasic} ${configFile}`)
  }else {
    mylog.warn(`${localeText.tFailConfigBasic} ${configFile}`)
  }
  if (fs.existsSync(configFile = path.join(process.cwd(), './ConfigCustom.js'))) { // 如果存在，覆盖掉 ConfigBasic 里的默认参数
    Config=deepmerge(Config, require(configFile)) // 注意，objectMerge后，产生了一个新的对象，而不是在原来的Config里添加
    mylog.info(`${localeText.tDoneConfigCustom} ${configFile}`)
  }else {
    mylog.warn(`${localeText.tFailConfigCustom} ${configFile}`)
  }
  if (fs.existsSync(configFile = path.join(process.cwd(), './ConfigSecret.js'))) { // 如果存在，覆盖掉 ConfigBasic 和 ConfigCustom 里的参数
    Config=deepmerge(Config, require(configFile))
    mylog.info(`${localeText.tDoneConfigSecret} ${configFile}`)
  }else {
    mylog.warn(`${localeText.tFailConfigSecret} ${configFile}`)
  }

  // 载入命令行参数
  mylog.info(`${localeText.tStartConfigCommander}`)
  commander
    .version(Config.VERSION, '-v, --version') // 默认是 -V。如果要 -v，就要加 '-v --version'
    .option('--dbType <type>', 'Database type: mysql|sqlite. Default to ' + Config.dbType)
    .option('--dbName <name>', 'Database name. Default to ' + Config.dbName)
    .option('-e, --env <env>', 'Environment. Default to ' + (Config.env || process.env.NODE_ENV))
    .option('-H, --host <host>', 'Host ip or domain name. Default to ' + Config.host)
    .option('-P, --protocol <protocol>', 'Server protocol: http|https|httpall. Default to ' + Config.protocol)
    .option('-p, --port <port>', 'Server port number. Default to ' + Config.port ? Config.port : '80|443 for http|https')
    .option('--sslType <type>', `SSL provider type: file|greenlock. Default to ${Config.sslType}`)
    .option('--sslCert <cert>', 'SSL certificate file. Default to ' + Config.sslCert)
    .option('--sslKey <key>', 'SSL private key file. Default to ' + Config.sslKey)
    .option('--sslCA <ca>', 'SSL ca bundle file')
    .parse(process.argv)

  // 把命令行参数 合并入配置。
  Config.env = commander.env || Config.env || process.env.NODE_ENV
  if (Config.env === 'production') {
    Config = deepmerge(Config, Config.production)
  }
  delete Config.production

  Config.dbType = commander.dbType || Config.dbType
  Config.dbName = commander.dbName || Config.dbName
  Config.host = commander.host || Config.host || require('so.base/Network.js').getMyIp() // // 本节点的从外部可访问的 IP or Hostname，不能是 127.0.0.1 或 localhost
  Config.protocol = commander.protocol || Config.protocol
  Config.port = parseInt(commander.port) || parseInt(Config.port) || (Config.protocol === 'http' ? 80 : Config.protocol === 'https' ? 443 : undefined) // 端口默认为http 80, https 443, 或80|443(httpall)
  Config.sslType = commander.sslType || Config.sslType
  Config.sslCert = commander.sslCert || Config.sslCert
  Config.sslKey = commander.sslKey || Config.sslKey
  Config.sslCA = commander.sslCA || Config.sslCA

  mylog.info(`${localeText.tResultConfig} Config = ${JSON.stringify(Config)}`)

  return Config
})()

async function initSingle () {
  mylog.info(`${localeText.tHeaderInit}`)

  global.wo = {} // wo 代表 world或‘我’，是当前的命名空间，把各种类都放在这里，防止和其他库的冲突。
  wo.Config = Config
  // wo.Tool=new (require('so.base/Egg.js'))()
  //   .extendMe(require('so.base/Messenger.js'))
  //   .extendMe(require('so.base/Webtoken.js'))
  //   .extendMe(require('so.base/User.js'))

  mylog.info('Initializing database......')
  wo.DataStore = await require('so.data')(wo.Config.dbType)._init(wo.Config.dbName)
//  wo.DataCache = await require('./modules/util/redis.js')({ db: wo.Config.redisIndex })

  let ethNetType='ropsten', timeout=5000
  wo.EtherscanApi = require('etherscan-api').init('胡编乱造的apikey也可以用', ethNetType, timeout) // 测试发现，1）随便编个字符串都可以作为apikey。2）只有访问主网的apikey使用才会被etherscan记录。

  mylog.info('Loading classes and Creating tables......')
  wo.Ling = require('so.ling')

  wo.Fund = await require('./ling/Fund.js')._init(wo.DataStore)
  wo.User = await require('./ling/User.js')._init(wo.DataStore)

  return wo
}

function runServer () { // 配置并启动 Web 服务
  mylog.info('★★★★★★★★ 启动服务 ★★★★★★★★')

  const server = require('express')()
  const webToken = require('so.base/Webtoken')

  const greenlock = (['https', 'httpall'].indexOf(wo.Config.protocol)>=0 && wo.Config.sslType==='greenlock')
    ? require('greenlock-express').create({
        version: 'draft-11',
        server: wo.Config.netType==='devnet' // for test: acme-staging-v02
          ? 'https://acme-staging-v02.api.letsencrypt.org/directory'
          : 'https://acme-v02.api.letsencrypt.org/directory',
        agreeTos: true,
        communityMember: false,
        store: require('greenlock-store-fs'),
        email: 'ssl@faronear.org',
        approvedDomains: wo.Config.sslDomainList,
        configDir: path.resolve(__dirname, 'ssl'),
        app: server,
      }) 
    : null

  /** * 通用中间件 ***/

  server.use(require('morgan')(server.get('env') === 'development' ? 'dev' : 'combined')) // , {stream:require('fs').createWriteStream(path.join(__dirname+'/data.log', 'http.log'), {flags: 'a', defaultEncoding: 'utf8'})})) // format: combined, common, dev, short, tiny.
  server.use(require('method-override')())
  server.use(require('cookie-parser')())
  server.use(require('body-parser').json({ limit: '50mb', extended: true })) // 用于过滤 POST 参数
  server.use(require('cors')())
  server.use(require('compression')())

  server.use(require('express').static(path.join(__dirname, '../log.admin/dist'), { index: 'index.html' })) // 可以指定到 node应用之外的目录上。windows里要把 \ 换成 /。
  // server.use(require('serve-favicon')(path.join(__dirname, 'public', 'favicon.ico')))

  /** * 路由中间件 ***/

  server.all('/:_api/:_who/:_act', async function (ask, reply) { // API 格式：http://address:port/api/Block/getBlockList

    /* 把前端传来的json参数，重新解码成对象 */
    // 要求客户端配合使用 contentType: 'application/json'，即可正确传递数据，不需要做 json2obj 转换。
    var option = { data: {}, _req: ask, _res: reply }
    for (let key in ask.query) { // GET 方法传来的参数
      option[key] = wo.Ling.json2obj(ask.query[key])
    }
    for (let key in ask.body) { // POST 方法传来的参数
      option[key] = ask.headers["content-type"]==='application/json' ? ask.body[key] : wo.Ling.json2obj(ask.body[key])
    }

    /// //////// authentication ///////////////////
    option._passtokenSource = webToken.verifyToken(ask.headers._passtoken, wo.Config.tokenKey) || {}

    reply.setHeader('charset', 'utf-8')
    // reply.setHeader('Access-Control-Allow-Origin', '*') // 用了 Cors中间件，就不需要手工再设置了。
    // reply.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE')
    reply.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type')

    let { _who, _act, _api } = ask.params

    try {
      if (wo[_who] && wo[_who][_api] && wo[_who][_api].hasOwnProperty(_act) && typeof wo[_who][_api][_act] === 'function') {
        var result = await wo[_who][_api][_act](option)
        reply.json(result) // 似乎 json(...) 相当于 send(JSON.stringify(...))。如果json(undefined或nothing)会什么也不输出给前端，可能导致前端默默出错；json(null/NaN/Infinity)会输出null给前端（因为JSON.stringify(NaN/Infinity)返回"null"）。
      } else {
        reply.json({_state:'URL_MALFORMED'})
      }
    } catch (exception) {
      mylog.info(exception)
      reply.json({_state:'EXECUTION_ERROR'})
    }
  })

  server.all('*', function (ask, reply) { /* 错误的API调用进入这里。 */
    reply.json(null)
  })

  // 错误处理中间件应当在路由加载之后才能加载
  if (server.get('env') === 'development') {
    server.use(require('errorhandler')({
      dumpExceptions: true,
      showStack: true
    }))
  }

  /** * 启动 Web 服务 ***/
  let webServer
  let ipv4 = require('so.base/Network.js').getMyIp()
  if (wo.Config.protocol === 'http') { // 如果在本地localhost做开发，就启用 http。注意，从https网页，不能调用http的socket.io。Chrome/Firefox都报错：Mixed Content: The page at 'https://localhost/yuncai/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://localhost:6327/socket.io/?EIO=3&transport=polling&t=LoRcACR'. This request has been blocked; the content must be served over HTTPS.
    webServer = require('http').createServer(server).listen(wo.Config.port, function (err) {
      if (err) mylog.info(err)
      else mylog.info(`Server listening on ${wo.Config.protocol}://${wo.Config.host}:${wo.Config.port} with IPv4=${ipv4} for ${server.settings.env} environment`)
    })
  } else if (wo.Config.protocol === 'https') { // 启用 https。从 http或https 网页访问 https的ticnode/socket 都可以，socket.io 内容也是一致的。
    webServer = require('https').createServer(wo.Config.sslType === 'greenlock' ? greenlock.httpsOptions : {
      key: fs.readFileSync(wo.Config.sslKey),
      cert: fs.readFileSync(wo.Config.sslCert),
      // ca: [ fs.readFileSync(wo.Config.sslCA) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
    }, server).listen(wo.Config.port, function (err) {
      if (err) mylog.info(err)
      else mylog.info(`Server listening on ${wo.Config.protocol}://${wo.Config.host}:${wo.Config.port} for ${server.settings.env} environment`)
    })
  } else if ('httpall' === wo.Config.protocol) {
    let portHttp = wo.Config.port ? wo.Config.port : 80 // 如果port参数已设置，使用它；否则默认为80
    let portHttps = (wo.Config.port && wo.Config.port !== 80) ? wo.Config.port + 443 : 443 // 如果port参数已设置，使用它+443；否则默认为443
    if (wo.Config.sslType === 'greenlock') {
      webServer = greenlock.listen(portHttp, portHttps, function (err) {
        if (err) mylog.info(err)
        else mylog.info(`Server listening on [${wo.Config.protocol}] http=>https://${wo.Config.host}:${portHttp}=>${portHttps} for ${server.settings.env} environment`)
      })
    } else {
      require('http').createServer(server.all('*', function (ask, reply) {
        reply.redirect(`https://${wo.Config.host}:${portHttps}`)
      })).listen(portHttp, function(err) {
        if (err) mylog.info(err)
        else mylog.info(`Server listening on [${wo.Config.protocol}] http://${wo.Config.host}:${portHttp} for ${server.settings.env} environment`)  
      })
      webServer = require('https').createServer({
        key: fs.readFileSync(wo.Config.sslKey),
        cert: fs.readFileSync(wo.Config.sslCert),
        // ca: [ fs.readFileSync(wo.Config.sslCA) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
      }, server).listen(portHttps, function (err) {
        if (err) mylog.info(err)
        else mylog.info(`Server listening on [${wo.Config.protocol}] https://${wo.Config.host}:${portHttps} for ${server.settings.env} environment`)
      })
    }
  }

  // 启动socket服务
  wo.Socket = socket.listen(webServer) // [todo]: 如果同时启动了 http 和 https 服务，那就需要开两个socket服务？
  wo.Socket.sockets.on('connection', (socket) => {
    mylog.info('New Client Connected')
    socket.on('call', async (data, echo) => {
      if (data.who && data.act && echo && typeof echo === 'function') {
        if (wo[data.who] && wo[data.who]['api'] && wo[data.who]['api'][data.act] && typeof wo[data.who]['api'][data.act] === 'function') {
          let res = await wo[data.who]['api'][data.act](data.param)
          return echo(res)
        } else echo({ error: 'Invalid API' })
      }
    })
  })

  return webServer
}

(async function start () {
    await initSingle()
    runServer()
})()

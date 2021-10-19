'use strict'
const fs = require('fs')
const path = require('path')
const torm = require('typeorm')
const ipfs = require('ipfs-core')

const wo = (global.wo = {}) // 代表 world或‘我’，是全局的命名空间，把各种类都放在这里，防止和其他库的冲突。

function configEnvironment () {
  wo.envi = require('base.enviconfig').mergeConfig()

  if (typeof wo.envi.ssl === 'string') wo.envi.ssl = eval(`(${wo.envi.ssl})`)
  if (typeof wo.envi.datastore === 'string') wo.envi.datastore = eval(`(${wo.envi.datastore})`) // 用 eval 代替 JSON.parse，使得可接受简化的JSON字符串
  if (!wo.envi.datastore.type) wo.envi.datastore.type = 'sqlite' // 默认为 sqlite
}

async function initWorld () {
  wo.log = require('base.logger')(wo.envi.logstore)
  wo.tool = require('core.tool')

  wo.log.info('Loading classes ......')

  wo.EventCenter = new (require('events'))()

  wo.IPFS = await ipfs.create() // 不能在每次使用 ipfs 时重复创建，那样会导致 “ipfs LockExistsError: Lock already being held for file ～/.ipfs/repo.lock”

  wo.System = require('./ling/System.js')
  wo.NFT = await require('./ling/NFT.js')
  wo.User = require('./ling/User.js')

  wo.log.info(`Initializing datastore ${JSON.stringify(wo.envi.datastore)} ......`)
  await torm.createConnection(
    Object.assign(wo.envi.datastore, {
      entities: [new torm.EntitySchema(wo.NFT.schema), new torm.EntitySchema(wo.User.schema)],
      synchronize: true, // wo.envi.prodev !== 'production' ? true : false,
    })
  )

  return wo
}

function runServer () {
  // 配置并启动 Web 服务
  wo.log.info('★★★★★★★★ 启动服务 ★★★★★★★★')

  const server = require('express')()
  const webtoken = require('base.webtoken')

  /** * 通用中间件 ***/

  server.use(require('morgan')(wo.envi.prodev === 'development' ? 'dev' : 'combined')) // , {stream:require('fs').createWriteStream(path.join(__dirname+'/logbase', 'http.log'), {flags: 'a', defaultEncoding: 'utf8'})})) // format: combined, common, dev, short, tiny.
  server.use(require('method-override')())
  server.use(require('cors')())
  server.use(require('compression')())
  server.use(require('cookie-parser')())
  server.use(require('body-parser').json({ limit: '50mb', extended: true })) // 用于过滤 POST 参数
  // server.use(require('serve-favicon')(path.join(__dirname, 'public', 'favicon.ico')))

  const Multer = require('multer')
  server.use(
    Multer({
      // dest:'./File/', // 这样，不能自定义文件名。
      storage: Multer.diskStorage({
        destination: function (req, file, cb) {
          // 如果直接提供字符串，Multer会负责创建该目录。如果提供函数，你要负责确保该目录存在。
          const folder = wo.envi.uploadroot // 目录是相对于本应用的入口js的，即相对于 server.js 的位置。
          cb(null, folder)
        },
        filename: function (req, file, cb) {
          // 注意，req.body 也许还没有信息，因为这取决于客户端发送body和file的顺序。
          const fileNameExtension = path.extname(file.originalname)
          const _passtokenSource = webtoken.verifyToken(req.headers._passtoken, wo.envi.tokenKey) || {}
          const filename = `${_passtokenSource.uuid}_${Date.now()}${fileNameExtension}`
          cb(null, filename)
        },
      }),
      // fileFilter:function(req, file, cb) {},
      limits: { fileSize: 10485760 },
    }).single('file')
  )
  server.use(path.join('/', wo.envi.uploadroot).replace('\\', '/'), require('express').static(path.join(__dirname, wo.envi.uploadroot).replace('\\', '/'), { index: 'index.html' })) // 可以指定到 node应用之外的目录上。windows里要把 \ 换成 /。


  /** * 路由中间件 ***/

  server.all('/:apiVersion/:apiWho/:apiTodo', async function (req, res) {
    // API 格式：http://address:port/api/Block/getBlockList

    /* 把前端传来的json参数，重新解码成对象 */
    // 要求客户端配合使用 contentType: 'application/json'，即可正确传递数据，不需要做 json2obj 转换。
    const indata = { _passtokenSource: webtoken.verifyToken(req.headers._passtoken, wo.envi.tokenKey) || {} } // todo: 考虑把参数放入 { indata: {} }
    for (const key in req.query) {
      // GET 方法传来的参数.
      indata[key] = wo.tool.parseJsonPossible(req.query[key])
    }
    for (const key in req.body) {
      // POST 方法传来的参数. content-type=application/x-www-form-urlencoded 或 application/json 或 multipart/form-data（由 multer 处理）
      indata[key] = req.headers['content-type'] === 'application/json' ? req.body[key] : wo.tool.parseJsonPossible(req.body[key])
    }
    const { apiVersion, apiWho, apiTodo } = req.params
    console.info(`👇 ${apiVersion}/${apiWho}/${apiTodo} 👇 `, indata, ' 👇 👇')

    wo._req = req
    wo._res = res
    
    res.setHeader('charset', 'utf-8')
    // res.setHeader('Access-Control-Allow-Origin', '*') // 用了 Cors中间件，就不需要手工再设置了。
    // res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type')

    if (typeof wo[apiWho]?.[apiVersion]?.[apiTodo] === 'function' && wo[apiWho][apiVersion].hasOwnProperty(apiTodo)) {
      try {
        const outdata = await wo[apiWho][apiVersion][apiTodo](indata)
        console.info(`👆 ${apiVersion}/${apiWho}/${apiTodo} 👆 `, outdata, ' 👆 👆')
        res.json(outdata) // 似乎 json(...) 相当于 send(JSON.stringify(...))。如果json(undefined或nothing)会什么也不输出给前端，可能导致前端默默出错；json(null/NaN/Infinity)会输出null给前端（因为JSON.stringify(NaN/Infinity)返回"null"）。
      } catch (exception) {
        wo.log.info(exception)
        res.json({ _state: 'BACKEND_EXCEPTION' })
      }
    } else {
      res.json({ _state: 'BACKEND_API_UNKNOWN' })
    }
  })

  server.all('*', function (req, res) {
    /* 错误的API调用进入这里。 */ res.json({ _state: 'BACKEND_API_MALFORMED' })
  })

  // 错误处理中间件应当在路由加载之后才能加载
  if (wo.envi.prodev === 'development') {
    server.use(
      require('errorhandler')({
        dumpExceptions: true,
        showStack: true,
      })
    )
  }

  /** * 启动 Web 服务 ***/
  let webServer
  let portHttp = wo.envi.port || 80
  let portHttps = wo.envi.port || 443
  let ipv4 = require('base.nettool').getMyIp()
  if (wo.envi.protocol === 'http') {
    // 如果在本地localhost做开发，就启用 http。注意，从https网页，不能调用http的socket.io。Chrome/Firefox都报错：Mixed Content: The page at 'https://localhost/yuncai/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://localhost:6327/socket.io/?EIO=3&transport=polling&t=LoRcACR'. This request has been blocked; the content must be served over HTTPS.
    webServer = require('http')
      .createServer(server)
      .listen(portHttp, function (err) {
        if (err) wo.log.info(err)
        else wo.log.info(`Web Server listening on ${wo.envi.protocol}://${wo.envi.host}:${portHttp} with IPv4=${ipv4} for ${wo.envi.prodev} environment`)
      })
  } else if (wo.envi.protocol === 'https') {
    // 启用 https。从 http或https 网页访问 https的ticnode/socket 都可以，socket.io 内容也是一致的。
    webServer = require('https')
      .createServer(
        {
          key: fs.readFileSync(wo.envi.ssl.file.key),
          cert: fs.readFileSync(wo.envi.ssl.file.cert),
          // ca: [ fs.readFileSync(wo.envi.ssl.file.ca) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
        },
        server
      )
      .listen(portHttps, function (err) {
        if (err) wo.log.info(err)
        else wo.log.info(`Web Server listening on ${wo.envi.protocol}://${wo.envi.host}:${portHttps} for ${wo.envi.prodev} environment`)
      })
  } else if ('httpall' === wo.envi.protocol) {
    portHttp = 80

    require('http')
      .createServer(
        server.all('*', function (ask, reply) {
          reply.redirect(`https://${wo.envi.host}:${portHttps}`)
        })
      )
      .listen(portHttp, function (err) {
        if (err) wo.log.info(err)
        else wo.log.info(`Web Server listening on [${wo.envi.protocol}] http://${wo.envi.host}:${portHttp} for ${wo.envi.prodev} environment`)
      })
    webServer = require('https')
      .createServer(
        {
          key: fs.readFileSync(wo.envi.ssl.file.key),
          cert: fs.readFileSync(wo.envi.ssl.file.cert),
          // ca: [ fs.readFileSync(wo.envi.ssl.file.ca) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
        },
        server
      )
      .listen(portHttps, function (err) {
        if (err) wo.log.info(err)
        else wo.log.info(`Web Server listening on [${wo.envi.protocol}] https://${wo.envi.host}:${portHttps} for ${wo.envi.prodev} environment`)
      })
  }

  // 启动socket服务
  wo.serverWebsocket = require('base.websocket.server').initSocket(webServer)

  return webServer
}

;(async function start() {
  configEnvironment()
  await initWorld()
  runServer()
})()

const WebSocket = require('ws')
const webToken = require('so.base/Webtoken')

const my = {
  appSocketServer: undefined,
  socketPool: {},
  listeners: {}
}

module.exports = {
  initSocket (webServer) {
    my.appSocketServer = new WebSocket.Server({ server: webServer })
    console.info('App Socket Server attached to web server.')

    my.appSocketServer.on('connection', (socket, req) => {
      console.info(
        `A socket from App Client is connected from ${req.connection.remoteAddress}:${req.connection.remotePort}.`
      )

      // socket.isAlive = true
      // socket.on('pong', function() { console.log('👈 ASS: on Pong'); this.isAlive = true })

      socket.on('message', data => {
        // 在这里统一分发消息
        console.log('App Socket Client message: ', data)
        let dataObj
        try {
          dataObj = JSON.parse(data)
        } catch (exception) {
          console.log(
            new Date().toJSON(),
            'Unable to parse socket message: ',
            data
          )
          return
        }
        if (dataObj.skevent === 'SOCKET_OWNER') {
          dataObj._passtokenSource = webToken.verifyToken(
            dataObj._passtoken,
            wo.Config.tokenKey
          ) // todo: 为防止前端欺骗，应当用和login里类似的方法来检查来检查
          my.socketPool[dataObj._passtokenSource.uuid] = socket
          console.log(
            '收到Login 成功的消息，绑定socket',
            Object.keys(my.socketPool)
          )

          //          this.sendToOne({skevent:'ws/Exchange/paintedWolf', info:'launch to mars'}, dataObj._passtokenSource.uuid)
        }

        const listeners = my.listeners[dataObj.skevent] || []
        for (const listener of listeners) {
          listener(dataObj)
        }
      })
    })

    return my.appSocketServer
  },

  removeUserSocket (uuid) {
    delete my.socketPool[uuid]
  },

  addListener (skevent, listener) {
    if (
      Array.isArray(my.listeners[skevent]) &&
      typeof listener === 'function'
    ) {
      my.listeners[skevent].push(listener)
    } else {
      my.listeners[skevent] = [listener]
    }
    return this
  },

  sendToAll (dataObj) {
    my.appSocketServer.clients.forEach(socket => {
      if (socket.readyState === socket.OPEN) {
        socket.send(
          typeof dataObj !== 'string' ? JSON.stringify(dataObj) : dataObj
        )
      } else {
        delete my.socketPool[socket.uuid]
      }
    })
  },

  sendToOne (dataObj, uuid) {
    const socket = my.socketPool[uuid]
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(
        typeof dataObj !== 'string' ? JSON.stringify(dataObj) : dataObj
      )
    } else {
      delete my.socketPool[uuid]
    }
  }
}

// todo: 前端断线重连时，并不会再次 login_success。也许在前端的initSocket时，应当把_passtoken送过来，而后台则对_passtoken做验证后再加socketPool。

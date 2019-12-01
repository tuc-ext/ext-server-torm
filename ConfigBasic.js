'use strict'

const LOG_PORT_STANDARD = 60564

module.exports = { // 全大写字母的，代表系统常量，不要在 userConfig 或命令行参数里覆盖。小写驼峰的，是用户可以覆盖的。
  protocol: 'http', // http|https|httpall
  host: null, // 本节点的从外部可访问的 IP or Hostname，用于告知邻居节点怎样连接本机。因此不能是 127.0.0.1 或 localhost
  port: LOG_PORT_STANDARD, // 本节点的 Web服务端口号
  sslType: 'file', // file|greenlock
  sslDomainList: [],
  sslKey: 'ssl/privkey.pem', // ssl key file,
  sslCert: 'ssl/fullchain.pem', // ssl cert file,
  sslCA: 'ssl/client-cert.pem', // ssl ca file,
  tasking: 'single', // single|cluster: 单进程或多进程
  // 数据库设置
  dbType: 'sqlite',
  dbName: 'data.sqlite/log.sqlite',

  /* 数据库，HTTP 等设置（与时光链本身无关） */
  HTTP_BODY_LIMIT: '50mb',
  UPLOAD_LIMIT: 1048576, // 单位: Byte。
  SESSION_LIFETIME: 60 * 60 * 24 * 7, // 一星期
  // todo: 改名为 DB_*
  LIMIT_DEFAULT: 12,
  LIMIT_MAX: 1000,
  MARK_DELETED: 'MARK_DELETED',
  MARK_LINKED: 'MARK_LINKED', // 建立了关系（care, know, join 等）
  MARK_RELEASED: 'MARK_RELEASED', // 解除了关系（care, know, join 等）
}

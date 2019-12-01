module.exports = {
  // 如果使用 https 协议，并且ssl证书存放在其他地方：
  /* 注意，浏览器认识，但我们自己的后台，比如 钱包后台wallet.server，不认识 letsencrypt 提供的 ssl证书。
  解决办法：  https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs
  简单的解法：  https://www.npmjs.com/package/ssl-root-cas
  sslCert 不要使用 cert.pem，而使用 fullchain.pem, 把所有中间证书都带上，即可！
  */
//  sslType: 'file',
//  sslDomainList: [],
//  sslKey: 'ssl/privkey.pem', // ssl key file such as /etc/letsencrypt/live/.../privkey.pem
//  sslCert: 'ssl/fullchain.pem', // ssl cert file such as /etc/letsencrypt/live/.../fullchain.pem
//  sslCA: 'client-cert.pem', // ssl ca file such as /etc/letsencrypt/live/.../client-cert.pem  // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
}

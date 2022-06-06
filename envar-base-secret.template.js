/****************************************************************
 *  ！！！机密配置！！！
 * 只能在部署时出现，严禁存入GIT库，严禁在网络上传送，严禁公开！
 **/

module.exports = {
  tokenKey: '',
  secwordAgent: '',
  secwordUser: '',
  SMS: {
    vendor: '',
    DXTON: {
      urlChina: 'http://sms.106jiekou.com/utf8/sms.aspx?account=       &password=      ',
      urlWorld: 'http://sms.106jiekou.com/utf8/worldapi.aspx?account=       &password=      ',
    },
    UNICLOUD: {
      appid: '',
      smsSecret: '',
      smsKey: '',
      TEMPLATE_PASSCODE_SIMPLEST: '',
    },
    ALIYUN: {
      signName: '',
      accessKeyId: '',
      secretAccessKey: '',
      TEMPLATE_PASSCODE_SIMPLEST: '',
    },
    TENCENT: {
      // https://cloud.tencent.com/document/product/382/43197
      appid: '',
      signName: '',
      TEMPLATE_PASSCODE_SIMPLEST: '',
      credential: {
        /* 必填：腾讯云账户密钥对secretId，secretKey。
         * 这里采用的是从环境变量读取的方式，需要在环境变量中先设置这两个值。
         * 你也可以直接在代码中写死密钥对，但是小心不要将代码复制、上传或者分享给他人，
         * 以免泄露密钥对危及你的财产安全。
         * SecretId、SecretKey 查询: https://console.cloud.tencent.com/cam/capi */
        secretId: process.env.secretId,
        secretKey: process.env.secretKey,
      },
      /* 必填：地域信息，可以直接填写字符串ap-guangzhou，支持的地域列表参考 https://cloud.tencent.com/document/api/382/52071#.E5.9C.B0.E5.9F.9F.E5.88.97.E8.A1.A8 */
      region: 'ap-nanjing', // ap-beijing, ap-nanjing, ap-guangzhou
      /* 非必填:
       * 客户端配置对象，可以指定超时时间等配置 */
      profile: {
        /* SDK默认用TC3-HMAC-SHA256进行签名，非必要请不要修改这个字段 */
        signMethod: 'HmacSHA256',
        httpProfile: {
          /* SDK默认使用POST方法。
           * 如果你一定要使用GET方法，可以在这里设置。GET方法无法处理一些较大的请求 */
          reqMethod: 'POST',
          /* SDK有默认的超时时间，非必要请不要进行调整
           * 如有需要请在代码中查阅以获取最新的默认值 */
          reqTimeout: 30,
          /**
           * 指定接入地域域名，默认就近地域接入域名为 sms.tencentcloudapi.com ，也支持指定地域域名访问，例如广州地域的域名为 sms.ap-guangzhou.tencentcloudapi.com
           */
          endpoint: 'sms.tencentcloudapi.com',
        },
      },
    },
  },
}

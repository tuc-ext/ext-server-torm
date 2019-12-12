const { inject } = require('../framework/Provider');
const { verifyToken, createToken } = require('@utils/jwt');
const crypto = require('@utils/crypto');

module.exports = {
    auth: inject(function (SysConfig) {
        const { JWT_SECRET } = SysConfig;
        const ignoreToken = [];
        if (!SysConfig.LIMITSALT) mylog.error('缺少限流密钥');
        return async (req, res, next) => {
            const token = req.headers.token;
            if (ignoreToken.includes(req.path)) {
                const { sig, ts } = req.headers;
                const salt = SysConfig.LIMITSALT;
                const my = crypto.hash(ts + req.path + salt, { hasher: 'md5' });
                const invalid = sig !== my || Date.now() - ts > 5000;
                if (invalid) {
                    return res.status(408).send('timeout');
                }
            }
            if (!ignoreToken.includes(req.path)) {
                if (token) {
                    const deToken = await verifyToken(token, JWT_SECRET);
                    if (deToken) {
                        res.locals.user = deToken.data;
                        // 换发新token，存在问题：如果上一个token没过期，其他人截获了的话，会不会被盗用？
                        res.set('token', createToken({
                            userId: deToken.data.userId
                        }, JWT_SECRET, {}));
                        return next();
                    }
                }
                return res.status(403).send('unauthorized');
            } else {
                next();
            }
        };
    })
};

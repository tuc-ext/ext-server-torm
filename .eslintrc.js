module.exports = {
  'env': {
    'browser': true,
    'node': true,
    'commonjs': true,
    'es6': true
  },
  'parserOptions': {
    'ecmaVersion': 2018,
    'sourceType': 'module'
  },
  'extends': 'standard',
  "globals": {
    "wo": true,
    "mylog": false,
  },
  "rules": {
    "no-return-await": "off",
    "comma-dangle": "off"
  }
}

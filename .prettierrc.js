/* 
对 VSCode Prettier 有效；建议一直要有本配置文件，否则不同版本的 Prettier 的默认配置会不同，例如 TrailingComma
对 VSCode Prettier Standard 无效，似乎是集成了不能修改的配置。
*/
module.exports = {
  printWidth: 160, // default 80
  tabWidth: 2, // default 2
  useTabs: false,
  semi: false, // default true
  singleQuote: true, // default false
  trailingComma: 'es5', // none (default in v 1.*), es5 (default in v2.0.0), all
  bracketSpacing: true, // default true
  jsxBracketSameLine: false, // default false
  arrowParens: 'always', // avoid (default in v1.9.0), always (default since v2.0.0)
  quoteProps: 'as-needed', // as-needed (default), consistent, preserve
}

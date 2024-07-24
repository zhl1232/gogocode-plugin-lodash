const rules = require('./rules/index');

/**
 * 转换入口导出一个函数，按照如下函数签名
 * @param {*} fileInfo 包含 source 和 path 属性
 * @param {*} api 包含 gogocode 作为转换工具
 * @param {*} options 其他 option 由此传入
 * @returns {string} 返回转换后的代码
 */
module.exports = function (fileInfo, api, options) {
  const sourceCode = fileInfo.source;
  const $ = api.gogocode;
  if (
    !/\.vue$|\.js$|\.ts$/.test(fileInfo.path) ||
    /node_modules/.test(fileInfo.path)
  ) {
    return sourceCode;
  }
  const isSFC = /\.vue$/.test(fileInfo.path);

  // 根据不同的文件获取对应的 ast
  let ast;
  let sfcAst;
  if (isSFC) {
    sfcAst = $(sourceCode, { parseOptions: { language: 'vue' } });
    ast = sfcAst.find('<script></script>');
    if (!ast[0]) {
      // 兼容 setup
      ast = sfcAst.find('<script setup></script>');
    }
  } else {
    ast = $(sourceCode);
  }
  // 如果有全局引用，先删除
  ast.replace(`import _ from 'lodash'`, '').generate();
  // 如果有 import 引用，替换成 lodash-es
  ast
    .replace(`import {$$$} from 'lodash'`, `import {$$$} from 'lodash-es';`)
    .generate();

  // 替换文件里的 _.xx 为 import { xx } from 'lodash-es'
  const fns = ast.find('_.$_$0');
  const lodashKey = new Set();
  fns.each((fnNode) => {
    const fnName = fnNode.match[0][0].value;
    lodashKey.add(fnName);
  });
  if (lodashKey.size) {
    const keysString = [...lodashKey].join(', ');

    const importString = `import { ${keysString} } from 'lodash-es'; `;
    ast.prepend(importString);
  }
  ast.replace('_.$_$0', '$_$').generate();
  return isSFC ? sfcAst.root().generate() : ast.generate();
};

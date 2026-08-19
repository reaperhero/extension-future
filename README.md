# Futures Contracts 浏览器插件

一个基于 Chrome/Edge Manifest V3 的浏览器插件，用于在浏览器工具栏里查看期货合约的实时行情。

## 功能

- 展示默认期货合约行情
- 从新浪期货行情接口拉取实时价格
- 展示最新价、涨跌额、涨跌幅和更新时间
- 行情数据保存到浏览器本地存储
- 使用浏览器工具栏 badge 展示首个合约的涨跌幅

## 项目结构

- [manifest.json](/Users/edy/github/futuresContracts/manifest.json)：插件声明
- [background.js](/Users/edy/github/futuresContracts/background.js)：后台刷新、badge 更新、消息处理
- [popup.html](/Users/edy/github/futuresContracts/popup.html)：弹出面板结构
- [popup.css](/Users/edy/github/futuresContracts/popup.css)：弹出面板样式
- [popup.js](/Users/edy/github/futuresContracts/popup.js)：交互逻辑和渲染
- [lib/sina.js](/Users/edy/github/futuresContracts/lib/sina.js)：行情请求和解析逻辑
- [lib/storage.js](/Users/edy/github/futuresContracts/lib/storage.js)：本地存储读写
- [rules/header-rules.json](/Users/edy/github/futuresContracts/rules/header-rules.json)：为新浪接口请求补充 `Referer/Origin`

## 安装方式

1. 打开 Chrome 或 Edge。
2. 进入扩展管理页：
   - Chrome：`chrome://extensions`
   - Edge：`edge://extensions`
3. 打开“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择当前项目目录 [futuresContracts](/Users/edy/github/futuresContracts)。

## 使用方式

1. 点击浏览器工具栏里的插件图标。
2. 弹窗会直接展示默认合约行情。
3. 插件会自动刷新行情，也可以手动点击“刷新”。

## 数据来源说明

- 默认使用新浪期货行情接口 `hq.sinajs.cn`
- 由于该接口对请求头有限制，插件使用 `declarativeNetRequest` 为请求补充 `Referer` 和 `Origin`
- 如果某个合约代码已经过期，接口会返回空行情，插件会直接显示错误信息

## 开发与验证

这个项目不依赖构建工具，修改文件后在扩展管理页点击“重新加载”即可。

建议至少做这几项手动验证：

- 刷新按钮能触发重新拉取
- 首个合约的涨跌幅会同步到浏览器工具栏 badge

## 历史说明

这个仓库最初是一个 macOS 菜单栏 Go 小工具，当前已改造成浏览器插件。原有 Go 代码仍保留在仓库中，便于对照原始业务逻辑，但插件运行不再依赖 Go 环境。

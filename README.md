# 免疫术语与细胞知识图谱

交互式免疫学术语、细胞图谱与证据化知识网络。

## 本地开发

```bash
npm ci
npm run dev
```

默认访问 `http://localhost:5173`。

## 数据与构建

```bash
npm run graph:build
npm run build
npm start
```

`npm start` 使用 Node 适配器运行 Vinext 生成的 Worker，默认监听 `0.0.0.0:3000`。mainland 生产环境明确读取版本化 JSON 快照；D1 表结构仅作为未来可选扩展。

## mainland 部署

- 生产域名：`https://cells.shawlab.top`
- 服务目录：`~/apps/cells`
- 容器端口：`127.0.0.1:28100`
- 部署命令：`bash ~/apps/cells/deploy-mainland.sh main`
- 容器构建默认使用 `registry.npmmirror.com`；可通过 `NPM_REGISTRY` 覆盖，依赖版本仍由 `package-lock.json` 锁定。
- 自动更新：mainland 上的 `cells-update.timer` 每五分钟读取 GitHub `main` 的提交 SHA；发现新版本后，从 GitHub 官方 codeload 下载该提交的不可变源码包，再进行 Docker 构建、启动和健康检查。网络请求带有限重试，不依赖不稳定的 Git smart-HTTP 长连接。

GitHub Actions 负责验证数据生成结果和生产构建；实际发布由 mainland 主动拉取完成，因此不需要把 mainland 私钥存入 GitHub。

## 内容边界

- 不把释义文本中的词语共现当作知识关系。
- 关系边必须来自原始数据、本体或明确的专家策展。
- 图像统一来自 Bioicons，并区分精确图示、家族共享图示和代表性图示。

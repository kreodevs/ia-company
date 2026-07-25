<div align="center">

# Auto Company Platform

**多租户 AI 代理公司平台** — Office 协调、可视化工作流、PostgreSQL 共识记忆、按需或定时执行。

由 **[Kreo Devs](https://github.com/kreodevs)** 维护 · [`ia-company`](https://github.com/kreodevs/ia-company)

[![English README](https://img.shields.io/badge/README-English-2f3640.svg)](README.md)

</div>

---

完整文档见 **[README.md](README.md)**（英文与西班牙文混合，以 v2 平台为准）。

本仓库是 **Auto Company Platform (v2)**，不是原版 CLI 24/7 循环。快速开始：

```bash
cp .env.example .env
npm install && npx prisma migrate dev && npm run db:seed
npm run dev && npm run worker && npm run dev:frontend
```

访问 `/setup` 创建超级管理员，然后在 `/office` 开始使用。

**致谢：** 灵感来自 [MaxMiksa/Auto-Company](https://github.com/MaxMiksa/Auto-Company)（Zheyuan Kong）。本平台由 Kreo Devs 独立实现。

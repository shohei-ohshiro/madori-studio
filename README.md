# madori-studio

`~/shohei_try/.tooling/new-app.sh` で scaffold した Next.js 14 + TypeScript + Tailwind プロジェクト。

## 開発

> Node 18.17+ 必須（`.nvmrc` で 20.20.2 を指定済）

```bash
nvm use
npm install
npm run dev          # http://localhost:3000
```

## 公開

- GitHub: https://github.com/shohei-ohshiro/madori-studio
- Vercel: `main` ブランチ push で自動デプロイ

## スタック

- Next.js 14（App Router）
- TypeScript / Tailwind CSS
- ホスティング: Vercel

## 規約

- `.claude/` `data/pdf/` `.env*.local` は git/vercel 配布から除外
- env は Vercel ダッシュボードか `vercel env add` で設定（コミット禁止）

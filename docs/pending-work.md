# 夜間自動継続の作業指示書（2026-07-04 02:50 JST 実行予定）

✅ 実行済み 2026-07-04 02:53

## 現状

v3「3Dファースト」改修をデプロイ済み（コミット済み・本番動作中）。
- Editor3D.tsx: 永続カメラ＋シーン、右カタログD&D、3D内選択/ドラッグ移動、サイドバー属性パネル
- builders.ts: 家具の形状ビルダー（色替え対応）
- レビューエージェントによる指摘が `docs/review-findings.md` に保存されている（無い場合は自分でレビューする）

## やること（優先順）

1. `docs/review-findings.md` があれば読み、CONFIRMEDの指摘をすべて修正する。PLAUSIBLEはコードで裏取りできたものだけ修正。
2. 無い場合は Editor3D.tsx / builders.ts を自分でレビューし、以下の観点の実バグを修正:
   - Three.jsリソースのdispose漏れ（rebuild()はgeometryのみdisposeしていてmaterialが漏れている疑い。PointLightの扱いも確認）
   - Box3Helper（選択ハイライト）の破棄漏れ
   - タッチ端末対応（HTML5 drag&dropはタッチ不可→タップ追加フォールバックが正しく動くか。pointerdownでのドラッグ移動がタッチで動くか、touch-action CSSが必要では）
   - オブジェクトドラッグとOrbitControlsの競合（controls.enabled切替のタイミング）
   - ドロップ位置の座標計算（rendererのrectとスクロールの関係）
3. 修正後、必ず `npm run build` が通ることを確認する（node 20系）。**ビルドが通らない状態でpushしない**。通らない場合は修正を諦めてrevertし、状況を docs/night-report.md に書く。
4. 完了内容を docs/night-report.md に記録（何を直したか・見送ったか・人間が朝確認すべきこと）。
5. この pending-work.md の冒頭に「✅ 実行済み YYYY-MM-DD HH:MM」を追記。
6. すべてコミットして main に push（メッセージ: `夜間自動継続: レビュー反映と修正`。rejectされたら `git pull --rebase` して再push）。

## 制約

- 新機能は追加しない（修正のみ）。UI文言の微修正は可。
- VISIONは pose-tracer の VISION.md（Why: 子どもの『できた！』を増やす）と間取りスタジオの用途（LUNAコース設計・家設計）。判断に迷ったら安全側（修正しない）に倒す。

import Studio from "@/components/Studio";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">🏠 間取りスタジオ</h1>
        <p className="mt-2 text-sm text-slate-600">
          登録不要・無料。部屋を描いて家具を置いたら「3Dで見る」——引っ越しや模様替えの
          レイアウト検討がブラウザだけで完結します。データは端末に自動保存されます。
        </p>
      </header>

      <Studio />

      <section className="prose prose-slate mt-14 max-w-none prose-h2:text-lg">
        <h2>間取りスタジオでできること</h2>
        <ul>
          <li>
            <strong>間取り作成（2D）</strong>: 部屋を追加してドラッグとリサイズで自由に配置。リビング・寝室など名前も付けられます。
          </li>
          <li>
            <strong>家具の配置</strong>: ベッド・ソファ・テーブルなど実寸ベースの家具を置いて、動線や余白を確認。
          </li>
          <li>
            <strong>3Dシミュレーション</strong>: ワンクリックで立体表示。ぐるっと回して部屋の広さや家具のボリューム感を体感できます。
          </li>
          <li>
            <strong>保存と持ち出し</strong>: 端末に自動保存。JSON書き出しでバックアップも。
          </li>
        </ul>
        <h2>こんな時に</h2>
        <ul>
          <li>引っ越し先に手持ちの家具が収まるか確かめたい</li>
          <li>模様替えの前に、動かす価値があるか3Dで見てみたい</li>
          <li>新しいベッドやソファを買う前に、圧迫感をチェックしたい</li>
        </ul>
        <p className="text-xs text-slate-400">
          © 2026 間取りスタジオ ｜ 本ツールの寸法・表示は簡易シミュレーションです。実際の施工・購入判断は実測をおすすめします。
        </p>
      </section>
    </main>
  );
}

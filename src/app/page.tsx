import Studio from "@/components/Studio";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">🏠 間取りスタジオ</h1>
        <p className="mt-2 text-sm text-slate-600">
          登録不要・無料の3D部屋づくりツール。右のカタログから家具をドラッグして置き、
          そのまま3Dで動かす——引っ越し・模様替え・レイアウト検討がブラウザだけで完結します。
          データは端末に自動保存されます。
        </p>
      </header>

      <Studio />

      <section className="prose prose-slate mt-14 max-w-none prose-h2:text-lg">
        <h2>間取りスタジオでできること</h2>
        <ul>
          <li>
            <strong>3Dでそのまま部屋づくり</strong>: ジャンル別カタログ（ソファ・ベッド・照明・ラグ・収納・レッスン道具など）からドラッグ＆ドロップ。置いた後もドラッグで移動、クリックでサイズ・タイプ・色を変更。
          </li>
          <li>
            <strong>タイプと色</strong>: ソファは1人掛け〜カウチ、ベッドはシングル〜クイーン。色替えにも対応。
          </li>
          <li>
            <strong>床材・建具</strong>: フローリング・畳・カーペットなど床7種、ドア・窓も配置可能。
          </li>
          <li>
            <strong>保存と持ち出し</strong>: 複数プランを端末に自動保存。JSON書き出しでバックアップも。
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

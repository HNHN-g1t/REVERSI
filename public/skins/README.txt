スキン画像（PNG）の置き場所

  boards/<スキンID>/square.png   1マスぶんのタイル（正方形・推奨 128×128）
  boards/<スキンID>/board.png    盤全体の絵（正方形・推奨 1024×1024、マス目の線も含めて描く）
  stones/<スキンID>/black.png    黒石（背景透過の正方形・推奨 256×256）
  stones/<スキンID>/white.png    白石（同上）

置いただけでは切り替わりません。src/skins.ts の該当スキンに images を書き足してください。

  例）水晶の石を画像にする
    { id: 'crystal', name: '水晶（透明 × 黒）', price: 100,
      images: {
        black: skinAsset('stones/crystal/black.png'),
        white: skinAsset('stones/crystal/white.png'),
      } },

詳しくはリポジトリの README.md「スキンを PNG に差し替える」を参照。

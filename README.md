# My Gym Training

スマホでセットごとの重量・回数を記録する腕トレ用Webアプリです。

## 機能

- 各セットの重量・回数・メモを入力
- ブラウザの `localStorage` へ自動保存
- Google Apps Script経由でGoogleスプレッドシートへ追記
- ChatGPT向けJSONをコピー
- CSVを書き出し

## Google Sheets連携

1. Googleスプレッドシートを新規作成する
2. **拡張機能 → Apps Script** を開く
3. `google-apps-script/Code.gs` の内容を貼り付ける
4. **デプロイ → 新しいデプロイ → ウェブアプリ** を選ぶ
5. 実行ユーザーを自分、アクセスできるユーザーをリンクを知っている全員にする
6. 発行された `/exec` URLをWebアプリの同期設定へ入力する

各セットの「保存」を押すと `Workout Log` シートへ1行追加されます。

## GitHub Pages

`main` にマージ後、Repository Settings → Pages で Source を **GitHub Actions** に設定してください。

# My Gym Training

スマホでセットごとの重量・回数を記録する腕トレ用Webアプリです。

## 機能

- 各セットの重量・回数・メモを入力
- 回数はメニューに合わせて初期入力済み
- ブラウザの `localStorage` へ自動保存
- セッション終了時にGitHubへJSONを保存
- ChatGPT向けJSONをコピーまたはダウンロード

## GitHubへの記録保存

記録は次のパスに、1セッション1ファイルで保存されます。

```text
data/workouts/YYYY-MM-DD/session-<timestamp>.json
```

初回のみ、Webアプリの **GITHUB CONNECTION** からFine-grained personal access tokenを設定します。

トークンの設定条件:

- Repository access: `dieu-detruit/my-gym-training` のみ
- Repository permissions: `Contents` を `Read and write`
- 有効期限: 30〜90日を推奨

トークンはブラウザの `localStorage` にだけ保存され、トレーニングJSONやリポジトリには含まれません。

トレーニング終了後、**WORKOUT COMPLETE** を押すと、完了済みのセットだけがGitHubへ保存されます。

## GitHub Pages

Repository Settings → Pages で Source を **GitHub Actions** に設定してください。`main` 更新時に自動デプロイされます。

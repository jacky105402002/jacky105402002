# 個人首頁製作與維護

此專案以原生 README 和深海青綠 SVG 客製化 Jacky 的 GitHub 首頁展示區。GitHub 的導覽、側欄及整頁背景由平台控制。程式不依賴外部統計卡片服務，也不需要網站主機。

## 本機使用

環境固定為 Node.js 24.20.0，採 Node 24 LTS 系列。沒有第三方 runtime 依賴。

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run validate
npm.cmd test
npm.cmd run build
npm.cmd run build:fixture
npm.cmd run preview
```

在 Windows 使用 `npm.cmd` 可避免 PowerShell 的 npm.ps1 執行政策差異。macOS、Linux 可使用 `npm`。

正式資料狀態預覽：[本機 README](http://127.0.0.1:4173/preview/index.html)。本機已同步第一次成功更新的真實快照；之後以 git pull --ff-only 取得 Actions 的新數據。完整圖表外觀預覽：[示意資料](http://127.0.0.1:4173/fixture/index.html)。此入口明確標記測試資料，只存在未追蹤的 `work/`，不發布到 GitHub。

`npm run init:profile` 只用於第一次建立 unavailable 快照；已有快照會拒絕覆蓋。一般修改文字或配色後執行 build，即可從現有快照重建。需要更新數字時執行 update。

## 修改內容

| 檔案 | 可修改項目 |
| --- | --- |
| `config/profile.json` | 顯示名稱、標語、自介、方向及公開連結 |
| `config/projects.json` | 2 至 3 個已核對的代表作與 Demo |
| `design/tokens.json` | 顏色、字體、字級、卡片內距 |
| `templates/README.template.md` | 首頁文字結構與生成區塊位置 |

不要直接改 `README.md` 或 `assets/generated/*.svg`，下一次 build 會重建。維持帳號為 `jacky105402002`；若日後要製作別人的版本，需同時移除程式與 workflow 的帳號限制並重新驗證。

## 接上真實資料

資料讀取接受 `PROFILE_READ_TOKEN`，其次為 `GITHUB_TOKEN`。本機由 shell 環境變數提供；程式不自動讀取 `.env`。不要把 token 放進聊天、原始碼、網址或 Git commit。

憑證就緒後執行：

```powershell
npm.cmd run update
npm.cmd run check:generated
```

Token 必須限於讀取公開資料；不要授予私人儲存庫存取。GitHub Actions 先使用內建 GITHUB_TOKEN；若公開帳號貢獻查詢權限不足，再於儲存庫 Actions Secrets 設定唯讀 `PROFILE_READ_TOKEN`。發布推送仍使用儲存庫內建 token。缺少 token、API 錯誤或資料不完整，都會使更新失敗並保留舊檔。

## 顯示到 GitHub 個人首頁

必要目標是公開儲存庫 `jacky105402002/jacky105402002`，其預設分支根目錄需有這份生成的 README。[GitHub 官方設定方式](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme)

同名公開儲存庫已建立並發布，本機 origin 已連接。首次更新已驗證內建 GITHUB_TOKEN 足以取得所需資料並推送生成檔，目前不需要額外 PROFILE_READ_TOKEN。日後修改前先執行 git pull --ff-only；有本機未提交變更時先保留並整合。work、.env 及 token 均不在發布內容中。

上傳成功後，開啟 [Jacky 個人首頁](https://github.com/jacky105402002) 檢查 README 與圖片。到 Actions 手動執行 Update profile，成功後再確認真實統計與日期。每日更新設於台北時間 08:23；排程與圖片快取可能有延遲，不能當即時服務。

Workflow 只在本人同名儲存庫的預設分支更新；PR 的檢查工作沒有寫入權限。若分支保護拒絕 bot 直接推送，需改成更新 PR 流程，不能關閉保護來略過規則。

## 維護及回復

- 顯示舊日期：查看 Update profile 執行結果；確認 token、排程與預設分支。
- 更新失敗：保留舊快照，不把錯誤數字手改為零。
- 圖片尚未更新：確認生成 commit 已上傳，等 GitHub 圖片快取刷新後再核對。
- 配色或文字錯誤：修改設定、build、validate、test、check:generated。
- 發布內容錯誤：停用有問題的更新工作，revert 最近的生成 commit，再修正重跑。

完整規格見 [SDD](SDD.md)、[設計規範](DESIGN-SPEC.md) 與 [驗收規範](ACCEPTANCE.md)。

# Jacky GitHub 個人首頁軟體設計規格

版本 1.0.0，2026-10-07。SDD 指 Software Design Description。本規格定義以 GitHub Profile README 為交付平台的個人展示頁；深海青綠為使用者已選定的視覺方向，以下技術方案作為第一版開發基準。

## 1 目標與邊界

訪客應能在首頁理解 Jacky 的開發方向，找到代表作品，並閱讀有明確時間範圍的 GitHub 活動摘要。維護者應能修改內容設定與設計 tokens，再以單一建置流程更新 README 及圖片。

第一版包含個人介紹、精選作品、技術與方法、活動摘要、連續貢獻、語言分布、月貢獻、貢獻日曆及已驗證的聯絡連結。首頁文字為繁體中文，保留 GitHub、Commit、PR 等必要技術名稱。

不納入獨立網站、後端常駐服務、資料庫、訪客追蹤、私人專案明細、個人首頁外框改版、即時互動圖表、全生涯統計與第三方統計卡片服務。GitHub 不允許 README 任意執行 CSS 或 JavaScript，參見 [平台依據](SOURCES-AND-DECISIONS.md)。

## 2 使用流程

| 角色 | 流程 | 完成條件 |
| --- | --- | --- |
| 初次訪客 | 介紹 → 精選作品 → 儲存庫或 Demo | 可以不看圖表就理解作品用途並開啟連結 |
| 技術交流者 | 技術與方法 → 相關專案 → 公開聯絡入口 | 不需要猜測圖示或不明縮寫 |
| 維護者 | 修改設定 → 本機驗證 → GitHub 預覽 → 發布 | 不必手動改每張 SVG |
| 排程工作 | 取得資料 → 檢查 → 產生 → 比對 → 更新 | 失敗時保留上次有效內容 |

## 3 功能需求

| 編號 | 需求 | 第一版行為 |
| --- | --- | --- |
| FR01 | 個人識別 | 姓名、帳號、原生文字簡介與裝飾性橫幅 |
| FR02 | 精選作品 | 2 至 3 個已核對的作品，包含名稱、用途、儲存庫及選用 Demo |
| FR03 | 技術與方法 | 只列出有專案或使用者確認依據的技術，不用語言占比推定熟練度 |
| FR04 | 活動摘要 | 期間貢獻、Commit 貢獻、PR 貢獻、Issue 貢獻、Review 貢獻；公開原創專案數與 Stars 另標示為目前值 |
| FR05 | 連續貢獻 | 顯示截至資料日的連續天數與期間內最長連續天數 |
| FR06 | 語言分布 | 公開且未封存的自有非 fork 儲存庫，按程式碼位元組加總 |
| FR07 | 月貢獻 | 同一期間的 12 個月份柱狀圖，本月標示未結束 |
| FR08 | 貢獻日曆 | 同一期間每日貢獻格，圖例與統計日期清楚可見 |
| FR09 | 更新 | 支援手動與每日排程，無數值或內容變更時不產生多餘提交 |
| FR10 | 可讀替代內容 | README 的文字摘要及可展開表格保留圖表關鍵資料 |
| FR11 | 回復 | 能回到上一個成功產出版本，錯誤不以零替代 |

## 4 品質需求

| 編號 | 指標與限制 |
| --- | --- |
| NFR01 | 320、375、768、1280 CSS px 檢查；可視內容不能水平溢出 |
| NFR02 | 一般文字與背景對比至少 4.5:1；重要圖形至少 3:1，不能只靠顏色表意 |
| NFR03 | 每張 SVG 目標小於 100 KB，首頁圖片合計小於 600 KB；禁止外部字型、腳本及外部圖片依賴 |
| NFR04 | 相同輸入與固定資料日期應產生相同內容；輸出穩定排序、UTF-8、LF |
| NFR05 | API 每請求 20 秒逾時，暫時性失敗最多重試 2 次；並行上限 3，工作總逾時 10 分鐘 |
| NFR06 | 本機測試可離線執行，讀取模式的 PR 檢查不得推送內容 |
| NFR07 | 所有輸出採公開資料白名單，不提交 token、原始 HTTP 回應與私人儲存庫名稱 |

## 5 系統架構

採 Node.js 的受支援 LTS 版本與 ESM JavaScript；在 D1 查核官方版本並固定於 `.node-version`、`package.json` 及 CI。優先使用內建 fetch、檔案系統與 node:test；僅在 SVG 解析、Schema 驗證確有需要時加入小型依賴並固定鎖檔。不需要 React、Vite 或應用程式伺服器。

資料流：公開 GitHub API 與人工內容設定 → 正規化快照 → 純函式統計 → SVG 與 Markdown 產生 → 驗證暫存目錄 → 一次提交有效產出。

| 模組 | 責任 | 不得執行的工作 |
| --- | --- | --- |
| `config` | 讀取帳號、作品、內容開關、tokens 並驗證 | 不接受執行碼或任意 API 網址 |
| `github-client` | 認證、REST 分頁、GraphQL、限流與重試 | 不直接寫 README |
| `normalize` | 轉換資料格式與公開白名單 | 不把未知欄位直接存成快照 |
| `metrics` | 計算語言、月份、streak，接受注入的日期 | 不存取網路與系統時鐘 |
| `render-svg` | 依 tokens 產生獨立 SVG | 不依賴瀏覽器或 CSS 注入 |
| `render-readme` | 以模板生成文字、圖片引用、摘要 | 不插入私人資料或未核對連結 |
| `validate` | 檢查 schema、數據一致、SVG、路徑、大小 | 不將警告當作有效數據 |
| `publish` | 僅更新允許的生成檔，必要時提交 | 不修改設定、來源程式、其他使用者檔案 |

## 6 預定儲存庫結構

以下結構已實作；work 為本機暫存區，不提交到 Git。

```text
README.md                         生成的個人首頁
docs/                             規格及維護指南
design/tokens.json                設計單一來源
design/deep-sea-mint-preview.html  離線設計參考
config/profile.json               姓名、簡介、公開連結
config/projects.json              已核對精選專案
templates/README.template.md       文字與生成區塊模板
scripts/                          CLI 與資料、統計、渲染模組
tests/fixtures/                   明確標示的合成測試資料
assets/generated/                生成的 SVG
data/public-snapshot.json         經白名單整理的資料
.github/workflows/check.yml       無寫入權限的檢查
.github/workflows/update.yml      手動及每日更新
work/                            未追蹤的暫存產出及檢查紀錄
```

`README.md`、`assets/generated/`、`data/public-snapshot.json` 由產生器管理；人工內容改模板或設定。更新時明列三類允許檔案，禁止 `git add .`。`work/`、`.env*`、`node_modules/` 進 `.gitignore`；若提供 `.env.example`，只能含空白設定說明。

## 7 API 與授權設計

REST 的公開使用者儲存庫清單逐頁取得，每頁最多 100，依 `Link` header 走至結束。以 owner login、public、非 fork 及非 archived 過濾；語言 API 為 `GET /repos/{owner}/{repo}/languages`。Stars 與專案數採相同過濾集合，避免互相矛盾。API 版本 header 在 D1 依當時官方支援版本固定並記錄。

GraphQL 讀 `user(login)` 的 `contributionsCollection(from,to)`，取得日曆及 Commit、Issue、PR、Review 貢獻總數。日曆分級使用 GitHub 回傳的 `contributionLevel`，自行映射成青綠色階。HTTP 200 若含 GraphQL `errors` 仍須判定受影響資料不完整，不得忽略。欄位參見 [GitHub Users reference](https://docs.github.com/en/graphql/reference/users)。

先在開發階段驗證自動提供的 `GITHUB_TOKEN` 能否讀取所需公開貢獻；其存取權限受 workflow 所在儲存庫限制，不能預設能讀全帳號所有資料。若實測無法完成，使用另設的 `PROFILE_READ_TOKEN` 作唯讀資料取得，依端點實際所需設定最小權限，不開啟私人專案讀取權。推送只用該儲存庫的 `GITHUB_TOKEN`。憑證透過本機環境變數或 Actions Secrets 提供，不寫進設定檔。

連線目的地限制為 GitHub 官方 API；作品名稱、描述、語言名稱、URL 都視為不可信輸入。文字做 XML 及 Markdown 對應跳脫；URL 僅接受已驗證的 HTTPS，不把輸入插入 shell 指令。參見 [GITHUB_TOKEN 文件](https://docs.github.com/en/actions/concepts/security/github_token)。

## 8 統計口徑與日期

### 8.1 共用期間

以執行時 UTC 日期為資料日 T，起點 S 為 T 所在月份往前 11 個月的第一天。API from 是 S 的 `00:00:00Z`，to 是實際擷取時間。所有期間卡片顯示 S 至 T，標籤「近 12 個月份」，而非「365 天」或「全年」。例如資料日 2026-10-07，區間是 2025-11-01 至 2026-10-07，本月不完整。

依 GitHub 回傳的日曆日期分桶，保留原始日期標籤，不用台北時區重新分配每日貢獻；公開更新時間則以 `Asia/Taipei` 顯示並標明 UTC+8。統計到 T 不代表 T 已結束。每個日期必須完整且唯一；遺漏日期視為取得失敗，不能自行補零。帳號建立前的缺日只有經明確判定才可補零，並記錄原因。

### 8.2 指標定義

| 指標 | 計算 | 顯示限制 |
| --- | --- | --- |
| GitHub 可見貢獻 | 期間日曆 contributionCount 加總 | 可能包含使用者已公開的匿名私人貢獻，不能稱全部是公開程式碼 |
| Commit 等貢獻 | 對應 collection 的 total 欄位 | 遵循 GitHub 貢獻規則，不等於所有 Git commit 或事件數 |
| 公開原創專案 | 目前符合過濾條件的儲存庫數 | 包含本 profile repo 時也需納入，不額外隱藏以美化統計 |
| 收到 Stars | 上述儲存庫目前 stargazers_count 加總 | 不是期間新增 Stars，也不是曾獲得的歷史總和 |
| 語言占比 | 每語言 bytes 加總 ÷ 全部 bytes | 是儲存庫程式碼分布，不是技能、工時或作者貢獻占比 |
| 月貢獻 | 依日期 YYYY-MM 分桶加總 | 12 桶合計必須等於期間日曆合計 |

不顯示 All time；不將細項相加強行等同總貢獻。若 API 包含匿名私人貢獻，只保留公開可見的合計，不讀取或還原任何私人項目。

### 8.3 連續貢獻天數

以每日 `contributionCount > 0` 為有貢獻。若 T 有貢獻，從 T 向前計算；若 T 為 0、T−1 有貢獻，從昨日往前計算，卡片註明「截至昨日」；兩日都為 0 則 current 為 0。最長值在 S 至 T 內逐日掃描。若連續區段抵達 S，顯示「至少 N 天」，不可推論 S 以前的長度。最長值明確標示「期間內最長」。

### 8.4 語言分布

排除 fork、archived、private；空儲存庫的空字典可視為沒有程式碼。無法讀取的儲存庫不能從分母默默移除，整個快照更新應中止。語言以 bytes 降冪，平手依名稱排序；取前五名，其餘合併「其他」。百分比顯示至小數一位，採最大餘數法分配千分份額，合計 100.0%；原始 bytes 保留。總 bytes 為 0 時顯示「尚無可統計的程式碼」，不畫滿圓環。官方定義參見 [repository languages](https://docs.github.com/en/rest/repos/repos#list-repository-languages)。

## 9 資料契約

以下為規格型別，實作需建立 runtime schema，不是只靠註解。所有非空數字必須為有限且非負；原始計數為安全整數。`null` 是未知，不等於零。

| 欄位 | 型別 | 規則 |
| --- | --- | --- |
| schemaVersion | string | 初版 `1.0.0`，破壞性變更升主版本 |
| login | string | 初版固定 `jacky105402002` |
| status | string | `ok` 或 `unavailable`；stale 由 snapshot 日期與檢視時間比較 |
| sourceDate | YYYY-MM-DD 或 null | GitHub 資料日；沒有有效快照時為 null |
| lastSuccessfulFetchAt | ISO 8601 或 null | 成功擷取時間；失敗不得更新 |
| period | object 或 null | `from`、`through`，與資料日期一致 |
| repositoryScope | string | `public-owned-nonfork-unarchived` |
| contributionScope | string | `github-visible-including-public-anonymous-counts` |
| repositories | array | 只留 name、url、description、stars、languagesBytes；不留原始回應 |
| daily | array | `{date,count,level}`；level 為 NONE、FIRST_QUARTILE 至 FOURTH_QUARTILE |
| contributionTotals | object 或 null | calendar、commits、issues、pullRequests、reviews |
| currentRepositoryTotals | object 或 null | repositoryCount、stars |
| languages | array | name、bytes、percent；由資料推算 |
| months | array | month、count、isPartial；剛好 12 桶 |
| streak | object 或 null | current、currentThrough、longestInPeriod、startBoundaryReached |

`unavailable` 時資料陣列為空、總數為 null，渲染顯示「資料尚未取得」。fixture 與真實快照路徑分離，發布驗證拒絕 fixture 標記。profile 設定包含 displayName、login、bio、focus、links；projects 設定為陣列，每項有 repo、summary、demoUrl（可省略）、verifiedAt。未核對項目不得進發布設定。

## 10 產生與發布程序

1. 讀取設定與 tokens，確認 schema、合法路徑與帳號。
2. 取得完整 API 資料並記錄資料日；資料擷取中途跨 UTC 日期時，以開始時捕捉的 T 與開始時間作為固定查詢截止，下一輪再取得跨日後的資料。
3. 正規化、算指標、檢查完整性；只有整份快照成功才繼續。
4. 在 `work/staging/` 產生快照、SVG、README，執行離線驗證與既有測試。
5. 驗證成功後替換整組產出；CI 在乾淨 checkout 產生單一 commit，遠端看不到半套更新。本機替換保留舊檔備份，替換失敗回復。
6. 比對允許的生成檔；無差異結束，有差異才提交。每日資料日期改變是有效差異；同日內容相同不因秒級時間戳重複提交，無變更時沿用先前公開時間戳，實際本次檢查時間只寫 CI log。
7. 推送前確認遠端分支仍為建置基底；若已變更則停止並重新建置，不強推、不直接 rebase 生成檔後忽略人為修改。

預定 CLI 契約：`npm run validate`（離線設定與檔案檢查）、`npm test`（fixture 測試）、`npm run build:fixture`（只寫 work 預覽）、`npm run update`（有 token 的資料更新）、`npm run check:generated`（確認生成內容符合契約）。上述腳本已實作，實際執行方式見 MAINTENANCE.md。

## 11 排程與失敗處理

每日 08:23 台北時間執行，使用 UTC cron `23 0 * * *`；另支援 workflow_dispatch，修改設定、模板、程式或 tokens 時可在預設分支 push 觸發。pull_request 只跑 check。排程只在預設分支執行，可能延遲或因長時間無儲存庫活動而停用，維護者需能手動重跑。[官方事件規範](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

GitHub Actions 設定已寫入 .github/workflows；尚未上傳啟用，也未在 Codex 建立提醒或排程。CI 預設 `contents: read`，只有可信預設分支的發布 job 開 `contents: write`；concurrency 固定為 profile-update，`cancel-in-progress: false`。外部 actions 在開發階段固定可信 commit SHA。若分支保護不允許 bot 直推，改以更新分支與 PR 流程，不繞過保護。

| 狀況 | 行為 |
| --- | --- |
| 401、權限不足、設定錯誤 | 立即失敗，記錄不含憑證的原因 |
| 403 限流、429 | 遵守 Retry-After 或 reset；超過工作剩餘時間則失敗 |
| 5xx、網路中斷 | 最多 2 次退避重試，仍失敗則保留舊檔 |
| 分頁缺失、GraphQL 部分錯誤、schema 不符 | 整次更新中止，不發布部分統計 |
| 首次沒有有效資料 | 僅由明確的初始化指令建立無數字 unavailable 本機版；自動更新失敗不寫檔，真實統計驗收不能通過 |
| 有舊快照但更新失敗 | 舊圖片、日期與 README 保持一致，Actions 顯示失敗 |
| Git push 衝突 | 停止，重新取得預設分支後重跑 |

每張活動卡片帶固定「資料截至」日期。超過 72 小時無成功更新可由維護檢查判定 stale；靜態圖片不會自己變更警告，因此不能宣稱停跑時會自動顯示 stale。log 僅包含階段、耗時、分頁數、輸出數量與錯誤類型。

## 12 驗收與維護

依 [驗收規範](ACCEPTANCE.md) 完成資料邊界與 GitHub 真實渲染驗證。平台渲染、bot 權限、rate limit、圖片快取均需實測；本機 HTML 預覽不取代這些檢查。

回復時 revert 最近的生成 commit，保留前一份有效圖與快照；若源於程式錯誤，先停用 update workflow，再修正、測試及手動重跑。設定與統計口徑變更同時更新規格版本，保持 README 的公開說明與程式一致。

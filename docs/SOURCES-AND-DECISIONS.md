# GitHub 平台來源與設計決策

技術資料查核日期為 2026-10-07。官方來源用來界定平台能力；具體配色、範圍、更新頻率與程式架構則是本專案的設計決策。

## 1 官方來源

| 主題 | 來源 | 與本專案的關係 |
| --- | --- | --- |
| Profile README | [Managing your profile README](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme) | 公開同名儲存庫，根目錄 README 有內容才能顯示 |
| Markdown 限制 | [GitHub Markup](https://github.com/github/markup#github-markup) | HTML 清理會移除 script、inline style 等，不能部署任意網頁 |
| 貢獻日曆與統計欄位 | [GraphQL Users reference](https://docs.github.com/en/graphql/reference/users) | ContributionsCollection、ContributionCalendar 及每日日期、數量、分級 |
| 儲存庫資料及語言 | [REST repositories](https://docs.github.com/en/rest/repos/repos) | 公開儲存庫與語言 bytes；語言占比不是技能程度 |
| 排程 | [Actions events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) | 預設分支、UTC cron、延遲及閒置停用等行為 |
| Actions token | [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token) | 自動 token 的權限受所在儲存庫限制 |
| 置頂專案 | [Pinning items](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/pinning-items-to-your-profile) | 原生 pins 是另一項設定，不由 README 產生器修改 |

## 2 已定設計

| 編號 | 決策 | 理由及代價 |
| --- | --- | --- |
| ADR01 | 原生 README 加本地生成 SVG | 可自訂卡片且保留可搜尋文字；互動受平台限制 |
| ADR02 | 不依賴第三方統計圖片服務 | 視覺與口徑可掌控；需要維護小型產生器 |
| ADR03 | 圖片固定深色，原生內容跟隨 GitHub | 沿用已選配色；亮色 GitHub 會看到明確深色卡片 |
| ADR04 | 使用 Node LTS 小型腳本 | 不需網站框架及常駐主機；版本需在開發時固定 |
| ADR05 | 共用近 12 個月份 | 月圖、日曆、streak 及期間摘要可互相驗證；不宣稱完整一年 |
| ADR06 | 完整快照成功才發布 | 防止部分資料誤導；單一 API 失敗會延後整次更新 |
| ADR07 | 360 px 垂直圖片為初版基線 | 在手機保持可讀，降低平台 HTML 差異；桌機較窄 |
| ADR08 | 每日 08:23 台北時間更新 | 個人首頁不需即時服務；更新可能受 GitHub 排程與快取延遲 |

## 3 開發時需實測

| 項目 | 預定處理 | 不阻擋的工作 |
| --- | --- | --- |
| 同名儲存庫是否存在、預設分支及保護 | D1 唯讀查核，先保留原內容再整合 | 規格、tokens、fixture 設計 |
| GitHub token 讀取公開貢獻的完整性 | D1 最小 API 試查；不足時依最小權限補讀取 token | 離線元件與純函式測試 |
| 最新 Node LTS 與受支援 API 版本 | D1 查官方支援狀態並固定 | 內容核對與設計 |
| 自介、作品、聯絡內容 | 依內容計畫核對；私人聯絡資料不猜填 | 產生器與資料流程 |
| README 圖片縮放、SVG 字體、details | D6 在 GitHub 明暗模式及手機寬度驗證 | 本機開發 |

上述項目是待執行驗證，不是已完成或已獲得權限的聲明。改變統計口徑或呈現限制時同步更新 SDD、設計規範與驗收項目。

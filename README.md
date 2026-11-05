# Yawmeh

Yawmeh is a personal money and time management app for tracking income, expenses, budgets, savings goals, tasks, and reminders. It includes private user accounts and an optional AI companion.

Built with React, Vite, Node.js, Express, and MySQL.

On phones, navigation starts closed so the page uses the full screen width. Open it with the menu button, then close it with X, Escape, the backdrop, or by choosing a page. The app still starts on Overview, and task views keep their existing behavior. The companion remains available as a small floating avatar while navigation is closed. Desktop navigation starts open and can also be collapsed.

New users can choose **Start here** from the welcome banner or the visible **G Guide** button in the sidebar or top bar. The recommended avatar tour follows this order: set currencies in Settings → add existing savings → record income and allocate savings → record expenses → add a task → return to Today. It highlights the exact currency control, money tab and action button, explains how the amounts work using labelled examples, and waits for the user to navigate. It only includes pages the account can access. Finishing or dismissing the welcome banner is remembered on that browser; G Guide remains available to reopen it.

The alternative **Watch, then try** option includes a captioned first-day walkthrough and the existing task and money videos. Videos load only when requested. The tour works without an AI key and does not create or modify records. Avatar animation images use smaller WebP files for faster loading.

The companion supports open-ended AI conversation and follow-ups in English or Lebanese Arabic. In the server `.env`, configure `GEMINI_API_KEY` and `COMPANION_AI_ENABLED=true` to enable it. Without these, the companion uses the local app helper. Existing AI usage limits still apply.

For enhanced speech recognition, configure `OPENAI_API_KEY` and `COMPANION_VOICE_ENABLED=true`, then restart the server. In a live account, choose Speak, talk, and tap Stop mic to transcribe (up to 60 seconds). Auto detects the recording language; Arabic and English can also be selected explicitly. Review the editable transcript before sending. Recordings are sent to OpenAI for transcription and are not saved by Yawmeh; provider usage is billed to the configured account. The implementation follows the [OpenAI transcription API](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).

Browser recognition remains available in Voice settings and as the default when enhanced recognition is unavailable. It now accepts multiple phrases instead of stopping at the first completed phrase. Microphone access requires localhost or HTTPS and browser permission.

Companion understanding now accepts “add to saving $500”, natural Arabic such as “انا صرفت اليوم 500” and “انا استلمت اليوم 500”, and questions that interrupt unfinished drafts. Missing details are requested before a draft is ready; borrowing is not silently treated as income.

The companion defaults to `gemini-3.8-flash` with the model’s normal reasoning settings and a larger response budget. Set `COMPANION_AI_MODEL` to override it (for example `gemini-3.1-flash-lite` for lower cost). Model access and billing depend on the server’s Google account; existing app usage limits still apply. See [Google’s model documentation](https://aistudio.google.com/docs/models/gemini-3.8-flash). Missing configuration, app allowance, provider quota, rejected credentials, unsupported models, timeouts, and malformed replies now produce distinct messages instead of a combined “unavailable or allowance reached” notice.

Mobile browser recognition merges overlapping sentence snapshots so growing hypotheses do not become repeated commands. Arabic subscription requests such as “زيدي عالسبسكريبشن كلود ب 20 دولار 16 الشهر” prepare a draft for review. If AI still fails, retry once and inspect `journalctl -u daywell -n 100 --no-pager | grep '\[companion-ai\]'`. These diagnostic lines include only the public failure code, processing phase, and upstream HTTP status when available; they exclude messages, provider response bodies, and credentials. They distinguish provider request rejection or outage from allowance-database and record-loading failures.

The companion's **Examples** button offers English, Lebanese Arabic and Arabizi requests for planning, reminders, money tracking, draft corrections, and AI-assisted thinking or writing. Choosing an example fills the message box for review. Examples respect account permissions and label requests that require AI. Auto language detection recognizes more Lebanese spellings and mixed writing, retains context for short replies, and lets AI resolve uncertain cases without overriding a manual language selection. See the [research and supported request guide](docs/companion-research.md) for sources, implementation choices, and limitations.

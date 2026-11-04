# Yawmeh

Yawmeh is a personal money and time management app for tracking income, expenses, budgets, savings goals, tasks, and reminders. It includes private user accounts and an optional AI companion.

Built with React, Vite, Node.js, Express, and MySQL.

New users can choose **Start here** from the welcome banner or sidebar. The recommended avatar tour highlights Settings, Tasks, Money, and Overview, explains each page, and waits for the user to navigate. It only includes pages the account can access. Finishing or dismissing the welcome banner is remembered on that browser; the tour can always be reopened.

The alternative **Watch, then try** option includes a captioned first-day walkthrough and the existing task and money videos. Videos load only when requested. The tour works without an AI key and does not create or modify records. Avatar animation images use smaller WebP files for faster loading.

The companion supports open-ended AI conversation and follow-ups in English or Lebanese Arabic. In the server `.env`, configure `GEMINI_API_KEY` and `COMPANION_AI_ENABLED=true` to enable it. Without these, the companion uses the local app helper. Existing AI usage limits still apply.

For enhanced speech recognition, configure `OPENAI_API_KEY` and `COMPANION_VOICE_ENABLED=true`, then restart the server. In a live account, choose Speak, talk, and tap Stop mic to transcribe (up to 60 seconds). Auto detects the recording language; Arabic and English can also be selected explicitly. Review the editable transcript before sending. Recordings are sent to OpenAI for transcription and are not saved by Yawmeh; provider usage is billed to the configured account. The implementation follows the [OpenAI transcription API](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).

Browser recognition remains available in Voice settings and as the default when enhanced recognition is unavailable. It now accepts multiple phrases instead of stopping at the first completed phrase. Microphone access requires localhost or HTTPS and browser permission.

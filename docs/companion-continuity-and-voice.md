# Companion continuity, Arabic and natural voice

Recent chats are stored in this browser, per signed-in account and demo/live mode. The latest five chats are kept for up to 30 days. Reopen one from **Recent chats** to recover its messages, input text, date range and unfinished draft. Starting a new chat keeps the previous one. Delete individual chats from that list. Older answers are snapshots; new questions use current records. A permission-scope change prevents restoring incompatible history. This is browser storage, not encrypted storage or cross-device synchronization.

Reviewing a companion draft opens the existing form. Cancelling leaves the draft resumable; a confirmed save removes its review action. A saved mutation whose refresh failed also clears the action to avoid a duplicate save. Draft titles, dates, times, amounts, currencies, and form validation remain unchanged when switching language.

Arabic coverage includes standard reports, priorities, time-limited task suggestions, affordability, budgets, subscriptions, goals, spending comparisons and savings suggestions. Their recorded amounts and calculation qualifications are preserved. Unknown templates keep the source text with a visible language note. Main task, transaction, budget, subscription, item, renewal and category dialogs have an English/Arabic switch; forms opened from an Arabic chat start in Arabic. The rest of the application is not globally translated.

## Optional natural voice

1. Add a funded OpenAI API key to the server `.env` as `OPENAI_API_KEY`.
2. Set `COMPANION_VOICE_ENABLED=true` and restart the application server.
3. In a live workspace, open **Voice settings → Voice quality → Natural voice · OpenAI**. Choose Marin or Cedar, then preview English and Arabic.

Natural voice uses `gpt-4o-mini-tts` through the authenticated server, with the key kept server-side. It requests a Lebanese accent for Arabic and a character-specific tone. Accent quality needs a listening check; it is not guaranteed. Setup follows the [official OpenAI speech guide](https://developers.openai.com/api/docs/guides/text-to-speech). The UI discloses the AI-generated voice, sending played reply text to OpenAI, and API billing. Natural voice must be selected each time the voice controls mount; restoring history never starts audio. No paid speech requests are made in demo mode.

Requests are limited to 3,000 characters, eight per minute and 100 per day per signed-in user, per server process. Long replies are played in sequential chunks; each chunk consumes a request. Multi-process deployments need a shared rate-limit store for global limits. Requests time out after 30 seconds; audio responses are bounded to 8 MiB. Audio is not stored by the application. Stop, closing chat, changing conversation/language, sending a new question, or hiding the page cancels playback and releases temporary audio URLs. Provider failures before playback fall back to a device voice; blocked autoplay asks for a manual replay. A device voice that fails to start times out rather than remaining indefinitely in Preparing.

## Validation

Automated checks cover translated financial values and qualifications, history scope/expiry/corruption, partial and ready draft restoration, audio chunking/cancellation/URL cleanup, blocked playback, endpoint authentication, same-origin checks, explicit enablement, input bounds, per-user throttling and provider error redaction. Browser QA verified Arabic draft continuation, the Arabic review form, cancellation preserving the draft, and recovery after a full page reload. Phone-size and short-height layouts are checked separately from physical microphone/audio testing.

This workspace has no configured OpenAI API key, so hosted speech is wired and tested with a mock service but not exercised against the live provider. A physical phone keyboard, spoken microphone recognition, audible speech quality, and Lebanese pronunciation still require device testing.

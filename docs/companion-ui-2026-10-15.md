# Companion UI update — 2026-10-15

- Redesigned chat around a scrollable conversation, persistent composer, visible microphone/speaker controls, and three permission-aware suggestions at a time.
- Moved character/motion settings, voice selection/previews, quick add, and date ranges into compact panels.
- Added labelled preparing/listening/thinking/speaking states, character accent colors and introductions, and motion that respects both pause and reduced-motion settings.
- Displayed exact report currency values as balance/period cards without recalculating financial data.
- Added draft Review & save / Dismiss cards; review still opens the existing validated form. Account or mode changes reset transient conversation state.
- Added English / Arabic / Auto selection, Arabic controls, RTL layout, isolated dates/currency text, and deterministic localization of standard reports, daily plans and draft prompts. Unsupported detailed translations retain their original text with a visible note.
- Prevented dismissed/updated draft objects from replaying old speech; only a new reply triggers automatic speech.

Validation: production build passes; all 107 unit/integration tests pass. Browser checked at desktop and 390×844: English report cards, Arabic report cards, draft dismissal, Lebanese task input, and Review opening the form with the original title/date/21:00 time. Cancelled the form without saving. Preview screenshot: `companion-ui-preview.png`.

Device microphone recognition and actual speech playback were not exercised. Voice quality still depends on installed browser/device voices. The rest of the application and detailed unsupported response templates remain English.

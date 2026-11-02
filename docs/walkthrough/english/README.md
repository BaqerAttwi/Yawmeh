# English screen walkthrough

The final deliverable is `daywell-english-walkthrough.mp4`: an actual recording of an isolated Chrome session using the app's browser-local admin demo. Narration is generated locally using Microsoft Zira Desktop. Captions are burned into the recording, and an additional English subtitle track and standalone SRT are provided.

The recording demonstrates navigation, task creation, an expense draft and save, companion questions, voice controls, and reports. It does not capture or exercise the user's microphone. No real account, password, or personal workspace is used.

Supporting files:

- `transcript.md`: the full explanation.
- `chapters.json`: editable chapter titles and narration.
- `timeline.json`: measured narration start times and durations.
- `english-captions.srt`: subtitles.
- `english-narration.wav`: synchronized narration track.
- Chapter PNGs: visual checkpoints from the recording.

To regenerate on this PC, run `narrate.ps1`, start the Vite preview on localhost port 5173, run `record.mjs`, then run `assemble.py` with the bundled Python runtime. The recording script uses this PC's bundled Playwright path, installed Chrome, and a workspace-local FFmpeg executable under `.media-tools/`. The video tool is not an application dependency.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$taskSpeaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$taskSpeaker.SelectVoice('Microsoft Zira Desktop')
$taskSpeaker.Rate = 0
$taskChapters = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'chapters.json') -Raw | ConvertFrom-Json
try {
 foreach ($taskChapter in $taskChapters) {
  $taskSpeaker.SetOutputToWaveFile((Join-Path $PSScriptRoot ($taskChapter.id + '.wav')))
  $taskSpeaker.Speak($taskChapter.text)
  $taskSpeaker.SetOutputToNull()
 }
} finally { $taskSpeaker.Dispose() }
Write-Output 'English narration generated with Microsoft Zira Desktop.'

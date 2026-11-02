$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$taskAdSpeaker=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
 $taskAdSpeaker.SelectVoice('Microsoft Zira Desktop')
 $taskAdSpeaker.Rate=1
 $taskAdSpeaker.SetOutputToWaveFile((Join-Path $PSScriptRoot 'voice-intro.wav'))
 $taskAdSpeaker.Speak('Your day needs a sidekick. Meet Yawmeh.')
 $taskAdSpeaker.SetOutputToNull()
 $taskAdSpeaker.SetOutputToWaveFile((Join-Path $PSScriptRoot 'voice-outro.wav'))
 $taskAdSpeaker.Speak('Your everyday. A little clearer.')
 $taskAdSpeaker.SetOutputToNull()
} finally { $taskAdSpeaker.Dispose() }

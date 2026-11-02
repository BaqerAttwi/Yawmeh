import json, wave, pathlib, subprocess, array, sys
root=pathlib.Path(__file__).resolve().parent
workspace=root.parents[2]
chapters=json.loads((root/'timeline.json').read_text(encoding='utf-8'))
with wave.open(str(root/(chapters[0]['id']+'.wav')),'rb') as first:
    params=first.getparams()
frame_bytes=params.nchannels*params.sampwidth
length=int((chapters[-1]['start']+chapters[-1]['duration']+1)*params.framerate)
audio=bytearray(length*frame_bytes)
for chapter in chapters:
    with wave.open(str(root/(chapter['id']+'.wav')),'rb') as clip:
        assert clip.getparams()[:3]==params[:3]
        raw=clip.readframes(clip.getnframes())
    offset=round(chapter['start']*params.framerate)*frame_bytes
    audio[offset:offset+len(raw)]=raw
assert any(audio), 'Narration is silent'
with wave.open(str(root/'english-narration.wav'),'wb') as out:
    out.setparams(params)
    out.writeframes(audio)
def stamp(seconds):
    ms=round(seconds*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
subtitles=[]
for i,c in enumerate(chapters,1):
    subtitles.append(f"{i}\n{stamp(c['start'])} --> {stamp(c['start']+c['duration'])}\n{c['text']}\n")
(root/'english-captions.srt').write_text('\n'.join(subtitles),encoding='utf-8')
(root/'transcript.md').write_text('# Yawmeh / Daywell — English walkthrough\n\nNarration: Microsoft Zira Desktop (synthetic voice). All demonstrations use isolated browser-local sample data.\n\n'+'\n\n'.join(f"## {c['title']}\n\n{c['text']}" for c in chapters)+'\n',encoding='utf-8')
ffmpeg=workspace/'.media-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
subprocess.run([str(ffmpeg),'-hide_banner','-y','-i',str(root/'screen-recording.webm'),'-i',str(root/'english-narration.wav'),'-i',str(root/'english-captions.srt'),'-map','0:v:0','-map','1:a:0','-map','2:0','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-c:s','mov_text','-metadata:s:s:0','language=eng','-metadata:s:a:0','language=eng','-metadata','title=Yawmeh / Daywell - English walkthrough','-movflags','+faststart','-t',str(length/params.framerate),str(root/'daywell-english-walkthrough.mp4')],check=True)
print(json.dumps({'seconds':length/params.framerate,'chapters':len(chapters),'bytes':(root/'daywell-english-walkthrough.mp4').stat().st_size}))

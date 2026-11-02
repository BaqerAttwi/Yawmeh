from pathlib import Path
import numpy as np
import wave, subprocess, json
root=Path(__file__).resolve().parent
workspace=root.parents[2]
sr=48000; duration=28; total=sr*duration
music=np.zeros((total,2),dtype=np.float64)
rng=np.random.default_rng(21026)
def add(signal,start,volume=1,pan=0):
    offset=int(start*sr)
    if offset>=total:return
    signal=signal[:total-offset]*volume
    music[offset:offset+len(signal),0]+=signal*(1-pan*.4)
    music[offset:offset+len(signal),1]+=signal*(1+pan*.4)
def hz(note):return 440*2**((note-69)/12)
beat=60/112
for i,start in enumerate(np.arange(0,duration,beat)):
    t=np.arange(int(sr*.34))/sr
    kick=np.sin(2*np.pi*(43*t+65*.025*(1-np.exp(-t/.025))))*np.exp(-t*15)
    add(kick,start,.30)
    if i%2:
        t=np.arange(int(sr*.14))/sr; noise=rng.normal(0,1,len(t));snare=np.diff(noise,prepend=0)*np.exp(-t*32)
        add(snare,start,.045)
    note=[38,38,34,36][(i//4)%4]
    t=np.arange(int(sr*.42))/sr; freq=hz(note)
    bass=(np.sin(2*np.pi*freq*t)+.15*np.sin(2*np.pi*2*freq*t))*np.minimum(t/.012,1)*np.exp(-t*7)
    add(bass,start,.15)
for i,start in enumerate(np.arange(0,duration,beat/2)):
    t=np.arange(int(sr*.06))/sr;noise=rng.normal(0,1,len(t));add(np.diff(noise,prepend=0)*np.exp(-t*80),start,.012,(-1)**i*.6)
    t=np.arange(int(sr*.65))/sr;note=[62,65,69,72,69,65,62,57][i%8]
    pluck=(np.sin(2*np.pi*hz(note)*t)+.17*np.sin(2*np.pi*hz(note)*2*t))*np.exp(-t*9)*np.minimum(t/.008,1)
    add(pluck,start,.045,np.sin(i)*.9)
for start in [3,6.5,10.5,14.5,19,23]:
    t=np.arange(int(sr*.30))/sr;noise=rng.normal(0,1,len(t));add(noise*np.sin(np.pi*t/.30)**2,start-.15,.012)
timeline=np.arange(total)/sr
fade=np.minimum(timeline/.7,1)*np.minimum((duration-timeline)/1.2,1)
music*=fade[:,None]
def write(path,signal):
    with wave.open(str(path),'wb') as out:
        out.setnchannels(2);out.setsampwidth(2);out.setframerate(sr);out.writeframes((np.clip(signal,-.99,.99)*32767).astype('<i2').tobytes())
write(root/'original-music.wav',music)
mix=music.copy()
for name,start in [('voice-intro.wav',3.1),('voice-outro.wav',23.2)]:
    with wave.open(str(root/name),'rb') as clip:
        samples=np.frombuffer(clip.readframes(clip.getnframes()),dtype='<i2').astype(float)/32768
        rate=clip.getframerate()
    samples=np.interp(np.arange(round(len(samples)/rate*sr))/sr,np.arange(len(samples))/rate,samples)
    samples=samples/max(abs(samples).max(),.01)*.65
    offset=round(start*sr);end=min(offset+len(samples),total)
    mix[max(0,offset-8000):min(total,end+10000)]*=.35
    mix[offset:end]+=samples[:end-offset,None]
write(root/'soundtrack.wav',mix)
ffmpeg=workspace/'.media-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
subprocess.run([str(ffmpeg),'-hide_banner','-y','-ss','0.35','-i',str(root/'social-ad-silent.webm'),'-i',str(root/'soundtrack.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-af','loudnorm=I=-16:TP=-1.5:LRA=8','-movflags','+faststart','-t','28','-metadata','title=Yawmeh - Your day needs a sidekick',str(root/'yawmeh-social-ad-28s.mp4')],check=True)
print(json.dumps({'duration':28,'format':'1080x1920 vertical','voice_words':14,'music':'Original procedural composition','bytes':(root/'yawmeh-social-ad-28s.mp4').stat().st_size}))

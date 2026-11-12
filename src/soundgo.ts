import type { HandLandmarks } from './tracking';
import { drawHandLandmarks } from './hand-landmark-art';

// Adaptación de la interacción de Soundgo, de Gojaehyeon (licencia MIT).
const roots = ['C','D','E','F','G','A','B'];
const chromatic = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const rootOffsets = [0,2,4,5,7,9,11];
const qualities = ['maj','maj7','7','sus4','m','m7','dim','aug'];
const intervals = [[0,4,7,12],[0,4,7,11],[0,4,7,10],[0,5,7,12],[0,3,7,12],[0,3,7,10],[0,3,6,12],[0,4,8,12]];
const scales: Record<string, number[]> = { major:[0,2,4,5,7,9,11], pentatonic:[0,2,4,7,9], minor:[0,2,3,5,7,8,10], blues:[0,3,5,6,7,10], chromatic:[0,1,2,3,4,5,6,7,8,9,10,11] };
const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const clamp = (n: number) => Math.max(0, Math.min(1, n));
type Point = {x:number; y:number};
type Wheel = {x:number; y:number; r:number};
export function wheelHit(p: Point, wheel: Wheel, count: number): {index:number; volume:number} | null {
  const dx=p.x-wheel.x, dy=p.y-wheel.y, distance=Math.hypot(dx,dy);
  if (distance < wheel.r * .36 || distance > wheel.r * 1.3) return null;
  const angle=(Math.atan2(dy,dx)+Math.PI/2+Math.PI*2)%(Math.PI*2);
  return {index:Math.floor(angle/(Math.PI*2)*count)%count, volume:clamp((distance/wheel.r-.36)/.64)};
}
export function scaleNotes(scale: string, octaves: number): number[] {
  const notes: number[]=[];
  for(let octave=0;octave<octaves;octave++) for(const n of scales[scale] ?? scales.major) notes.push(48+octave*12+n);
  notes.push(48+octaves*12); return notes;
}
function pinch(hand: HandLandmarks[number]): number {
  const d=(a:number,b:number)=>Math.hypot(hand[a].x-hand[b].x, hand[a].y-hand[b].y);
  return clamp((.8-d(4,8)/Math.max(.001,d(0,9)))/.5);
}
export class Soundgo {
  private context: AudioContext | null=null;
  private master: GainNode | null=null;
  private chord: {osc:OscillatorNode; gain:GainNode}[]=[];
  private melody: {osc:OscillatorNode; gain:GainNode} | null=null;
  private enabled=true;
  private hands: HandLandmarks=[];
  private keyboard=false;
  private root=-1;
  private quality=0;
  private volume=.65;
  private keyNote: number | null=null;
  private muted=false;
  private frame=0;
  private smooth: (Point|null)[]=[null,null];
  private chordVolume=.7;
  private selections: {value:number; candidate:number; frames:number}[]=[{value:-1,candidate:-1,frames:0},{value:-1,candidate:-1,frames:0}];
  constructor(private canvas: HTMLCanvasElement, private rootElement: HTMLElement) {}
  private get mode(): string { return this.el<HTMLSelectElement>('synth-mode').value; }
  private get simple(): boolean { return this.el<HTMLInputElement>('synth-simple').checked; }
  private get snap(): boolean { return this.el<HTMLInputElement>('synth-snap').checked; }
  private el<T extends HTMLElement>(id:string): T { return this.rootElement.querySelector<T>('#'+id)!; }
  setEnabled(enabled:boolean):void { this.enabled=enabled; if(this.context && this.master) this.master.gain.setTargetAtTime(enabled ? .7 : 0,this.context.currentTime,.03); }
  async unlock(): Promise<void> {
    if (!this.context) {
      this.context=new AudioContext(); const c=this.context;
      this.master=c.createGain(); this.master.gain.value=this.enabled?.7:0; this.master.connect(c.destination);
      for(let i=0;i<4;i++){const osc=c.createOscillator(),gain=c.createGain(); osc.type='triangle'; gain.gain.value=0; osc.connect(gain).connect(this.master); osc.start(); this.chord.push({osc,gain});}
      const osc=c.createOscillator(),gain=c.createGain(); gain.gain.value=0; osc.connect(gain).connect(this.master); osc.start(); this.melody={osc,gain};
    }
    if(this.context.state==='suspended') await this.context.resume();
  }
  start(keyboard:boolean):void { this.keyboard=keyboard; this.hands=[]; this.root=-1; this.keyNote=null; this.muted=false; if(!this.frame) this.draw(); }
  setHands(hands:HandLandmarks):void { this.hands=hands; this.keyboard=false; }
  releaseKeys():void { this.keyNote=null; this.muted=false; this.root=-1; this.silence(); }
  silence():void { if(!this.context)return; const t=this.context.currentTime; for(const v of this.chord) v.gain.gain.setTargetAtTime(0,t,.03); this.melody?.gain.gain.setTargetAtTime(0,t,.03); }
  stop():void { cancelAnimationFrame(this.frame); this.frame=0; this.silence(); this.hands=[]; this.smooth=[null,null]; this.selections.forEach(s=>{s.value=-1;s.candidate=-1;s.frames=0;}); this.chord.forEach(v=>{v.osc.stop();v.osc.disconnect();v.gain.disconnect();}); this.chord=[]; if(this.melody){this.melody.osc.stop();this.melody.osc.disconnect();this.melody.gain.disconnect();} this.melody=null; this.master?.disconnect(); void this.context?.close(); this.context=null; this.master=null; this.canvas.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height); }
  key(event:KeyboardEvent, down:boolean):boolean {
    if(!this.keyboard)return false;
    const k=event.key.toLowerCase();
    if(k===' '){this.muted=down;return true;}
    if(!down){if('asdfghjkl'.includes(k)) this.keyNote=null;return 'asdfghjkl'.includes(k);}
    if(/^[1-7]$/.test(k)) this.root=Number(k)-1;
    else if('qwertyui'.includes(k)) this.quality='qwertyui'.indexOf(k);
    else if(k==='arrowup') this.volume=clamp(this.volume+.08);
    else if(k==='arrowdown') this.volume=clamp(this.volume-.08);
    else if('asdfghjkl'.includes(k)){const notes=scaleNotes(this.el<HTMLSelectElement>('synth-scale').value,Number(this.el<HTMLSelectElement>('synth-range').value)); this.keyNote=notes['asdfghjkl'.indexOf(k)] ?? null;}
    else return false;
    void this.unlock(); return true;
  }
  private stabilized(index:number, slot:number):number {
    const s=this.selections[slot]; if(index<0){s.value=-1;s.candidate=-1;s.frames=0;return -1;}
    if(s.value<0){s.value=index;return index;} if(index===s.value){s.frames=0;return s.value;}
    if(index!==s.candidate){s.candidate=index;s.frames=0;} if(++s.frames>=3){s.value=index;s.frames=0;} return s.value;
  }
  private draw():void {
    this.frame=requestAnimationFrame(()=>this.draw()); const ctx=this.canvas.getContext('2d'); if(!ctx)return;
    const w=this.canvas.width,h=this.canvas.height; ctx.clearRect(0,0,w,h);
    const r=Math.min(w*.205,h*.30); const left={x:w*.245,y:h*.55,r}; const right={x:w*.755,y:h*.55,r};
    const sorted=[...this.hands].sort((a,b)=>b[8].x-a[8].x); let lh:HandLandmarks[number]|undefined,rh:HandLandmarks[number]|undefined;
    if(sorted.length>1){lh=sorted[0];rh=sorted[1];} else if(sorted[0]) {if(1-sorted[0][8].x<.5)lh=sorted[0];else rh=sorted[0];}
    const point=(hand:HandLandmarks[number]|undefined,slot:number):Point|null=>{if(!hand){this.smooth[slot]=null;return null;} const p={x:(1-hand[8].x)*w,y:hand[8].y*h}, prev=this.smooth[slot]; return this.smooth[slot]=prev?{x:(prev.x+p.x)/2,y:(prev.y+p.y)/2}:p;};
    const lp=point(lh,0),rp=point(rh,1), names=this.simple?roots:chromatic;
    // En el centro conservamos la nota y el volumen anteriores. El dedo real,
    // sin suavizar, decide la salida para que el sonido se detenga en el borde.
    const rawLeft=lh?{x:(1-lh[8].x)*w,y:lh[8].y*h}:null;
    const inside=!!rawLeft && Math.hypot(rawLeft.x-left.x,rawLeft.y-left.y)<=left.r;
    const inCenter=!!lp && Math.hypot(lp.x-left.x,lp.y-left.y)<left.r*.36;
    const hit=inside&&lp&&!inCenter?wheelHit(lp,left,names.length):null;
    if(hit) this.chordVolume=Math.max(.35,hit.volume);
    const leftIndex=inside?(inCenter?Math.max(0,this.selections[0].value):hit?.index??this.selections[0].value):-1;
    const qhit=rp&&this.mode==='chord'?wheelHit(rp,right,8):null;
    const root=this.keyboard?this.root:this.stabilized(leftIndex,0);
    const quality=this.keyboard?this.quality:this.mode==='chord' ? Math.max(0,this.stabilized(qhit?.index??-1,1)) : lh&&pinch(lh)>.45?4:0;
    const rootMidi=root<0?-1:48+((this.simple || this.keyboard)?rootOffsets[root]:root);
    const level=this.keyboard?this.volume:this.mode==='chord'?.7:(inside?this.chordVolume:0);
    let midi:number|null=null,melodyLevel=0;
    if(this.mode==='melody') {
      if(this.keyboard){midi=this.keyNote; melodyLevel=this.volume;}
      else if(rp&&rh&&rp.x>=w*.52){const x=clamp((rp.x/w-.52)/.48),oct=Number(this.el<HTMLSelectElement>('synth-range').value); const notes=scaleNotes(this.el<HTMLSelectElement>('synth-scale').value,oct); midi=this.snap?notes[Math.min(notes.length-1,Math.floor(x*notes.length))]:48+x*oct*12; melodyLevel=clamp(1-rp.y/h)**1.6 * pinch(rh)**1.3;}
    }
    const active=rootMidi>=0&&!this.muted;
    if(this.context){const t=this.context.currentTime;this.chord.forEach((v,i)=>{if(active)v.osc.frequency.setTargetAtTime(freq(rootMidi+intervals[quality][i]),t,.06);v.gain.gain.setTargetAtTime(active?level*.045:0,t,.04);}); if(this.melody){this.melody.osc.type=this.el<HTMLSelectElement>('synth-wave').value as OscillatorType;if(midi!==null)this.melody.osc.frequency.setTargetAtTime(freq(midi),t,.035);this.melody.gain.gain.setTargetAtTime(midi!==null&&!this.muted?melodyLevel*.18:0,t,.04);}}
    const drawWheel=(wheel:Wheel,labels:string[],selected:number,color:string,center:string)=>{ctx.save();ctx.textAlign='center';ctx.textBaseline='middle'; for(let i=0;i<labels.length;i++){const a=i/labels.length*Math.PI*2-Math.PI/2,b=(i+1)/labels.length*Math.PI*2-Math.PI/2;ctx.beginPath();ctx.moveTo(wheel.x,wheel.y);ctx.arc(wheel.x,wheel.y,wheel.r,a,b);ctx.closePath();ctx.fillStyle=i===selected?color:'rgba(8,20,30,.66)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.18)';ctx.stroke();const mid=(a+b)/2;ctx.font=`${Math.max(12,Math.round(r*.14))}px sans-serif`;ctx.fillStyle='white';ctx.fillText(labels[i],wheel.x+Math.cos(mid)*wheel.r*.72,wheel.y+Math.sin(mid)*wheel.r*.72);}if(center){ctx.beginPath();ctx.arc(wheel.x,wheel.y,wheel.r*.36,0,Math.PI*2);ctx.fillStyle='rgba(3,12,20,.94)';ctx.fill();ctx.fillStyle='#d4f9ee';ctx.font=`bold ${Math.max(10,Math.round(r*.12))}px sans-serif`;ctx.fillText(center,wheel.x,wheel.y);}ctx.restore();};
    drawWheel(left,names,root,'rgba(255,157,87,.72)','');
    if(this.mode==='chord') drawWheel(right,qualities,this.keyboard?quality:qhit?quality:-1,'rgba(88,154,255,.72)','maj');
    else {const notes=scaleNotes(this.el<HTMLSelectElement>('synth-scale').value,Number(this.el<HTMLSelectElement>('synth-range').value));const x=w*.52,y=h*.68,width=w*.46,height=h*.22; notes.forEach((n,i)=>{ctx.fillStyle=midi!==null&&Math.round(midi)===n?'rgba(78,165,255,.8)':'rgba(10,24,38,.65)';ctx.fillRect(x+i*width/notes.length,y,width/notes.length-1,height);ctx.fillStyle='white';ctx.font=`${Math.max(8,Math.min(12,width/notes.length*.55))}px sans-serif`;ctx.textAlign='center';ctx.fillText(chromatic[n%12],x+(i+.5)*width/notes.length,y+height*.55);});}
    if(this.hands.length)drawHandLandmarks(this.canvas,this.hands,false);
    [lp,rp].forEach((p,i)=>{if(!p)return;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fillStyle=i?'#72caff':'#ffb577';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='white';ctx.stroke();});
    this.el('synth-chord').textContent=active?(this.keyboard?roots[root]:names[root])+' '+qualities[quality]:'—';
    this.el('synth-quality').textContent=this.mode==='chord'?'Dos manos · acordes':'Melodía + acorde';
    this.el('synth-notes').textContent=midi!==null&&melodyLevel>.02?`Melodía: ${chromatic[Math.round(midi)%12]}${Math.floor(midi/12)-1}`:'Mueve tus manos para tocar';
    this.el('synth-volume').style.width=`${Math.round((active?level:melodyLevel)*100)}%`;
  }
}

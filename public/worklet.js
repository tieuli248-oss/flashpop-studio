/* Karaoke Studio real-time pitch correction worklet.
 * Original implementation using YIN-style pitch estimation and overlapping grains.
 * Runs on the audio rendering thread to keep the UI responsive.
 */
const NOTES=[0,1,2,3,4,5,6,7,8,9,10,11];
function hzMidi(hz){return 69+12*Math.log2(hz/440)}
function midiHz(m){return 440*Math.pow(2,(m-69)/12)}
function nearestScale(midi,root,scale){
 const intervals=scale===0?NOTES:scale===1?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10];
 let best=Math.round(midi),dist=Infinity;
 for(let oct=Math.floor(midi/12)-1;oct<=Math.floor(midi/12)+1;oct++){
  for(const n of intervals){const candidate=oct*12+root+n,d=Math.abs(candidate-midi);if(d<dist){best=candidate;dist=d;}}
 }
 return best;
}
class GrainPitchShifter{
 constructor(){this.size=2048;this.mask=this.size-1;this.buf=new Float32Array(this.size);this.write=0;this.a=0;this.b=.5;this.grain=256;}
 process(x,ratio){
  this.buf[this.write&this.mask]=x;this.write++;
  const inc=(1-ratio)/this.grain;
  this.a=(this.a+inc+1)%1;this.b=(this.b+inc+1)%1;
  return this.read(this.a*this.grain+2)*this.hann(this.a)+this.read(this.b*this.grain+2)*this.hann(this.b);
 }
 read(delay){const p=((this.write-delay)%this.size+this.size)%this.size,i=Math.floor(p),f=p-i;return this.buf[i&this.mask]*(1-f)+this.buf[(i+1)&this.mask]*f;}
 hann(p){return .5-.5*Math.cos(2*Math.PI*p)}
}
class KaraokeTuneProcessor extends AudioWorkletProcessor{
 constructor(){
  super();this.buf=new Float32Array(1024);this.chunk=new Float32Array(32);this.hop=32;this.pos=0;this.shifter=new GrainPitchShifter();
  this.root=0;this.scale=1;this.strength=75;this.enabled=true;this.speed=18;
  this.detected=-1;this.corrected=-1;this.targetRatio=1;this.ratio=1;this.lock=-1;this.silence=0;this.count=0;
  this.port.onmessage=e=>{const d=e.data||{};if(d.root!==undefined)this.root=d.root;if(d.scale!==undefined)this.scale=d.scale;if(d.strength!==undefined)this.strength=d.strength;if(d.enabled!==undefined)this.enabled=d.enabled;if(d.speed!==undefined)this.speed=d.speed;};
 }
 detect(){
  const n=512;let energy=0;for(let i=0;i<n;i++)energy+=this.buf[i]*this.buf[i];
  if(energy/n<0.00002){if(++this.silence>5){this.lock=-1;this.targetRatio=1;}return;}
  this.silence=0;let bestTau=-1,best=Infinity;
  for(let tau=24;tau<Math.min(400,n/2);tau++){
   let diff=0;for(let j=0;j<n-tau;j++){const d=this.buf[j]-this.buf[j+tau];diff+=d*d;}
   diff/=n-tau;
   if(diff<best){best=diff;bestTau=tau;}
  }
  if(bestTau<0)return;
  const hz=sampleRate/bestTau;if(hz<75||hz>1000)return;
  const midi=hzMidi(hz);
  if(this.lock<0||Math.abs(midi-this.lock)>.55)this.lock=midi;else this.lock=this.lock*.72+midi*.28;
  const target=nearestScale(this.lock,this.root,this.scale);
  this.detected=Math.round(midi);this.corrected=target;
  const semitones=(target-this.lock)*(this.strength/100);
  this.targetRatio=Math.pow(2,semitones/12);
 }
 process(inputs,outputs){
  const input=inputs[0]?.[0],out=outputs[0]?.[0];if(!input||!out)return true;
  for(let i=0;i<input.length;i++){
   const x=input[i];this.chunk[this.count]=x;this.count++;
   if(this.count>=this.hop){this.buf.copyWithin(0,this.hop);this.buf.set(this.chunk,this.buf.length-this.hop);this.count=0;this.detect();this.port.postMessage({detectedNote:this.detected,correctedNote:this.corrected});}
   const coeff=this.speed<=0?1:1-Math.exp(-1/(this.speed*sampleRate/1000));
   this.ratio+=(this.targetRatio-this.ratio)*coeff;
   out[i]=this.enabled?this.shifter.process(x,this.ratio):x;
  }
  return true;
 }
}
registerProcessor("karaoke-tune-processor",KaraokeTuneProcessor);

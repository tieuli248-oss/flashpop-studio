(() => {
"use strict";
const $ = id => document.getElementById(id);
let chosenMicDevice="";
const isMobileDevice=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||((navigator.maxTouchPoints||0)>1&&/Macintosh/i.test(navigator.userAgent));
const searchForm=$("searchForm"), queryInput=$("songQuery"), resultsBox=$("searchResults"), urlForm=$("youtubeForm"), urlInput=$("youtubeUrl"), frame=$("videoFrame"), msg=$("playerMessage");
let player=null,pendingId=null,stream=null,ctx=null,source=null,gain=null,analyser=null,monitorGain=null,raf=null,lastUpdate=0,searchController=null,highPassFilter=null,micCompressor=null;
const searchInstances=[
 "https://inv.nadeko.net/api/v1/search",
 "https://invidious.nerdvpn.de/api/v1/search",
 "https://invidious.tiekoetter.com/api/v1/search"
];
function videoId(raw){try{const u=new URL(raw);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||null;if(u.hostname.includes("youtube.com")){if(u.pathname==="/watch")return u.searchParams.get("v");const p=u.pathname.split("/").filter(Boolean);if(["embed","shorts","live"].includes(p[0]))return p[1]||null;}}catch(e){}return null;}
function loadVideo(id){pendingId=id;if(!window.YT||!window.YT.Player){msg.textContent="Đang tải trình phát YouTube… thử lại sau khi trình phát sẵn sàng.";return;}if(player&&player.destroy){try{player.destroy()}catch(e){}}frame.innerHTML='<div id="youtubePlayer"></div>';player=new YT.Player("youtubePlayer",{videoId:id,width:"100%",height:"100%",playerVars:{playsinline:1,rel:0},events:{onReady:()=>{msg.textContent="Video đã tải. Bấm phát trong trình YouTube để nghe.";frame.scrollIntoView({behavior:"smooth",block:"nearest"});},onError:e=>msg.textContent=({2:"Link hoặc mã video không hợp lệ.",5:"Video không phát được bằng trình phát HTML5.",100:"Không tìm thấy video hoặc video đã bị gỡ.",101:"Chủ video không cho phép nhúng video này.",150:"Chủ video không cho phép nhúng video này."})[e.data]||"YouTube không thể phát video này. Thử bài khác."}});}
window.onYouTubeIframeAPIReady=()=>{if(pendingId)loadVideo(pendingId)};
function escapeHTML(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function duration(s){if(!Number.isFinite(Number(s)))return "";let n=Number(s),h=Math.floor(n/3600),m=Math.floor(n%3600/60),sec=Math.floor(n%60);return h?[h,m,sec].map((x,i)=>i?String(x).padStart(2,"0"):x).join(":"):[m,sec].map(x=>String(x).padStart(2,"0")).join(":");}
function renderResults(items){if(!items.length){resultsBox.innerHTML='<p class="search-empty">Không thấy kết quả. Thử tên bài ngắn hơn hoặc dán link YouTube.</p>';return;}resultsBox.innerHTML=items.slice(0,10).map((v,i)=>{const id=v.videoId||v.video_id||v.id?.videoId||"";const title=v.title||"Video YouTube";const author=v.author||v.authorName||v.uploaderName||"Kênh YouTube";const thumb=(v.videoThumbnails||v.thumbnails||[]).find(t=>t.quality==="medium")?.url||(v.videoThumbnails||v.thumbnails||[])[0]?.url||("https://i.ytimg.com/vi/"+id+"/mqdefault.jpg");return '<button type="button" class="result" data-video="'+escapeHTML(id)+'"><img loading="lazy" src="'+escapeHTML(thumb)+'" alt=""><span class="result-copy"><b>'+escapeHTML(title)+'</b><small>'+escapeHTML(author)+'</small></span><span class="result-duration">'+escapeHTML(duration(v.lengthSeconds||v.duration))+'</span><span class="result-play">▶</span></button>';}).join("");}
async function searchSongs(query){if(searchController)searchController.abort();searchController=new AbortController();const signal=searchController.signal;resultsBox.innerHTML='<p class="search-empty"><span class="spinner"></span> Đang tìm bài hát…</p>';msg.textContent="Đang thử các nguồn tìm kiếm công khai miễn phí.";let lastError=null;for(const endpoint of searchInstances){try{const url=endpoint+"?q="+encodeURIComponent(query)+"&type=video&page=1";const res=await fetch(url,{signal,headers:{Accept:"application/json"}});if(!res.ok)throw Error("HTTP "+res.status);const data=await res.json();if(!Array.isArray(data))throw Error("Phản hồi không đúng định dạng");const items=data.filter(v=>v.videoId||v.video_id||v.id?.videoId);renderResults(items);msg.textContent="Kết quả từ nguồn tìm kiếm công khai. Chọn một bài để phát; nguồn có thể không ổn định.";return;}catch(err){if(err.name==="AbortError")return;lastError=err;}}resultsBox.innerHTML='<p class="search-empty">Các nguồn tìm kiếm miễn phí hiện không phản hồi hoặc bị trình duyệt chặn. Thử lại sau hoặc dùng link YouTube ở mục bên dưới.</p>';msg.textContent="Không kết nối được nguồn tìm kiếm công khai: chưa có kết quả được tải."; }
searchForm.addEventListener("submit",e=>{e.preventDefault();const q=queryInput.value.trim();if(q.length<2){msg.textContent="Nhập ít nhất 2 ký tự để tìm bài.";return;}searchSongs(q);});
resultsBox.addEventListener("click",e=>{const b=e.target.closest("[data-video]");if(!b)return;const id=b.dataset.video;if(!/^[\w-]{11}$/.test(id)){msg.textContent="Kết quả không có mã video hợp lệ.";return;}loadVideo(id);});
urlForm.addEventListener("submit",e=>{e.preventDefault();const id=videoId(urlInput.value.trim());if(!id||!/^[\w-]{11}$/.test(id)){msg.textContent="Link chưa đúng. Dán link youtube.com/watch?v=… hoặc youtu.be/…";return;}loadVideo(id);});
function noteFromMidi(m){const names=["Đô","Đô♯","Rê","Rê♯","Mi","Fa","Fa♯","Sol","Sol♯","La","La♯","Si"];return names[((m%12)+12)%12]+(Math.floor(m/12)-1);}
let tuneNode=null,detectedNote=-1,correctedNote=-1,bassFilter=null,echoDelay=null,echoFeedback=null,echoWet=null,feedbackAnalyser=null,feedbackNotches=[],feedbackTimer=null,feedbackCandidates={},feedbackLastUpdate=0;
function sendTuneSettings(){
 if(!tuneNode)return;
 const root=Math.max(0,Math.min(11,$("keySelect").selectedIndex));
 const scale=$("scaleSelect")?Number($("scaleSelect").value):1;
 tuneNode.port.postMessage({root,scale,strength:Number($("autotuneStrength").value),enabled:$("autotuneToggle").checked,speed:Math.max(1,105-Number($("autotuneStrength").value))});
}
async function startMic(){
 if(!navigator.mediaDevices?.getUserMedia)throw Error("Micro cần HTTPS hoặc localhost và trình duyệt hỗ trợ.");
 const AC=window.AudioContext||window.webkitAudioContext;
 ctx=new AC({latencyHint:"interactive"});
 await ctx.resume();
 const micConstraints={echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1};if(chosenMicDevice)micConstraints.deviceId={exact:chosenMicDevice};stream=await navigator.mediaDevices.getUserMedia({audio:micConstraints});
 source=ctx.createMediaStreamSource(stream);gain=ctx.createGain();analyser=ctx.createAnalyser();monitorGain=ctx.createGain();
 analyser.fftSize=2048;monitorGain.gain.value=0;gain.gain.value=Number($("gainSlider").value)/100;
 await ctx.audioWorklet.addModule("/worklet.js");
 tuneNode=new AudioWorkletNode(ctx,"karaoke-tune-processor",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
 tuneNode.port.onmessage=e=>{detectedNote=e.data.detectedNote;correctedNote=e.data.correctedNote;const m=detectedNote;if(m>=0){$("noteName").textContent=noteFromMidi(m);$("frequency").textContent=(440*Math.pow(2,(m-69)/12)).toFixed(1)+" Hz";$("noteDescription").textContent=correctedNote>=0?"Auto-Tune mục tiêu: "+noteFromMidi(correctedNote):"Đang dò cao độ";$("tunerNeedle").style.left="50%";}else{$("noteName").textContent="—";$("frequency").textContent="— Hz";$("noteDescription").textContent="Hát một nốt rõ để dò";$("tunerNeedle").style.left="50%";}};
 source.connect(gain);gain.connect(tuneNode);tuneNode.connect(analyser);
 highPassFilter=ctx.createBiquadFilter();highPassFilter.type="highpass";highPassFilter.frequency.value=85;highPassFilter.Q.value=0.707;
 micCompressor=ctx.createDynamicsCompressor();micCompressor.threshold.value=-10;micCompressor.knee.value=12;micCompressor.ratio.value=3;micCompressor.attack.value=0.006;micCompressor.release.value=0.18;
 bassFilter=ctx.createBiquadFilter();bassFilter.type="lowshelf";bassFilter.frequency.value=180;bassFilter.gain.value=0;
 echoDelay=ctx.createDelay(1.2);echoDelay.delayTime.value=0.24;echoFeedback=ctx.createGain();echoWet=ctx.createGain();echoFeedback.gain.value=0.18;echoWet.gain.value=0;
 tuneNode.connect(bassFilter);bassFilter.connect(highPassFilter);
 feedbackAnalyser=ctx.createAnalyser();feedbackAnalyser.fftSize=8192;feedbackAnalyser.smoothingTimeConstant=0;
 highPassFilter.connect(feedbackAnalyser);
 let last=feedbackAnalyser;
 feedbackNotches=[];
 for(let i=0;i<3;i++){const n=ctx.createBiquadFilter();n.type="notch";n.frequency.value=1000+i*700;n.Q.value=12;feedbackNotches.push(n);last.connect(n);last=n;}
 last.connect(micCompressor);micCompressor.connect(monitorGain);highPassFilter.connect(echoDelay);echoDelay.connect(echoWet);echoWet.connect(monitorGain);echoDelay.connect(echoFeedback);echoFeedback.connect(echoDelay);monitorGain.connect(ctx.destination);
 startFeedbackGuard();
 updateMicGain();
 updateEffects();
 sendTuneSettings();
 if($("monitorToggle").checked)monitorGain.gain.setTargetAtTime(Number($("monitorVolume").value)/100,ctx.currentTime,.03);
 $("micStatus").textContent="MIC ĐANG BẬT";$("micStatus").classList.add("active");$("micButton").classList.add("enabled");$("micButton").textContent="⏹ Tắt micro";
 $("micHelp").textContent=isMobileDevice()?"Có thể hát bằng loa điện thoại hoặc loa ngoài. Để mặc định để dùng đầu vào của điện thoại; nếu tai nghe làm đổi micro, rút tai nghe để chắc chắn dùng micro máy. Bắt đầu âm lượng thấp và giảm ngay nếu hú.":"Có thể phát giọng ra loa ngoài. Bắt đầu âm lượng loa và nghe micro thấp, để micro phía sau loa và tăng từ từ; phần mềm chỉ giảm nguy cơ hú, không thể triệt hú tuyệt đối.";
}
function tick(){}
function updateMicGain(){if(gain&&ctx){const base=Number($("gainSlider").value)/100;const mic=Number($("micVolumeSlider")?$("micVolumeSlider").value:100)/100;gain.gain.setTargetAtTime(Math.max(0,Math.min(2,base*mic)),ctx.currentTime,.025);}}
function stopMic(){
 if(stream)stream.getTracks().forEach(t=>t.stop());
 if(ctx&&ctx.state!=="closed")ctx.close().catch(()=>{});
 if(feedbackTimer)clearInterval(feedbackTimer);feedbackTimer=null;feedbackAnalyser=null;feedbackNotches=[];feedbackCandidates={};stream=ctx=source=gain=analyser=monitorGain=tuneNode=bassFilter=highPassFilter=micCompressor=echoDelay=echoFeedback=echoWet=null;detectedNote=correctedNote=-1;
 $("monitorToggle").checked=false;$("micStatus").textContent="CHƯA KẾT NỐI";$("micStatus").classList.remove("active");$("micButton").classList.remove("enabled");$("micButton").textContent="🎤 Bật micro";
 $("noteName").textContent="—";$("frequency").textContent="— Hz";$("noteDescription").textContent="Bật micro để dò nốt";$("tunerNeedle").style.left="50%";
 $("micHelp").textContent="Auto-Tune cần HTTPS hoặc localhost và quyền micro. Đeo tai nghe khi bật nghe giọng.";
}
async function refreshMicDevices(){const select=$("micDeviceSelect");if(!select||!navigator.mediaDevices?.enumerateDevices)return;const old=chosenMicDevice;try{const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="audioinput");select.innerHTML="";const def=document.createElement("option");def.value="";def.textContent=isMobileDevice()?"Micro điện thoại / mặc định":"Micro mặc định của máy";select.appendChild(def);devices.forEach((d,i)=>{const o=document.createElement("option");o.value=d.deviceId;o.textContent=d.label||("Micro "+(i+1));if(isMobileDevice()&&/built.?in|phone|back mic|front mic|microphone array|micro điện thoại/i.test(d.label||""))o.textContent+=" · có thể là micro máy";select.appendChild(o);});if([...select.options].some(o=>o.value===old))select.value=old;else chosenMicDevice=select.value;}catch(e){select.innerHTML="<option value=\"\">Không thể liệt kê micro</option>";}}
if($("refreshMicDevices"))$("refreshMicDevices").addEventListener("click",refreshMicDevices);
if($("micDeviceSelect"))$("micDeviceSelect").addEventListener("change",async()=>{chosenMicDevice=$("micDeviceSelect").value;if(stream){stopMic();try{await startMic();}catch(e){stopMic();$("micHelp").textContent="Không mở được micro đã chọn: "+(e.message||"lỗi thiết bị");}}});
$("micButton").addEventListener("click",async()=>{if(stream){stopMic();return;}const b=$("micButton");b.disabled=true;b.textContent="Đang kết nối micro…";try{await startMic();await refreshMicDevices()}catch(e){stopMic();$("micHelp").textContent=(e.message||"Không thể bật micro.")+" Nếu trình duyệt báo lỗi AudioWorklet, tải lại trang."; }finally{b.disabled=false;}});
$("gainSlider").addEventListener("input",()=>{$("gainValue").textContent=$("gainSlider").value+"%";updateMicGain();});
if($("micVolumeSlider"))$("micVolumeSlider").addEventListener("input",()=>{$("micVolumeValue").textContent=$("micVolumeSlider").value+"%";updateMicGain();});
$("monitorToggle").addEventListener("change",()=>{if(!monitorGain||!ctx){if($("monitorToggle").checked){$("monitorToggle").checked=false;$("micHelp").textContent="Bật micro trước rồi mới bật nghe lại tiếng micro.";}return;}monitorGain.gain.setTargetAtTime($("monitorToggle").checked?Number($("monitorVolume").value)/100:0,ctx.currentTime,.03);});
$("monitorVolume").addEventListener("input",()=>{$("monitorValue").textContent=$("monitorVolume").value+"%";if(monitorGain&&ctx&&$("monitorToggle").checked)monitorGain.gain.setTargetAtTime(Number($("monitorVolume").value)/100,ctx.currentTime,.03);});
$("autotuneStrength").addEventListener("input",()=>{$("autotuneValue").textContent=$("autotuneStrength").value+"%";sendTuneSettings();});
$("autotuneToggle").addEventListener("change",()=>{sendTuneSettings();$("autotuneStatus").textContent=$("autotuneToggle").checked?"Auto-Tune đang chỉnh cao độ trực tiếp theo tông và thang âm đã chọn.":"Auto-Tune đã tắt; giọng micro nghe nguyên bản.";});
$("keySelect").addEventListener("change",sendTuneSettings);
if($("scaleSelect"))$("scaleSelect").addEventListener("change",sendTuneSettings);

const NOTE_NAMES=["Đô","Đô♯","Rê","Rê♯","Mi","Fa","Fa♯","Sol","Sol♯","La","La♯","Si"];
const NOTE_LATIN=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
const MAJOR=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const MINOR=[6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
let selectedAudioFile=null,analysisAudioContext=null;
$("songAudioFile").addEventListener("change",()=>{selectedAudioFile=$("songAudioFile").files[0]||null;$("audioFileName").textContent=selectedAudioFile?selectedAudioFile.name:"Chưa chọn file";$("toneStatus").textContent=selectedAudioFile?"SẴN SÀNG":"CHỜ FILE NHẠC";$("detectedKey").textContent="—";$("detectedScale").textContent="Chưa phân tích";$("useDetectedKey").disabled=true;});
function powerAt(data,start,size,sr,hz){const w=2*Math.PI*hz/sr,c=2*Math.cos(w);let a=0,b=0,d=0;for(let i=0;i<size;i++){const x=data[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(size-1)))+c*b-d;d=b;b=x;a=x;}return Math.max(0,b*b+d*d-c*b*d);}
function analyzeSongBuffer(buf){
 const data=buf.getChannelData(0),sr=buf.sampleRate,size=4096,step=Math.max(size,Math.floor((data.length-size)/80)),chroma=Array(12).fill(0);let frames=0;
 for(let start=0;start+size<data.length&&frames<80;start+=step){let energy=0;for(let i=0;i<size;i+=8)energy+=data[start+i]*data[start+i];if(energy<.00001)continue;const frame=Array(12).fill(0);for(let midi=36;midi<=84;midi++){const hz=440*Math.pow(2,(midi-69)/12);if(hz<sr/2)frame[midi%12]+=powerAt(data,start,size,sr,hz);}const sum=frame.reduce((x,y)=>x+y,0)||1;for(let n=0;n<12;n++)chroma[n]+=frame[n]/sum;frames++;}
 if(frames<3)throw Error("Không đủ âm thanh rõ để phân tích.");let best={score:-Infinity,root:0,scale:"Trưởng"},runner=-Infinity;
 for(let root=0;root<12;root++)for(const [scale,profile] of [["Trưởng",MAJOR],["Thứ",MINOR]]){let score=0;for(let n=0;n<12;n++)score+=chroma[(n+root)%12]*profile[n];if(score>best.score){runner=best.score;best={score,root,scale};}else if(score>runner)runner=score;}
 return {...best,frames,confidence:best.score?Math.max(0,(best.score-runner)/best.score):0};
}
$("analyzeTone").addEventListener("click",async()=>{if(!selectedAudioFile){$("toneStatus").textContent="CHỌN FILE TRƯỚC";$("toneHelp").textContent="Chọn file nhạc phía trên rồi bấm phân tích.";return;}const btn=$("analyzeTone");btn.disabled=true;$("useDetectedKey").disabled=true;$("toneStatus").textContent="ĐANG PHÂN TÍCH";$("detectedKey").textContent="…";try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error("Trình duyệt không hỗ trợ Web Audio.");if(!analysisAudioContext||analysisAudioContext.state==="closed")analysisAudioContext=new AC();const buf=await analysisAudioContext.decodeAudioData(await selectedAudioFile.arrayBuffer());const r=analyzeSongBuffer(buf);$("detectedKey").textContent=NOTE_NAMES[r.root]+" ("+NOTE_LATIN[r.root]+")";$("detectedScale").textContent=r.scale+" · "+Math.round(r.confidence*100)+"% phân biệt tương đối";$("toneStatus").textContent="ĐÃ PHÂN TÍCH";$("toneHelp").textContent="Ước lượng từ "+r.frames+" đoạn âm thanh; kết quả không phải bảo đảm chính xác tuyệt đối.";const use=$("useDetectedKey");use.dataset.root=String(r.root);use.dataset.scale=r.scale==="Thứ"?"2":"1";use.disabled=false;}catch(e){$("toneStatus").textContent="LỖI PHÂN TÍCH";$("detectedScale").textContent=e.message||"Thử file MP3, WAV hoặc M4A";}finally{btn.disabled=false;}});
$("useDetectedKey").addEventListener("click",()=>{if($("useDetectedKey").disabled)return;$("keySelect").selectedIndex=Number($("useDetectedKey").dataset.root||0);$("scaleSelect").value=$("useDetectedKey").dataset.scale||"1";sendTuneSettings();$("autotuneStatus").textContent="Đã áp dụng tông ước lượng từ file nhạc cho Auto-Tune của micro. Nếu nghe lệch, chỉnh tông thủ công.";});
let tabCapture=null,tabAudioContext=null,tabAnalyser=null,tabSource=null,tabCaptureTimer=null,tabChroma=Array(12).fill(0),tabFrames=0;
function finishTabCapture(message){
 if(tabCaptureTimer)clearInterval(tabCaptureTimer);tabCaptureTimer=null;
 if(tabCapture)tabCapture.getTracks().forEach(t=>t.stop());tabCapture=null;
 if(tabAudioContext&&tabAudioContext.state!=="closed")tabAudioContext.close().catch(()=>{});
 tabAudioContext=tabAnalyser=tabSource=null;
 $("analyzeYouTubeTone").disabled=false;
 if(message)$("toneHelp").textContent=message;
}
$("analyzeYouTubeTone").addEventListener("click",async()=>{
 if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){$("toneStatus").textContent="TRÌNH DUYỆT CHƯA HỖ TRỢ";$("toneHelp").textContent="Dùng Chrome/Edge trên máy tính hoặc chọn file nhạc bên dưới.";return;}
 if(tabCapture){finishTabCapture("Đã dừng thu âm thanh tab.");$("toneStatus").textContent="ĐÃ DỪNG";return;}
 try{
  $("analyzeYouTubeTone").disabled=true;
  $("toneStatus").textContent="ĐANG XIN QUYỀN";
  $("toneHelp").textContent="Trong hộp thoại chia sẻ, chọn tab đang phát YouTube và bật chia sẻ âm thanh tab. Nếu không chọn âm thanh, bộ dò sẽ không nhận được nhạc.";
  tabCapture=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true,preferCurrentTab:true,systemAudio:"include",selfBrowserSurface:"include"});
  if(!tabCapture.getAudioTracks().length)throw Error("Không nhận được âm thanh. Hãy dừng chia sẻ và chọn lại tab YouTube, nhớ bật Chia sẻ âm thanh tab.");
  const AC=window.AudioContext||window.webkitAudioContext;tabAudioContext=new AC();await tabAudioContext.resume();
  tabAnalyser=tabAudioContext.createAnalyser();tabAnalyser.fftSize=16384;tabAnalyser.smoothingTimeConstant=0;
  tabSource=tabAudioContext.createMediaStreamSource(new MediaStream(tabCapture.getAudioTracks()));tabSource.connect(tabAnalyser);
  const bins=new Float32Array(tabAnalyser.frequencyBinCount);tabChroma=Array(12).fill(0);tabFrames=0;
  $("toneStatus").textContent="NGHE NHẠC 20 GIÂY";$("detectedKey").textContent="…";$("detectedScale").textContent="Đang phân tích âm thanh tab";$("useDetectedKey").disabled=true;$("analyzeYouTubeTone").textContent="■ Dừng dò âm thanh";
  $("analyzeYouTubeTone").disabled=false;
  tabCapture.getTracks().forEach(track=>track.addEventListener("ended",()=>{if(tabCapture)finishTabCapture("Chia sẻ tab đã kết thúc.");}));
  const start=Date.now();
  tabCaptureTimer=setInterval(()=>{
   if(!tabAnalyser)return;
   tabAnalyser.getFloatFrequencyData(bins);
   const frame=Array(12).fill(0),sr=tabAudioContext.sampleRate,fft=tabAnalyser.fftSize;
   for(let midi=36;midi<=84;midi++){
    const f=440*Math.pow(2,(midi-69)/12),bin=Math.round(f*fft/sr);
    if(bin>1&&bin<bins.length-1){
     const db=Math.max(-100,bins[bin-1])+Math.max(-100,bins[bin])+Math.max(-100,bins[bin+1]);
     frame[midi%12]+=Math.pow(10,db/20);
    }
   }
   const sum=frame.reduce((a,b)=>a+b,0);
   if(sum>0){for(let n=0;n<12;n++)tabChroma[n]+=frame[n]/sum;tabFrames++;}
   const remain=Math.max(0,20-Math.floor((Date.now()-start)/1000));
   $("toneStatus").textContent="NGHE NHẠC "+remain+" GIÂY";
   if(Date.now()-start>=20000){
    clearInterval(tabCaptureTimer);tabCaptureTimer=null;
    let best={score:-Infinity,root:0,scale:"Trưởng"},runner=-Infinity;
    for(let root=0;root<12;root++)for(const [scale,profile] of [["Trưởng",MAJOR],["Thứ",MINOR]]){
     let score=0;for(let n=0;n<12;n++)score+=tabChroma[(n+root)%12]*profile[n];
     if(score>best.score){runner=best.score;best={score,root,scale};}else if(score>runner)runner=score;
    }
    if(tabFrames<15){$("toneStatus").textContent="ÂM THANH QUÁ NHỎ";$("detectedScale").textContent="Chưa đủ tín hiệu";$("toneHelp").textContent="Tăng âm lượng YouTube, kiểm tra chia sẻ âm thanh tab rồi thử lại.";}
    else{$("detectedKey").textContent=NOTE_NAMES[best.root]+" ("+NOTE_LATIN[best.root]+")";$("detectedScale").textContent=best.scale+" · phân tích trực tiếp tab";$("toneStatus").textContent="ĐÃ PHÂN TÍCH";$("toneHelp").textContent="Ước lượng từ âm thanh tab được mày chủ động chia sẻ. Độ chính xác có thể giảm nếu có lời nói, quảng cáo hoặc bài đổi tông.";const use=$("useDetectedKey");use.dataset.root=String(best.root);use.dataset.scale=best.scale==="Thứ"?"2":"1";use.disabled=false;}
    finishTabCapture();
    $("analyzeYouTubeTone").textContent="▶ Dò âm thanh tab đang phát";
   }
  },250);
 }catch(e){finishTabCapture();$("toneStatus").textContent="CHƯA THỂ DÒ";$("toneHelp").textContent=e.message||"Không thể lấy âm thanh tab. Thử lại hoặc dùng file nhạc.";$("analyzeYouTubeTone").textContent="▶ Dò âm thanh tab đang phát";}
});
function startFeedbackGuard(){
 if(feedbackTimer)clearInterval(feedbackTimer);
 const status=$("feedbackStatus");if(status)status.textContent=$("feedbackToggle").checked?"ĐANG GIÁM SÁT":"ĐÃ TẮT";
 feedbackTimer=setInterval(()=>{
  if(!ctx||!feedbackAnalyser||!feedbackNotches.length){if(status)status.textContent="CHỜ MICRO";return;}
  if(!$("feedbackToggle").checked){feedbackNotches.forEach(n=>{n.frequency.setTargetAtTime(20000,ctx.currentTime,.04);n.Q.setTargetAtTime(1,ctx.currentTime,.04);});if(status)status.textContent="ĐÃ TẮT";return;}
  const spectrum=new Float32Array(feedbackAnalyser.frequencyBinCount);feedbackAnalyser.getFloatFrequencyData(spectrum);
  const sr=ctx.sampleRate,fft=feedbackAnalyser.fftSize,candidates=[];
  for(let i=Math.ceil(250*fft/sr);i<Math.min(spectrum.length-5,Math.floor(4800*fft/sr));i++){
   const v=spectrum[i];if(!Number.isFinite(v)||v<-62)continue;
   let side=-120;for(let d=2;d<=5;d++)side=Math.max(side,spectrum[i-d],spectrum[i+d]);
   if(v-side>=8&&v>=spectrum[i-1]&&v>=spectrum[i+1])candidates.push({freq:i*sr/fft,score:v-side+Math.max(0,v+45)*.08});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const now=Date.now(),picked=[];
  for(const c of candidates){if(picked.every(p=>Math.abs(p.freq-c.freq)>Math.max(90,c.freq*.045)))picked.push(c);if(picked.length===3)break;}
  for(const c of picked){const key=Math.round(c.freq/35),prev=feedbackCandidates[key]||{count:0,last:0,freq:c.freq};prev.count=now-prev.last<700?prev.count+1:1;prev.last=now;prev.freq=c.freq;feedbackCandidates[key]=prev;}
  if(now-feedbackLastUpdate>1200){
   const stable=Object.values(feedbackCandidates).filter(x=>x.count>=4&&now-x.last<1400).sort((a,b)=>b.count-a.count).slice(0,3);
   stable.forEach((x,i)=>{if(feedbackNotches[i]){feedbackNotches[i].frequency.setTargetAtTime(Math.max(200,Math.min(5000,x.freq)),ctx.currentTime,.08);feedbackNotches[i].Q.setTargetAtTime(16,ctx.currentTime,.08);}});
   feedbackLastUpdate=now;
  }
  for(const k of Object.keys(feedbackCandidates))if(now-feedbackCandidates[k].last>4000)delete feedbackCandidates[k];
  if(status)status.textContent=picked.length?"ĐANG THEO DÕI ĐỈNH TẦN SỐ":"TÍN HIỆU ỔN ĐỊNH";
 },250);
}
function updateEffects(){
 const echo=Number($("echoSlider").value)/100,bass=Number($("bassSlider").value),delayMs=Number($("delaySlider").value);
 $("echoValue").textContent=$("echoSlider").value+"%";$("bassValue").textContent=$("bassSlider").value+"%";$("delayValue").textContent=delayMs+" ms";
 if(!ctx)return;
 if(echoWet)echoWet.gain.setTargetAtTime(echo,ctx.currentTime,.04);
 if(echoFeedback)echoFeedback.gain.setTargetAtTime(Math.min(.38,echo*.55),ctx.currentTime,.04);
 if(echoDelay)echoDelay.delayTime.setTargetAtTime(delayMs/1000,ctx.currentTime,.04);
 if(bassFilter)bassFilter.gain.setTargetAtTime(Math.max(-3,Math.min(6,(bass-25)*.12)),ctx.currentTime,.04);
}
$("echoSlider").addEventListener("input",updateEffects);
$("delaySlider").addEventListener("input",updateEffects);
$("bassSlider").addEventListener("input",updateEffects);
updateEffects();
if($("micVolumeSlider"))$("micVolumeValue").textContent=$("micVolumeSlider").value+"%";
if($("feedbackToggle"))$("feedbackToggle").addEventListener("change",()=>{if($("feedbackStatus"))$("feedbackStatus").textContent=$("feedbackToggle").checked?"ĐANG GIÁM SÁT":"ĐÃ TẮT";if(!$("feedbackToggle").checked&&ctx)feedbackNotches.forEach(n=>{n.frequency.setTargetAtTime(20000,ctx.currentTime,.04);n.Q.setTargetAtTime(1,ctx.currentTime,.04);});});
window.addEventListener("beforeunload",stopMic);
})();
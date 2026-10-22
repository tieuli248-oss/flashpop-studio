(() => {
"use strict";
const $ = id => document.getElementById(id);
const searchForm=$("searchForm"), queryInput=$("songQuery"), resultsBox=$("searchResults"), urlForm=$("youtubeForm"), urlInput=$("youtubeUrl"), frame=$("videoFrame"), msg=$("playerMessage");
let player=null,pendingId=null,stream=null,ctx=null,source=null,gain=null,analyser=null,monitorGain=null,raf=null,lastUpdate=0,searchController=null;
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
let tuneNode=null,detectedNote=-1,correctedNote=-1,bassFilter=null,echoDelay=null,echoFeedback=null,echoWet=null,toneActive=false,toneTimer=null,toneCounts=Array(12).fill(0),toneStarted=0,lastToneNote=-1;
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
 stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
 source=ctx.createMediaStreamSource(stream);gain=ctx.createGain();analyser=ctx.createAnalyser();monitorGain=ctx.createGain();
 analyser.fftSize=2048;monitorGain.gain.value=0;gain.gain.value=Number($("gainSlider").value)/100;
 await ctx.audioWorklet.addModule("/worklet.js");
 tuneNode=new AudioWorkletNode(ctx,"karaoke-tune-processor",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
 tuneNode.port.onmessage=e=>{detectedNote=e.data.detectedNote;correctedNote=e.data.correctedNote;const m=detectedNote;if(toneActive&&m>=0&&m!==lastToneNote){toneCounts[((m%12)+12)%12]++;lastToneNote=m;updateToneEstimate();}if(m>=0){$("noteName").textContent=noteFromMidi(m);$("frequency").textContent=(440*Math.pow(2,(m-69)/12)).toFixed(1)+" Hz";$("noteDescription").textContent=correctedNote>=0?"Auto-Tune mục tiêu: "+noteFromMidi(correctedNote):"Đang dò cao độ";$("tunerNeedle").style.left="50%";}else{$("noteName").textContent="—";$("frequency").textContent="— Hz";$("noteDescription").textContent="Hát một nốt rõ để dò";$("tunerNeedle").style.left="50%";}};
 source.connect(gain);gain.connect(tuneNode);tuneNode.connect(analyser);
 bassFilter=ctx.createBiquadFilter();bassFilter.type="lowshelf";bassFilter.frequency.value=180;bassFilter.gain.value=0;
 echoDelay=ctx.createDelay(1.2);echoDelay.delayTime.value=0.24;echoFeedback=ctx.createGain();echoWet=ctx.createGain();echoFeedback.gain.value=0.18;echoWet.gain.value=0;
 tuneNode.connect(bassFilter);bassFilter.connect(monitorGain);bassFilter.connect(echoDelay);echoDelay.connect(echoWet);echoWet.connect(monitorGain);echoDelay.connect(echoFeedback);echoFeedback.connect(echoDelay);monitorGain.connect(ctx.destination);
 updateEffects();
 sendTuneSettings();
 if($("monitorToggle").checked)monitorGain.gain.setTargetAtTime(Number($("monitorVolume").value)/100,ctx.currentTime,.03);
 $("micStatus").textContent="MIC ĐANG BẬT";$("micStatus").classList.add("active");$("micButton").classList.add("enabled");$("micButton").textContent="⏹ Tắt micro";
 $("micHelp").textContent="Auto-Tune đang xử lý giọng trực tiếp. Đeo tai nghe để tránh hú; loa ngoài có thể gây vọng.";
}
function tick(){}
function stopMic(){
 if(stream)stream.getTracks().forEach(t=>t.stop());
 if(ctx&&ctx.state!=="closed")ctx.close().catch(()=>{});
 if(toneTimer)clearTimeout(toneTimer);toneTimer=null;toneActive=false;stream=ctx=source=gain=analyser=monitorGain=tuneNode=bassFilter=echoDelay=echoFeedback=echoWet=null;detectedNote=correctedNote=-1;
 $("monitorToggle").checked=false;$("micStatus").textContent="CHƯA KẾT NỐI";$("micStatus").classList.remove("active");$("micButton").classList.remove("enabled");$("micButton").textContent="🎤 Bật micro";
 $("noteName").textContent="—";$("frequency").textContent="— Hz";$("noteDescription").textContent="Bật micro để dò nốt";$("tunerNeedle").style.left="50%";
 $("micHelp").textContent="Auto-Tune cần HTTPS hoặc localhost và quyền micro. Đeo tai nghe khi bật nghe giọng.";
}
$("micButton").addEventListener("click",async()=>{if(stream){stopMic();return;}const b=$("micButton");b.disabled=true;b.textContent="Đang kết nối micro…";try{await startMic()}catch(e){stopMic();$("micHelp").textContent=(e.message||"Không thể bật micro.")+" Nếu trình duyệt báo lỗi AudioWorklet, tải lại trang."; }finally{b.disabled=false;}});
$("gainSlider").addEventListener("input",()=>{$("gainValue").textContent=$("gainSlider").value+"%";if(gain&&ctx)gain.gain.setTargetAtTime(Number($("gainSlider").value)/100,ctx.currentTime,.02);});
$("monitorToggle").addEventListener("change",()=>{if(!monitorGain||!ctx){if($("monitorToggle").checked){$("monitorToggle").checked=false;$("micHelp").textContent="Bật micro trước rồi mới bật nghe lại tiếng micro.";}return;}monitorGain.gain.setTargetAtTime($("monitorToggle").checked?Number($("monitorVolume").value)/100:0,ctx.currentTime,.03);});
$("monitorVolume").addEventListener("input",()=>{$("monitorValue").textContent=$("monitorVolume").value+"%";if(monitorGain&&ctx&&$("monitorToggle").checked)monitorGain.gain.setTargetAtTime(Number($("monitorVolume").value)/100,ctx.currentTime,.03);});
$("autotuneStrength").addEventListener("input",()=>{$("autotuneValue").textContent=$("autotuneStrength").value+"%";sendTuneSettings();});
$("autotuneToggle").addEventListener("change",()=>{sendTuneSettings();$("autotuneStatus").textContent=$("autotuneToggle").checked?"Auto-Tune đang chỉnh cao độ trực tiếp theo tông và thang âm đã chọn.":"Auto-Tune đã tắt; giọng micro nghe nguyên bản.";});
$("keySelect").addEventListener("change",sendTuneSettings);
if($("scaleSelect"))$("scaleSelect").addEventListener("change",sendTuneSettings);

const NOTE_NAMES=["Đô","Đô♯","Rê","Rê♯","Mi","Fa","Fa♯","Sol","Sol♯","La","La♯","Si"];
const MAJOR=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const MINOR=[6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
function updateToneEstimate(){
 const total=toneCounts.reduce((a,b)=>a+b,0);
 if(total<5){$("toneStatus").textContent="ĐANG NGHE";$("detectedKey").textContent="…";$("detectedScale").textContent="Cần thêm nốt rõ";return;}
 let best={score:-Infinity,root:0,scale:"Trưởng"};
 for(let root=0;root<12;root++)for(const [scale,profile] of [["Trưởng",MAJOR],["Thứ",MINOR]]){
  let score=0;for(let n=0;n<12;n++)score+=toneCounts[(n+root)%12]*profile[n];
  if(score>best.score)best={score,root,scale};
 }
 $("toneStatus").textContent="CÓ ƯỚC LƯỢNG";
 $("detectedKey").textContent=NOTE_NAMES[best.root]+" ("+["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"][best.root]+")";
 $("detectedScale").textContent=best.scale+" · "+total+" mẫu nốt";
 $("useDetectedKey").disabled=false;$("useDetectedKey").dataset.root=String(best.root);$("useDetectedKey").dataset.scale=best.scale==="Thứ"?"2":"1";
}
$("analyzeTone").addEventListener("click",()=>{
 if(!stream){$("toneStatus").textContent="BẬT MICRO TRƯỚC";$("toneStatus").style.color="var(--pink)";return;}
 toneCounts=Array(12).fill(0);lastToneNote=-1;toneActive=true;toneStarted=Date.now();
 $("toneStatus").textContent="ĐANG NGHE 12 GIÂY";$("detectedKey").textContent="…";$("detectedScale").textContent="Hát/ngân theo nhạc";
 $("useDetectedKey").disabled=true;$("analyzeTone").disabled=true;
 toneTimer=setTimeout(()=>{toneActive=false;$("toneStatus").textContent="ĐÃ HOÀN TẤT";$("analyzeTone").disabled=false;updateToneEstimate();},12000);
});
$("useDetectedKey").addEventListener("click",()=>{
 if($("useDetectedKey").disabled)return;
 $("keySelect").selectedIndex=Number($("useDetectedKey").dataset.root||0);
 if($("scaleSelect"))$("scaleSelect").value=$("useDetectedKey").dataset.scale||"1";
 sendTuneSettings();$("autotuneStatus").textContent="Đã chọn tông gợi ý từ giọng mày hát. Nếu nhạc nền khác tông, hãy đổi lại thủ công.";
});
function updateEffects(){
 const echo=Number($("echoSlider").value)/100,bass=Number($("bassSlider").value),delayMs=Number($("delaySlider").value);
 $("echoValue").textContent=$("echoSlider").value+"%";$("bassValue").textContent=$("bassSlider").value+"%";$("delayValue").textContent=delayMs+" ms";
 if(!ctx)return;
 if(echoWet)echoWet.gain.setTargetAtTime(echo,ctx.currentTime,.04);
 if(echoFeedback)echoFeedback.gain.setTargetAtTime(Math.min(.38,echo*.55),ctx.currentTime,.04);
 if(echoDelay)echoDelay.delayTime.setTargetAtTime(delayMs/1000,ctx.currentTime,.04);
 if(bassFilter)bassFilter.gain.setTargetAtTime(bass*.12,ctx.currentTime,.04);
}
$("echoSlider").addEventListener("input",updateEffects);
$("delaySlider").addEventListener("input",updateEffects);
$("bassSlider").addEventListener("input",updateEffects);
updateEffects();

window.addEventListener("beforeunload",stopMic);
})();
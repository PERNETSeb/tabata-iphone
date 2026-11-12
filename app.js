(()=>{
  const $=id=>document.getElementById(id);
  const ui={label:$('phaseLabel'),timer:$('timer'),phase:$('phase'),nextLabel:$('nextLabel'),nextTime:$('nextTime'),rounds:$('roundsLeft'),cycles:$('cyclesLeft'),start:$('start'),status:$('status'),total:$('total')};
  let cfg={prep:5,work:59,rest:20,rounds:4,cycles:3},state={},tick=null,last=0,audioCtx=null,wakeLock=null;
  const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');

  async function unlockAudio(){
    const A=window.AudioContext||window.webkitAudioContext;
    if(!A)return false;
    if(!audioCtx)audioCtx=new A();
    try{
      if(audioCtx.state==='suspended')await audioCtx.resume();
      if(audioCtx.state!=='running')return false;
      tone(1320,0.07,0.10);
      return true;
    }catch(e){return false}
  }
  function tone(freq,duration,volume=0.08,delay=0){
    if(!audioCtx)return;
    const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type='square';o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(0.001,t+duration);
    o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+duration);
  }
  function metronome(){tone(1050,0.035,0.045)}
  function endBeep(){
    tone(1450,0.14,0.18,0);tone(1800,0.20,0.20,0.18);
    try{navigator.vibrate&&navigator.vibrate([120,70,180])}catch(e){}
  }
  async function requestWakeLock(){
    if(!state.running||document.visibilityState!=='visible'||!('wakeLock'in navigator))return;
    try{if(!wakeLock||wakeLock.released)wakeLock=await navigator.wakeLock.request('screen')}catch(e){wakeLock=null}
  }
  async function releaseWakeLock(){
    if(wakeLock){try{await wakeLock.release()}catch(e){}wakeLock=null}
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.running)requestWakeLock()});

  function reset(){
    clearInterval(tick);tick=null;releaseWakeLock();
    state={phase:'prep',left:cfg.prep,round:1,cycle:1,running:false,done:false,elapsed:0};render();
  }
  function phaseInfo(){
    if(state.phase==='prep')return['PRÉPARER','prep','EXERCICE',cfg.work];
    if(state.phase==='work')return['EXERCICE','work','REPOS',cfg.rest];
    if(state.phase==='rest')return['REPOS','rest','EXERCICE',cfg.work];
    return['TERMINÉ','done','',0];
  }
  function render(){
    const p=phaseInfo();ui.label.textContent=p[0];ui.timer.textContent=fmt(state.left);ui.phase.className='phase '+p[1];ui.nextLabel.textContent=p[2];ui.nextTime.textContent=p[2]?fmt(p[3]):'';
    ui.rounds.textContent=state.done?0:Math.max(0,cfg.rounds-state.round+1);ui.cycles.textContent=state.done?0:Math.max(0,cfg.cycles-state.cycle+1);
    ui.start.textContent=state.running?'Ⅱ':'▶';ui.status.textContent=state.done?'TERMINÉ':state.running?'PAUSE':'COMMENCER';ui.total.textContent=fmt(state.elapsed);
  }
  function advance(){
    endBeep();
    if(state.phase==='prep'){state.phase='work';state.left=cfg.work}
    else if(state.phase==='work'){state.phase='rest';state.left=cfg.rest}
    else if(state.round<cfg.rounds){state.round++;state.phase='work';state.left=cfg.work}
    else if(state.cycle<cfg.cycles){state.cycle++;state.round=1;state.phase='work';state.left=cfg.work}
    else{state.phase='done';state.left=0;state.done=true;state.running=false;clearInterval(tick);tick=null;releaseWakeLock()}
    render();
  }
  async function run(){
    if(!state.running)await unlockAudio();
    if(state.done)reset();state.running=!state.running;
    if(!state.running){clearInterval(tick);tick=null;releaseWakeLock();render();return}
    requestWakeLock();last=Date.now();
    tick=setInterval(()=>{
      if(!state.running)return;
      const now=Date.now(),secs=Math.floor((now-last)/1000);if(secs<1)return;last+=secs*1000;
      for(let i=0;i<secs&&state.running;i++){
        state.elapsed++;state.left--;
        if(state.left<=0)advance();else metronome();
      }
      render();
    },200);render();
  }

  function iosAudioUnlock(){
    const A=window.AudioContext||window.webkitAudioContext;
    if(!A)return;
    try{
      if(navigator.audioSession) navigator.audioSession.type='playback';
      if(!audioCtx)audioCtx=new A();
      if(audioCtx.state==='suspended')audioCtx.resume();
      const b=audioCtx.createBuffer(1,1,22050),src=audioCtx.createBufferSource();
      src.buffer=b;src.connect(audioCtx.destination);src.start(0);
    }catch(e){}
  }
  ui.start.addEventListener('touchstart',iosAudioUnlock,{passive:true});
  ui.start.addEventListener('pointerdown',iosAudioUnlock,{passive:true});
  ui.start.addEventListener('click',()=>{iosAudioUnlock();run()});$('resetTop').addEventListener('click',reset);$('settings').addEventListener('click',()=>fnPanel(true));
  function fnPanel(show){$('panel').classList.toggle('hidden',!show)}
  $('save').addEventListener('click',()=>{
    for(const k of ['prep','work','rest','rounds','cycles']){const v=parseInt($(k).value,10),max=(k==='work'?3600:k==='rest'?600:k==='prep'?60:99);cfg[k]=Math.min(max,Math.max(1,Number.isFinite(v)?v:cfg[k]));$(k).value=cfg[k]}
    fnPanel(false);reset();
  });
  document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();run()}});
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  reset();
})();

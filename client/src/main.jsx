import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {io} from 'socket.io-client';
import './styles.css';

const SIGNAL_URL = import.meta.env.VITE_SIGNAL_URL || 'http://localhost:3001';
const ICE = [{urls:'stun:stun.l.google.com:19302'}];

function App(){
 const socketRef=useRef(null), pcRef=useRef(null), localRef=useRef(null), remoteRef=useRef(null);
 const [status,setStatus]=useState('idle'),[messages,setMessages]=useState([]),[text,setText]=useState('');
 const [muted,setMuted]=useState(false),[camera,setCamera]=useState(true),[showReport,setShowReport]=useState(false);
 const [notice,setNotice]=useState('');
 useEffect(()=>{ const s=io(SIGNAL_URL); socketRef.current=s;
  s.on('waiting',()=>setStatus('waiting')); s.on('matched',async({initiator})=>{setStatus('connected'); setMessages([]); await startPeer(initiator)});
  s.on('signal',async({type,data})=>{ if(!pcRef.current) await createPeer(false); const pc=pcRef.current; if(type==='offer'){await pc.setRemoteDescription(data); const ans=await pc.createAnswer(); await pc.setLocalDescription(ans); s.emit('signal',{type:'answer',data:ans});} else if(type==='answer'){await pc.setRemoteDescription(data)} else if(type==='candidate'&&data){try{await pc.addIceCandidate(data)}catch{}}});
  s.on('chat-message',m=>setMessages(x=>[...x,{from:'stranger',text:m}])); s.on('partner-left',()=>{cleanupPeer();setStatus('idle');setNotice('Stranger disconnected. Click Next to meet someone new.')});
  return()=>{s.disconnect();cleanupPeer()}; },[]);
 async function createPeer(){ if(pcRef.current)return pcRef.current; const pc=new RTCPeerConnection({iceServers:ICE}); pcRef.current=pc;
  if(localRef.current?.srcObject) localRef.current.srcObject.getTracks().forEach(t=>pc.addTrack(t,localRef.current.srcObject));
  pc.onicecandidate=e=>{if(e.candidate)socketRef.current.emit('signal',{type:'candidate',data:e.candidate})};
  pc.ontrack=e=>{if(remoteRef.current)remoteRef.current.srcObject=e.streams[0]}; pc.onconnectionstatechange=()=>{if(['failed','disconnected','closed'].includes(pc.connectionState)){setStatus('idle')}}; return pc; }
 async function startPeer(initiator){ const pc=await createPeer(); if(initiator){const offer=await pc.createOffer(); await pc.setLocalDescription(offer); socketRef.current.emit('signal',{type:'offer',data:offer})} }
 async function find(){setNotice(''); try{const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true}); localRef.current.srcObject=stream; setStatus('searching'); socketRef.current.emit('find-partner')}catch{setNotice('Camera/microphone permission is required for video chat. You can still build a text-only version by changing the media request.')}}
 function cleanupPeer(){if(pcRef.current){pcRef.current.close();pcRef.current=null} if(localRef.current?.srcObject){localRef.current.srcObject.getTracks().forEach(t=>t.stop());localRef.current.srcObject=null} if(remoteRef.current)remoteRef.current.srcObject=null}
 async function next(){cleanupPeer();setMessages([]);setStatus('searching'); try{const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});localRef.current.srcObject=stream;socketRef.current.emit('next')}catch{setNotice('Allow camera and microphone access to continue.')}}
 function send(){const m=text.trim();if(!m)return;setMessages(x=>[...x,{from:'me',text:m}]);socketRef.current.emit('chat-message',m);setText('')}
 function toggleAudio(){const a=localRef.current?.srcObject?.getAudioTracks()[0];if(a){a.enabled=!a.enabled;setMuted(!a.enabled)}}
 function toggleVideo(){const v=localRef.current?.srcObject?.getVideoTracks()[0];if(v){v.enabled=!v.enabled;setCamera(v.enabled)}}
 function stop(){cleanupPeer();socketRef.current.emit('stop');setStatus('idle')}
 function report(){socketRef.current.emit('report', 'user reported');setShowReport(false);cleanupPeer();setStatus('idle');setNotice('Report submitted. The connection was ended.')}
 const connected=status==='connected';
 return <div className="app"><header><div className="brand">Stranger<span>Chat</span></div><div className="badge">Anonymous • Random</div></header>
  <main><section className="hero"><p className="eyebrow">MEET SOMEONE NEW</p><h1>Talk to a stranger.<br/><span>Make a connection.</span></h1><p className="sub">Instant random video and text chat. No profile required.</p>
   <div className="actions">{status==='idle'?<button className="primary" onClick={find}>Start chatting</button>:<button className="primary" onClick={next}>Next stranger</button>} {status!=='idle'&&<button className="secondary" onClick={stop}>Stop</button>}</div>
   <div className="status"><i className={status==='connected'?'live':''}></i>{status==='idle'?'Ready':status==='searching'?'Starting camera…':status==='waiting'?'Finding a stranger…':'Connected to a stranger'}</div>
  </section>
  <section className="chat-card"><div className="videos"><div className="video-box"><video ref={localRef} autoPlay muted playsInline/><label>You</label></div><div className="video-box"><video ref={remoteRef} autoPlay playsInline/><label>Stranger</label></div></div>
   <div className="controls"><button onClick={toggleAudio} disabled={!connected}>{muted?'Unmute':'Mute'}</button><button onClick={toggleVideo} disabled={!connected}>{camera?'Camera off':'Camera on'}</button><button className="danger" onClick={()=>setShowReport(true)} disabled={!connected}>Report</button></div>
   <div className="messages">{messages.length===0?<div className="empty">Your conversation will appear here.</div>:messages.map((m,i)=><div key={i} className={'msg '+m.from}><b>{m.from==='me'?'You':'Stranger'}</b><span>{m.text}</span></div>)}</div>
   <div className="composer"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message…"/><button onClick={send}>Send</button></div>
  </section></main><footer>Be respectful. Never share passwords, payment details, or private information.</footer>
  {notice&&<div className="toast">{notice}</div>}{showReport&&<div className="modal"><div className="modal-card"><h3>Report this stranger?</h3><p>The connection will end and a report will be recorded.</p><div><button className="secondary" onClick={()=>setShowReport(false)}>Cancel</button><button className="danger solid" onClick={report}>Report & disconnect</button></div></div></div>}
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);

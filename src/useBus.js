import {useEffect,useRef,useState} from 'react';
import {changhe,routeKey as key} from './providers';

export function useBus(){
 const [connection,setConnection]=useState('connecting'),[routes,setRoutes]=useState([]),[route,setRoute]=useState(null),[stations,setStations]=useState([]),[data,setData]=useState(null),[received,setReceived]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[automatic,setAutomatic]=useState(true),[stationData,setStationData]=useState(null);
 const socket=useRef(null),selected=useRef(null),pending=useRef(null),reconnect=useRef(null),handshake=useRef(null),probe=useRef(null),alive=useRef(false),ready=useRef(false),lastForeground=useRef(0);
 const clearPending=()=>{clearTimeout(pending.current?.timeout);pending.current=null;};
 const clearProbe=()=>{clearTimeout(probe.current);probe.current=null;};
 const dispose=()=>{
  clearTimeout(handshake.current);handshake.current=null;clearProbe();clearPending();ready.current=false;
  const old=socket.current;socket.current=null;
  if(old){old.onopen=old.onmessage=old.onerror=old.onclose=null;try{old.close();}catch{/* Already disposed by the WebView. */}}
 };
 const fail=(message,ws=socket.current)=>{
  if(!alive.current||ws!==socket.current)return;
  dispose();setLoading(false);setConnection('offline');setError(`${message}，5 秒后自动重连`);
  clearTimeout(reconnect.current);
  reconnect.current=setTimeout(()=>{reconnect.current=null;connect();},5000);
 };
 const send=message=>{
  const ws=socket.current;
  if(!ws||ws.readyState!==1){fail('连接已断开',ws);return false;}
  try{ws.send(JSON.stringify(message));return true;}catch{fail('发送失败',ws);return false;}
 };
 const request=(action,r)=>{
  if(!alive.current||!ready.current||pending.current||!r)return;
  setLoading(true);const ws=socket.current;
  const p={action,route:key(r),timeout:setTimeout(()=>{if(pending.current===p)fail('数据请求超时',ws);},15000)};
  pending.current=p;
  send({action,rid:r.rid,updown:r.upDown??0,...(action==='busPosition'?{staNO:0}:{})});
 };
 // Require an application reply: readyState alone cannot detect half-open sockets.
 const checkHealth=()=>{
  if(probe.current!==null)return;
  const ws=socket.current;
  probe.current=setTimeout(()=>fail('连接无响应',ws),5000);
  send({action:'search',keyword:''});
 };
 const connect=()=>{
  if(!alive.current)return;
  clearTimeout(reconnect.current);reconnect.current=null;dispose();
  setConnection('connecting');setError('');setLoading(false);
  let ws;
  try{ws=new WebSocket(changhe.endpoint);socket.current=ws;}catch{fail('无法建立连接');return;}
  handshake.current=setTimeout(()=>fail('连接超时',ws),20000);
  ws.onopen=()=>{if(ws===socket.current)send({action:'setCity',city:changhe.cityName});};
  ws.onmessage=e=>{
   if(!alive.current||ws!==socket.current)return;
   let m;try{m=JSON.parse(e.data);if(!m||typeof m!=='object')throw new Error('Invalid message');}catch{fail('收到无法解析的数据',ws);return;}
   if(m.error){
    if(!ready.current||probe.current!==null){fail(String(m.error),ws);return;}
    clearPending();setLoading(false);setError(String(m.error));return;
   }
   if(m.action==='citySet'){
    clearTimeout(handshake.current);handshake.current=null;ready.current=true;setConnection('connected');setError('');
    checkHealth();if(selected.current)request('routeStations',selected.current);return;
   }
   if(m.action==='searchResult'){
    if(!Array.isArray(m.data?.Routes)){fail('线路数据格式异常',ws);return;}
    clearProbe();setRoutes(m.data.Routes.map(changhe.normalizeRoute));setError('');return;
   }
   const p=pending.current;
   if(!p||!selected.current||m.action!==p.action||p.route!==key(selected.current))return;
   if(m.data?.rid!=null&&String(m.data.rid)!==String(selected.current.rid))return;
   clearPending();setLoading(false);setError('');
   if(m.action==='routeStations'){setStationData(m.data);setStations(Array.isArray(m.data?.stations)?m.data.stations:[]);request('busPosition',selected.current);}
   if(m.action==='busPosition'){
    if(!Array.isArray(m.data?.carPoses)){setError('车辆数据格式异常，保留上次结果');return;}
    setData(m.data);setReceived(Date.now());
   }
  };
  ws.onerror=()=>fail('网络连接异常',ws);
  ws.onclose=()=>fail('连接已断开',ws);
 };
 const foreground=()=>{
  if(!alive.current||document.hidden)return;
  // Android resume and visibilitychange may represent the same transition.
  const now=Date.now();if(now-lastForeground.current<1000)return;lastForeground.current=now;
  if(!socket.current||socket.current.readyState!==1||!ready.current){connect();return;}
  // Suspended requests must not let late replies satisfy a new request.
  if(pending.current||probe.current!==null){connect();return;}
  checkHealth();if(selected.current)request('routeStations',selected.current);
 };
 const choose=r=>{selected.current=r;setRoute(r);setStations([]);setStationData(null);setData(null);setReceived(null);setError('');connect();};
 const back=()=>{selected.current=null;setRoute(null);clearPending();setLoading(false);};
 const refresh=()=>request(stations.length?'busPosition':'routeStations',selected.current);
 useEffect(()=>{
  alive.current=true;connect();
  document.addEventListener('visibilitychange',foreground);
  window.addEventListener('bustrack-resume',foreground);
  window.addEventListener('pageshow',foreground);
  window.addEventListener('online',foreground);
  return()=>{
   alive.current=false;clearTimeout(reconnect.current);dispose();
   document.removeEventListener('visibilitychange',foreground);
   window.removeEventListener('bustrack-resume',foreground);
   window.removeEventListener('pageshow',foreground);
   window.removeEventListener('online',foreground);
  };
 },[]);
 useEffect(()=>{if(!automatic||!route)return;const id=setInterval(()=>{if(!document.hidden)request('busPosition',selected.current);},10000);return()=>clearInterval(id);},[automatic,route]);
 return {connection,routes,route,stations,data,received,error,loading,automatic,setAutomatic,choose,refresh,back,stationData};
}

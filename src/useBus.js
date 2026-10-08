import {useEffect,useRef,useState} from 'react';
import {changhe,routeKey as key} from './providers';
const text=v=>v==null?'—':String(v);
export function useBus(){
 const [connection,setConnection]=useState('connecting'),[routes,setRoutes]=useState([]),[route,setRoute]=useState(null),[stations,setStations]=useState([]),[data,setData]=useState(null),[received,setReceived]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[automatic,setAutomatic]=useState(true),[stationData,setStationData]=useState(null);
 const socket=useRef(),selected=useRef(null),pending=useRef(null),reconnect=useRef(),alive=useRef(true),ready=useRef(false),handshakeTimer=useRef();
 const clearPending=()=>{if(pending.current)clearTimeout(pending.current.timeout);pending.current=null;};
 const send=m=>{if(socket.current?.readyState===1){socket.current.send(JSON.stringify(m));return true;}return false;};
 const request=(action,r)=>{if(!ready.current||pending.current||!r)return;setLoading(true);const p={action,route:key(r),timeout:setTimeout(()=>{if(pending.current===p){pending.current=null;setLoading(false);setError('数据请求超时，请稍后刷新。');}},15000)};pending.current=p;send({action,rid:r.rid,updown:r.upDown??0,...(action==='busPosition'?{staNO:0}:{})});};
 const refresh=()=>request(stations.length?'busPosition':'routeStations',selected.current);
 const disposeSocket=()=>{clearTimeout(handshakeTimer.current);const old=socket.current;socket.current=null;if(old){old.onopen=null;old.onmessage=null;old.onerror=null;old.onclose=null;old.close();}};
 const connect=()=>{
  clearTimeout(reconnect.current);disposeSocket();setError('');
  clearPending();ready.current=false;setConnection('connecting');setLoading(false);const ws=new WebSocket(changhe.endpoint);socket.current=ws;
  const handshake=setTimeout(()=>{if(ws===socket.current&&!ready.current){setError('连接超时，请点击重连');ws.close();}},20000);handshakeTimer.current=handshake;
  ws.onopen=()=>{if(ws!==socket.current)return;send({action:'setCity',city:changhe.cityName});};
  ws.onmessage=e=>{if(ws!==socket.current)return;let m;try{m=JSON.parse(e.data);}catch{setError('收到无法解析的数据');return;}
   if(m.error){clearPending();setLoading(false);setError(text(m.error));return;}
   if(m.action==='citySet'){clearTimeout(handshake);ready.current=true;setConnection('connected');setError('');send({action:'search',keyword:''});if(selected.current)request('routeStations',selected.current);return;}
   if(m.action==='searchResult'){setRoutes(Array.isArray(m.data?.Routes)?m.data.Routes.map(changhe.normalizeRoute):[]);return;}
   const p=pending.current;if(!p||m.action!==p.action||p.route!==key(selected.current||{}))return;
   if(m.data?.rid!=null&&String(m.data.rid)!==String(selected.current.rid))return;
   clearPending();setLoading(false);setError('');
   if(m.action==='routeStations'){setStationData(m.data);setStations(Array.isArray(m.data?.stations)?m.data.stations:[]);request('busPosition',selected.current);}
   if(m.action==='busPosition'){if(!Array.isArray(m.data?.carPoses)){setError('车辆数据格式异常，保留上次结果');return;}setData(m.data);setReceived(Date.now());}
  };
  ws.onerror=()=>{if(ws===socket.current)setError('网络连接异常，正在尝试恢复');};
  ws.onclose=()=>{clearTimeout(handshake);if(ws!==socket.current)return;ready.current=false;clearPending();setLoading(false);setConnection('offline');if(alive.current)reconnect.current=setTimeout(connect,5000);};
 };
 const choose=r=>{selected.current=r;setRoute(r);setStations([]);setStationData(null);setData(null);setReceived(null);setError('');connect();};
 const back=()=>{selected.current=null;setRoute(null);clearPending();setLoading(false);};
 useEffect(()=>{alive.current=true;connect();return()=>{alive.current=false;clearTimeout(reconnect.current);clearPending();disposeSocket();};},[]);
 useEffect(()=>{if(!automatic||!route)return;const id=setInterval(()=>{if(!document.hidden)request('busPosition',selected.current);},10000);return()=>clearInterval(id);},[automatic,route]);
 return {connection,routes,route,stations,data,received,error,loading,automatic,setAutomatic,choose,refresh,retry:connect,back,stationData};
}

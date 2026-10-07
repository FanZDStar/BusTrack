import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BusFront,Search,ArrowUpRight,ArrowLeft,ArrowDownUp,RefreshCw,MapPin,ChevronRight,Radio,Clock,Navigation,WifiOff,ChevronDown} from 'lucide-react';
import './style.css';
const ENDPOINT=import.meta.env.VITE_BUS_WS_URL||'wss://bus.specialstardream.site';
const text=v=>v==null||v===''?'—':typeof v==='object'?JSON.stringify(v):String(v);
const time=d=>new Date(d).toLocaleTimeString('zh-CN',{hour12:false});
const key=r=>`${r.rid}:${r.upDown??0}`;
const hasZeroCars=r=>r.carnum!==null&&r.carnum!==undefined&&r.carnum!==''&&Number(r.carnum)===0;
function useBus(){
 const [connection,setConnection]=useState('connecting'),[routes,setRoutes]=useState([]),[route,setRoute]=useState(null),[stations,setStations]=useState([]),[data,setData]=useState(null),[received,setReceived]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[automatic,setAutomatic]=useState(true),[stationData,setStationData]=useState(null);
 const socket=useRef(),selected=useRef(null),pending=useRef(null),reconnect=useRef(),alive=useRef(true),ready=useRef(false);
 const clearPending=()=>{if(pending.current)clearTimeout(pending.current.timeout);pending.current=null;};
 const send=m=>{if(socket.current?.readyState===1){socket.current.send(JSON.stringify(m));return true;}return false;};
 const request=(action,r)=>{if(!ready.current||pending.current||!r)return;setLoading(true);const p={action,route:key(r),timeout:setTimeout(()=>{if(pending.current===p){pending.current=null;setLoading(false);setError('数据请求超时，请稍后刷新。');}},15000)};pending.current=p;send({action,rid:r.rid,updown:r.upDown??0,...(action==='busPosition'?{staNO:0}:{})});};
 const refresh=()=>request(stations.length?'busPosition':'routeStations',selected.current);
 const connect=()=>{
  clearPending();ready.current=false;setConnection('connecting');setLoading(false);const ws=new WebSocket(ENDPOINT);socket.current=ws;
  const handshake=setTimeout(()=>{if(ws.readyState===0)ws.close();},20000);
  ws.onopen=()=>{clearTimeout(handshake);if(ws!==socket.current)return;send({action:'setCity',city:'大连昌赫客运'});};
  ws.onmessage=e=>{if(ws!==socket.current)return;let m;try{m=JSON.parse(e.data);}catch{setError('收到无法解析的数据');return;}
   if(m.error){clearPending();setLoading(false);setError(text(m.error));return;}
   if(m.action==='citySet'){ready.current=true;setConnection('connected');setError('');send({action:'search',keyword:''});if(selected.current)request('routeStations',selected.current);return;}
   if(m.action==='searchResult'){setRoutes(Array.isArray(m.data?.Routes)?m.data.Routes:[]);return;}
   const p=pending.current;if(!p||m.action!==p.action||p.route!==key(selected.current||{}))return;
   if(m.data?.rid!=null&&String(m.data.rid)!==String(selected.current.rid))return;
   clearPending();setLoading(false);setError('');
   if(m.action==='routeStations'){setStationData(m.data);setStations(Array.isArray(m.data?.stations)?m.data.stations:[]);request('busPosition',selected.current);}
   if(m.action==='busPosition'){if(!Array.isArray(m.data?.carPoses)){setError('车辆数据格式异常，保留上次结果');return;}setData(m.data);setReceived(Date.now());}
  };
  ws.onerror=()=>setError('网络连接异常，正在尝试恢复');
  ws.onclose=()=>{clearTimeout(handshake);if(ws!==socket.current)return;ready.current=false;clearPending();setLoading(false);setConnection('offline');if(alive.current)reconnect.current=setTimeout(connect,5000);};
 };
 const choose=r=>{selected.current=r;setRoute(r);setStations([]);setStationData(null);setData(null);setReceived(null);setError('');clearTimeout(reconnect.current);if(socket.current){socket.current.onclose=null;socket.current.onmessage=null;socket.current.close();}connect();};
 const back=()=>{selected.current=null;setRoute(null);clearPending();setLoading(false);};
 useEffect(()=>{alive.current=true;connect();return()=>{alive.current=false;clearTimeout(reconnect.current);clearPending();if(socket.current){socket.current.onclose=null;socket.current.close();}};},[]);
 useEffect(()=>{if(!automatic||!route)return;const id=setInterval(()=>{if(!document.hidden)request('busPosition',selected.current);},10000);return()=>clearInterval(id);},[automatic,route]);
 return {connection,routes,route,stations,data,received,error,loading,automatic,setAutomatic,choose,refresh,back,stationData};
}
function Raw({label,value}){return <details className="raw"><summary>{label}<ChevronDown size={15}/></summary><pre>{JSON.stringify(value,null,2)}</pre></details>}
function App(){
 const bus=useBus(),[query,setQuery]=useState(''),[tab,setTab]=useState('stations'),[selectedCar,setSelectedCar]=useState(null),[now,setNow]=useState(Date.now());
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
 const {route,routes,data,stations}=bus;const cars=Array.isArray(data?.carPoses)?data.carPoses:[];
 const filtered=routes.filter(r=>`${r.rname} ${r.fstname} ${r.lstname}`.includes(query.trim()));
 const count=new Set(routes.map(r=>r.rid)).size;const stale=bus.received&&now-bus.received>30000;
 const select=r=>{bus.choose(r);setSelectedCar(null);setTab('stations');window.scrollTo({top:0});};
 const opposite=route&&routes.find(r=>r.rid===route.rid&&r.upDown!==route.upDown);
 return <div className="app">
 <aside className="sidebar"><a className="brand" href="#" onClick={e=>{e.preventDefault();bus.back();}}><span className="brand-icon"><BusFront size={23}/></span><span>沿途<small>BUSTRACK</small></span></a><div className="side-section">出行</div><button className="nav active" onClick={bus.back}><Navigation size={18}/>实时公交<ChevronRight size={15}/></button><div className="side-note">● 大连 · 昌赫客运<p>每一程，心中有数。</p></div></aside>
 <main><header><div className="location"><MapPin size={17}/><strong>大连</strong><span>/</span><span>昌赫客运</span></div><div className={'connection '+bus.connection}><i/>{bus.connection==='connected'?'已连接':bus.connection==='connecting'?'连接中':'已断开'}</div></header>
 {bus.error&&<div className="notice"><WifiOff size={17}/>{bus.error}</div>}
 {!route?<><section className="intro"><div><div className="eyebrow">在路上 · 大连</div><h1>下一程，<br className="mobile-break"/>从这里出发。</h1><p>查找线路，看看公交到哪了。</p></div><div className="intro-art"><div className="art-line"/><MapPin className="art-pin" size={28}/><BusFront size={52}/><span>沿途有你</span></div></section>
 <div className="search"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索线路或起终点，如 803、金石广场" aria-label="搜索线路"/>{query&&<button onClick={()=>setQuery('')}>清除</button>}</div>
 <div className="section-title"><h2>公交线路 <span>{count}</span></h2><span>按行驶方向选择</span></div>
 <div className="route-grid">{filtered.map(r=><button className={"route-card "+(hasZeroCars(r)?"no-vehicles":"")} key={key(r)} onClick={()=>select(r)}><div className="card-top"><strong>{r.rname}</strong><span className={r.carnum>0?'pill':'pill muted'}><i/>{r.carnum>0?`${r.carnum} 辆车`:hasZeroCars(r)?'暂无车辆数据':'车辆数未知'}</span></div><div className="endpoints"><span>{r.fstname}</span><ArrowUpRight size={18}/><span>{r.lstname}</span></div><div className="card-bottom"><span><Clock size={13}/>{r.fdtime&&r.ldtime?`${r.fdtime} — ${r.ldtime}`:'首末班时间未提供'}</span><ChevronRight size={17}/></div></button>)}</div>
 {!filtered.length&&<div className="empty"><BusFront size={32}/><h3>{bus.connection==='connected'?'暂无匹配线路':'正在获取线路'}</h3><p>{bus.connection==='connected'?'尝试线路编号或其他站名。':'连接成功后，线路会显示在这里。'}</p></div>}<footer>数据来自第三方公交服务 · 线路车辆数为列表获取时的快照</footer></>:<>
 <button className="back floating-back" onClick={()=>{bus.back();window.scrollTo({top:0});}}><ArrowLeft size={17}/>全部线路</button>
 <section className={"route-hero "+(bus.received&&cars.length===0?"no-vehicles-hero":"")}><div className="hero-top"><div><div className="eyebrow">昌赫客运 / 实时线路</div><h1>{route.rname}</h1></div><span className="hero-bus"><BusFront size={34}/></span></div><div className="hero-direction"><span>{route.fstname}</span><span className="direction-line">→</span><span>{route.lstname}</span><button disabled={!opposite} onClick={()=>select(opposite)} aria-label="切换方向"><ArrowDownUp size={19}/></button></div><div className="hero-meta"><span><Clock size={14}/>{route.fdtime||'—'} — {route.ldtime||'—'}</span><span>线路 ID {route.rid}</span><span>方向 {route.upDown??0}</span></div></section>
 {bus.received&&cars.length===0&&<div className="no-vehicles-notice" role="status"><BusFront size={22}/><div><strong>当前未返回运营车辆</strong><p>该方向本次车辆列表为空，可能尚未发车、已收班或数据暂缺。站点信息仍可查看。</p></div></div>}<div className="metrics"><div><span>本次返回车辆</span><strong>{bus.received?cars.length:'—'}<small>辆</small></strong></div><div><span>下一班发车字段</span><strong>{data?.ndTime||'—'}</strong></div><div><span>线路站点</span><strong>{stations.length||'—'}<small>站</small></strong></div></div>
 <div className="refresh-row"><span className={stale?'stale':''}><Radio size={14}/>{bus.received?`${time(bus.received)} 接收${stale?' · 数据可能已过期':''}`:'等待车辆数据'}</span><div><label><input type="checkbox" checked={bus.automatic} onChange={e=>bus.setAutomatic(e.target.checked)}/>自动刷新</label><button disabled={bus.loading||bus.connection!=='connected'} onClick={bus.refresh} aria-label="刷新车辆"><RefreshCw size={17} className={bus.loading?'spin':''}/></button></div></div>
 <div className="detail-grid"><section className="content-panel"><div className="tabs"><button className={tab==='stations'?'selected':''} onClick={()=>setTab('stations')}>站点实况 <span>{stations.length}</span></button><button className={tab==='vehicles'?'selected':''} onClick={()=>setTab('vehicles')}>车辆详情 <span>{cars.length}</span></button></div>
 {tab==='stations'?<div className="timeline">{stations.length?stations.map((s,i)=>{const here=cars.filter(c=>Number(c.staNO)===Number(s.staNO));return <div className={'station '+(here.length?'occupied':'')} key={`${s.staNO}:${i}`}><div className="track"><span>{i+1}</span></div><div className="station-content"><div className="station-name">{s.staName}{i===0&&<em>始</em>}{i===stations.length-1&&<em>终</em>}</div>{here.map(c=><button className="bus-chip" key={c.carID} onClick={()=>{setSelectedCar(c.carID);setTab('vehicles');}}><BusFront size={15}/><span>{c.inOut===0?'到站':'站点附近'} · {c.carID}</span>{c.distance>0&&<small>{c.distance} m*</small>}<ChevronRight size={13}/></button>)}</div></div>;}):<div className="empty"><MapPin size={28}/><h3>{bus.loading?'正在获取站点':'暂无站点数据'}</h3><p>车辆坐标可在「车辆详情」查看。</p></div>}</div>:<div className="vehicle-list">{cars.map(c=><article className={'vehicle '+(selectedCar===c.carID?'highlight':'')} key={c.carID}><div className="vehicle-heading"><BusFront size={20}/><strong>{c.carID}</strong><span>站序 {c.staNO}</span></div><p className="vehicle-station">{stations.find(s=>Number(s.staNO)===Number(c.staNO))?.staName||'站名未提供'}</p><dl>{[['纬度','lat'],['经度','lng'],['距离原值','distance'],['进出站标记','inOut'],['客流字段 PasFlow','PasFlow'],['拥挤字段 CongLeve','CongLeve'],['StaSpace','StaSpace'],['ArvInfo','ArvInfo']].map(([label,k])=><div key={k}><dt>{label}</dt><dd>{text(c[k])}</dd></div>)}</dl><Raw label="完整车辆信息" value={c}/></article>)}{!cars.length&&<div className="empty"><BusFront size={28}/><h3>{bus.loading?'正在查询车辆':'本次暂无车辆数据'}</h3><p>空列表不等于线路停运，可稍后刷新。</p></div>}</div>}
 </section><aside className="info-panel"><h3>这一程的信息</h3><dl><div><dt>运营方</dt><dd>大连昌赫客运</dd></div><div><dt>刷新间隔</dt><dd>{bus.automatic?'10 秒 · 前台刷新':'手动刷新'}</dd></div><div><dt>位置形式</dt><dd>站序 + 经纬度</dd></div></dl><p className="info-note">位置由数据服务返回。坐标系尚未验证，暂以站点实况与原始坐标展示。接收时间不代表车辆定位时间。</p><p className="info-note">* 距离按原网页以米展示，参考站点及进出站标记的确切定义待核实。客流字段的 0 不代表空车。</p><Raw label="完整线路信息" value={route}/><Raw label="完整站点数据" value={bus.stationData}/><Raw label="完整位置回包" value={data}/></aside></div></>}
 </main><div className="mobile-brand"><BusFront size={16}/>沿途 <span>BUSTRACK</span></div></div>;
}
createRoot(document.getElementById('root')).render(<App/>);




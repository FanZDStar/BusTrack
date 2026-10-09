import React,{useEffect,useRef,useState} from 'react';
import {MapPin,LocateFixed} from 'lucide-react';
import {routeKey} from './providers';

export function BoardingStop({route,stations,cars,received,onLocate}){
 const storageKey=`bustrack.boarding.${routeKey(route)}`;
 const [stop,setStop]=useState(()=>{try{return localStorage.getItem(storageKey)||'';}catch{return '';}});
 const [warning,setWarning]=useState('');
 const located=useRef(false);
 const station=stations.find(s=>String(s.staNO)===stop);
 useEffect(()=>{if(station&&!located.current){located.current=true;onLocate(stop,false);}},[station,stop,onLocate]);
 const choose=value=>{setStop(value);located.current=true;try{if(value)localStorage.setItem(storageKey,value);else localStorage.removeItem(storageKey);setWarning('');}catch{setWarning('本机存储不可用，本次选择仍然有效');}onLocate(value,Boolean(value));};
 const near=station?cars.filter(c=>String(c.staNO)===stop):[];
 return <section className="boarding-card" aria-label="我的上车站"><div className="boarding-title"><span><MapPin size={18}/>我的上车站</span><small>按行驶方向记住</small></div><div className="boarding-control"><select aria-label="选择上车站" value={station?stop:''} disabled={!stations.length} onChange={e=>choose(e.target.value)}><option value="">{stations.length?'选择常用站点':'等待站点信息'}</option>{stations.map((s,i)=><option key={`${s.staNO}:${i}`} value={String(s.staNO)}>{i+1}. {s.staName}</option>)}</select><button disabled={!station} onClick={()=>onLocate(stop,true)} aria-label="定位到我的上车站"><LocateFixed size={20}/></button></div><p>{station?(received?near.length?`本次有 ${near.length} 辆车关联到本站，点击定位查看。`:'本次没有车辆关联到本站，可查看沿线位置。':'正在等待车辆数据。'):'选好站点，下次打开此方向会自动定位。'}</p>{warning&&<p role="status">{warning}</p>}</section>;
}

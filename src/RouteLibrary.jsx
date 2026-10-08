import React,{useEffect,useState} from 'react';
import {BusFront,Search,Star,Clock,ArrowUpRight,ChevronRight,X} from 'lucide-react';
import {routeKey} from './providers';

const STORAGE='bustrack.library.v1';
const valid=r=>r&&typeof r==='object'&&['string','number'].includes(typeof r.rid)&&typeof r.rname==='string'&&r.providerId==='changhe-ws'&&r.cityId==='dalian';
const sanitize=items=>Array.isArray(items)?items.filter(valid).filter((r,i,a)=>a.findIndex(x=>routeKey(x)===routeKey(r))===i):[];
function read(){try{const value=JSON.parse(localStorage.getItem(STORAGE));return {favorites:sanitize(value?.favorites),recent:sanitize(value?.recent).slice(0,12)};}catch{return {favorites:[],recent:[]};}}
// Store route identity and display metadata only, never a vehicle-count snapshot.
const snapshot=r=>Object.fromEntries(['providerId','cityId','scopeId','rid','upDown','rname','fstname','lstname','fdtime','ldtime'].map(k=>[k,r[k]]));
export function useSavedRoutes(){
  const [library,setLibrary]=useState(read),[message,setMessage]=useState('');
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),2600);return()=>clearTimeout(timer);},[message]);
  const save=next=>{setLibrary(next);try{localStorage.setItem(STORAGE,JSON.stringify(next));}catch{setMessage('本机存储不可用，本次会话仍可使用');}};
  const isFavorite=r=>library.favorites.some(x=>routeKey(x)===routeKey(r));
  return {...library,message,isFavorite,toggle:r=>{
    const exists=isFavorite(r);
    setMessage(exists?'已取消收藏':'已收藏此方向');
    save({...library,favorites:exists?library.favorites.filter(x=>routeKey(x)!==routeKey(r)):[...library.favorites,snapshot(r)]});
  },visit:r=>save({...library,recent:[snapshot(r),...library.recent.filter(x=>routeKey(x)!==routeKey(r))].slice(0,12)}),clearRecent:()=>save({...library,recent:[]})};
}
export function FavoriteButton({route,saved,expanded=false}){
  const active=saved.isFavorite(route);
  return <button className={`${expanded?'hero-save':'favorite'} ${active?'is-saved':''}`} onClick={()=>saved.toggle(route)} aria-pressed={active} aria-label={`${active?'取消收藏':'收藏'} ${route.rname} ${route.fstname}至${route.lstname}`}><Star size={18} fill={active?'currentColor':'none'}/>{expanded&&(active?'已收藏':'收藏')}</button>;
}
export function RouteLibrary({routes,saved,select,connection,view,setView,query,setQuery}){
  const source=view==='all'?routes:(view==='favorites'?saved.favorites:saved.recent).map(r=>routes.find(item=>routeKey(item)===routeKey(r))||r);
  const filtered=source.filter(r=>`${r.rname} ${r.fstname} ${r.lstname}`.toLowerCase().includes(query.trim().toLowerCase()));
  const count=new Set(routes.map(r=>r.rid)).size;
  return <>
    <section className="intro"><div><div className="eyebrow">沿途 · 实时公交</div><h1>这一程，心中有数。</h1><p>查线路、看站点，找到你要等的车。</p></div><div className="compact-bus"><BusFront size={32}/></div></section>
    <div className="search"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索线路或起终点" aria-label="搜索线路或起终点"/>{query&&<button onClick={()=>setQuery('')} aria-label="清除搜索"><X size={18}/></button>}</div>
    <div className="section-title"><h2>{view==='all'?'公交线路':view==='favorites'?'我的收藏':'最近查看'} <span>{filtered.length} 个方向</span></h2>{view==='recent'&&saved.recent.length?<button className="clear-history" onClick={saved.clearRecent}>清空记录</button>:<span>{view==='all'?`${count} 条线路 · 按方向选择`:'保存在本机'}</span>}</div>
    <div className="route-grid">{filtered.map(r=>{
      const zero=r.carnum!=null&&r.carnum!==''&&Number(r.carnum)===0;
      return <article className={`route-card ${zero?'no-vehicles':''}`} key={routeKey(r)}><button className="route-open" onClick={()=>select(r)}><div className="card-top"><strong>{r.rname}</strong><span className={r.carnum>0?'pill':'pill muted'}><i/>{r.carnum>0?`${r.carnum} 辆车`:zero?'当前返回 0 辆':'车辆数未提供'}</span></div><div className="endpoints"><span>{r.fstname}</span><ArrowUpRight size={18}/><span>{r.lstname}</span></div><div className="card-bottom"><span><Clock size={13}/>{r.fdtime&&r.ldtime?`${r.fdtime} — ${r.ldtime}`:'首末班时间未提供'}</span><ChevronRight size={17}/></div></button><FavoriteButton route={r} saved={saved}/></article>;
    })}</div>
    {!filtered.length&&<div className="empty"><BusFront size={32}/><h3>{query?'未找到匹配线路':view==='favorites'?'收藏常坐的线路':view==='recent'?'还没有查看记录':connection==='connected'?'暂无线路':'正在获取线路'}</h3><p>{query?'试试线路编号或起终点名称。':view==='favorites'?'点击卡片上的星标，收藏你常坐的方向。':view==='recent'?'查看线路后，这里会保留最近 12 个方向。':'连接成功后，线路会显示在这里。'}</p></div>}
    <footer>数据来自第三方公交服务 · 车辆数为列表获取时的快照</footer>
  </>;
}

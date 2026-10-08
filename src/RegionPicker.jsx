import React,{useRef,useEffect,useState} from 'react';
import {MapPin,ChevronDown,X,Check} from 'lucide-react';
import {regions} from './providers';

export function RegionPicker(){
  const dialog=useRef(null),trigger=useRef(null);
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    if(!open)return;
    dialog.current.showModal();
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous;};
  },[open]);
  const close=()=>{dialog.current.close();setOpen(false);trigger.current.focus();};
  return <><button ref={trigger} className="location location-select" onClick={()=>setOpen(true)} aria-haspopup="dialog"><MapPin size={17}/><strong>大连</strong><span>/</span><span>昌赫客运</span><ChevronDown size={14}/></button>
    <dialog ref={dialog} className="region-sheet" aria-labelledby="region-title" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
      <div className="sheet-heading"><div><h2 id="region-title">城市与公交范围</h2><p>选择你要查询的服务范围</p></div><button onClick={close} aria-label="关闭"><X size={21}/></button></div>
      {regions.map(city=><section className="region-group" key={city.id}><h3><MapPin size={16}/>{city.name}</h3>{city.scopes.map(scope=><button className="region-option" key={scope.id} disabled={!scope.available} onClick={close}><span>{scope.name}<small>{scope.description}</small></span>{scope.available?<Check size={20}/>:<em>暂未接入</em>}</button>)}</section>)}
      <p className="region-footnote">已接入范围不代表该城市全部公交线路。</p>
    </dialog></>;
}

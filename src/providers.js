// City, service coverage and upstream provider are separate identities.
export const regions = [
  {id:'dalian',name:'大连',scopes:[
    {id:'changhe',name:'昌赫客运',description:'当前可查询范围',available:true,providerId:'changhe-ws'},
    {id:'urban',name:'主城区公交',description:'等待接入数据服务',available:false},
  ]},
  {id:'nanjing',name:'南京',scopes:[
    {id:'urban',name:'市区公交',description:'等待接入数据服务',available:false},
  ]},
];
export const routeKey = r => `${r.providerId||'changhe-ws'}:${r.cityId||'dalian'}:${r.rid}:${r.upDown??0}`;
export const changhe = {
  id:'changhe-ws',
  endpoint:import.meta.env.VITE_BUS_WS_URL||'wss://bus.specialstardream.site',
  cityName:'大连昌赫客运',
  capabilities:{vehiclePosition:true,vehicleId:true,arrivalEstimate:false,coordinateSystem:'unknown'},
  normalizeRoute:r=>({...r,providerId:'changhe-ws',cityId:'dalian',scopeId:'changhe'}),
};

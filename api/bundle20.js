import handler from './index.js';

export default async function bootstrapBundle(req,res){
  const cookies=String(req.headers?.cookie||'');
  const firstLoad=!/(?:^|;\s*)dsl_bootstrap_done=1(?:;|$)/.test(cookies);
  if(firstLoad){
    const host=(req.headers?.['x-forwarded-host']||req.headers?.host||'localhost').split(',')[0].trim();
    const proto=(req.headers?.['x-forwarded-proto']||'https').split(',')[0].trim();
    const u=new URL(req.url,`${proto}://${host}`);
    const requested=Number(u.searchParams.get('limit')||50);
    if(Number.isFinite(requested)&&requested>20)u.searchParams.set('limit','20');
    u.searchParams.set('__dsl_path','steam/bundle');
    req.url=`${u.pathname}?${u.searchParams.toString()}`;
    const originalEnd=res.end.bind(res);
    res.end=(...args)=>{
      if(res.statusCode>=200&&res.statusCode<300){
        res.setHeader('Set-Cookie','dsl_bootstrap_done=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400');
      }
      return originalEnd(...args);
    };
  }else{
    const host=(req.headers?.['x-forwarded-host']||req.headers?.host||'localhost').split(',')[0].trim();
    const proto=(req.headers?.['x-forwarded-proto']||'https').split(',')[0].trim();
    const u=new URL(req.url,`${proto}://${host}`);
    u.searchParams.set('__dsl_path','steam/bundle');
    req.url=`${u.pathname}?${u.searchParams.toString()}`;
  }
  return handler(req,res);
}

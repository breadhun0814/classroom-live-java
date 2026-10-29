/* Same-origin LAN API. Sessions live in Secure HttpOnly cookies, never localStorage. */
(() => {
  'use strict';
  async function request(path, body) {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: body === undefined ? {} : {'Content-Type':'application/json','X-Classroom-Request':'1'},
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000), cache:'no-store',
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || '서버 요청에 실패했습니다.');
    return data;
  }
  const wrap = async fn => { try { return {data:await fn(),error:null}; } catch(e) { return {data:null,error:{message:e.message}}; } };
  window.CLASSROOM_LOCAL = {
    rpc:(name,args)=>wrap(async()=>(await request('/api/rpc',{name,args})).data),
    auth:{
      getSession:()=>wrap(()=>request('/api/session')),
      signInWithPassword:({email,password})=>wrap(()=>request('/api/login',{login:email,password})),
      signUp:({email,password,options})=>wrap(()=>request('/api/signup',{login:email,password,nickname:options.data.display_name})),
      signOut:()=>wrap(()=>request('/api/logout',{})),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
    },
  };
})();

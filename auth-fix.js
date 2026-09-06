(() => {
  const originalFetch = window.fetch.bind(window);
  let bundleTimer = null;

  function isRussian(){
    return document.getElementById('authLangRu')?.classList.contains('active') || document.documentElement.lang === 'ru';
  }

  function resetPipelineToError(){
    const pipeline = document.getElementById('authLoadPipeline');
    if(!pipeline) return;
    pipeline.classList.remove('hidden');
    pipeline.querySelectorAll('.load-stage').forEach(el => {
      el.classList.remove('active');
      if(el.dataset.stage === 'connect') el.classList.add('done');
    });
    const history = pipeline.querySelector('[data-stage="history"]');
    if(history) history.classList.add('active');
  }

  function showAuthProblem(message){
    const gate = document.getElementById('authGate');
    const box = document.getElementById('authError');
    if(gate) gate.classList.remove('hidden');
    if(box){ box.textContent = message; box.classList.remove('hidden'); }
    resetPipelineToError();
    const login = document.getElementById('authLoginBtn');
    if(login){
      login.disabled = false;
      const label = login.querySelector('[data-i18n]');
      if(label) label.textContent = isRussian() ? 'Повторить вход через Steam' : 'Retry Steam sign-in';
    }
  }

  function friendlyBundleError(status, raw){
    const ru = isRussian();
    const text = String(raw || '');
    if(/private|status\s*15|Expose Public Match Data/i.test(text)){
      return ru
        ? 'Steam подтвердил аккаунт, но история Dota 2 закрыта. В Dota 2 включите: Настройки → Сообщество → «Предоставлять данные матча» (Expose Public Match Data), затем повторите вход.'
        : 'Steam sign-in succeeded, but Dota 2 match history is private. In Dota 2 enable Settings → Social → Expose Public Match Data, then retry.';
    }
    if(status === 401){
      return ru
        ? 'Steam подтвердил вход, но сессия не сохранилась в этом браузере. Откройте сайт напрямую в Chrome / Safari, а не во встроенном браузере Telegram, Discord или другого приложения, и повторите вход.'
        : 'Steam sign-in succeeded, but the session was not retained in this browser. Open the site directly in Chrome / Safari instead of an in-app browser and retry.';
    }
    if(status === 403 && /key=|api key|STEAM_API_KEY|verify your/i.test(text)){
      return ru
        ? 'Steam Login работает, но серверный Steam Web API key отклонён Steam. Это настройка Dota Skill Lab, а не вашего аккаунта.'
        : 'Steam Login works, but Steam rejected the server API key. This is a Dota Skill Lab server configuration issue, not your account.';
    }
    if(status === 504 || /timeout|timed out|abort/i.test(text)){
      return ru
        ? 'Steam аккаунт подтверждён, но загрузка матчей заняла слишком много времени. Повторите попытку — первый запуск может быть медленнее.'
        : 'Steam account is verified, but match loading timed out. Retry — the first load can take longer.';
    }
    return ru
      ? `Steam аккаунт подтверждён, но данные Dota 2 не загрузились${status ? ` (HTTP ${status})` : ''}. ${text.slice(0,220)}`
      : `Steam account is verified, but Dota 2 data failed to load${status ? ` (HTTP ${status})` : ''}. ${text.slice(0,220)}`;
  }

  window.fetch = async function(input, init){
    const url = String(typeof input === 'string' ? input : (input?.url || ''));
    const isBundle = url.includes('/api/steam/bundle');
    if(isBundle){
      clearTimeout(bundleTimer);
      bundleTimer = setTimeout(() => {
        showAuthProblem(isRussian()
          ? 'Steam аккаунт подтверждён. Загрузка истории длится слишком долго. Попробуйте ещё раз или откройте сайт напрямую в Chrome / Safari.'
          : 'Steam account is verified. Match history is taking too long to load. Retry or open the site directly in Chrome / Safari.');
      }, 90000);
    }
    try{
      const response = await originalFetch(input, init);
      if(isBundle){
        clearTimeout(bundleTimer);
        if(!response.ok){
          const clone = response.clone();
          let payload = '';
          try{
            const data = await clone.json();
            payload = data?.details || data?.error || JSON.stringify(data);
          }catch{
            try{ payload = await clone.text(); }catch{}
          }
          showAuthProblem(friendlyBundleError(response.status, payload));
        }
      }
      return response;
    }catch(error){
      if(isBundle){
        clearTimeout(bundleTimer);
        showAuthProblem(friendlyBundleError(0, error?.message || error));
      }
      throw error;
    }
  };
})();

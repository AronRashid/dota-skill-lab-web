// Endpoints are allowlisted so a configuration typo cannot transmit secrets elsewhere.
export function coachProvider(env=process.env) {
  const name=(env.COACH_PROVIDER || 'groq').trim().toLowerCase();
  const providers={
    groq:{endpoint:'https://api.groq.com/openai/v1/chat/completions',key:env.GROQ_API_KEY,model:'openai/gpt-oss-20b'},
    openai:{endpoint:'https://api.openai.com/v1/chat/completions',key:env.OPENAI_API_KEY,model:'gpt-4o-mini'}
  };
  const config=providers[name];
  return {name,endpoint:config?.endpoint,key:String(config?.key||'').trim(),model:String(env.COACH_MODEL||config?.model||'').trim()};
}
export function coachRequestBody(provider,messages,schema) {
  const common={model:provider.model,messages,stream:false,max_completion_tokens:700,
    response_format:{type:'json_schema',json_schema:{name:'coach_selection',strict:true,schema}}};
  // Groq Chat Completions does not support OpenAI's store parameter.
  // GPT-OSS reasoning consumes the completion budget; reserve room for final JSON.
  if(provider.name==='groq') return {...common,max_completion_tokens:1400,...(/^openai\/gpt-oss-(20b|120b)$/.test(provider.model)?{reasoning_effort:'low'}:{})};
  return {...common,store:false};
}

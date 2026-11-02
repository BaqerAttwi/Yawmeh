export const providers={
 openai:{key:'OPENAI_API_KEY',model:'OPENAI_MODEL',defaultModel:'gpt-4.1-mini'},
 claude:{key:'ANTHROPIC_API_KEY',model:'ANTHROPIC_MODEL',defaultModel:'claude-sonnet-4-5'},
 gemini:{key:'GEMINI_API_KEY',model:'GEMINI_MODEL',defaultModel:'gemini-2.5-flash'}
};
export function aiRequest(provider,messages,instructions,env=process.env){
 const config=providers[provider],key=env[config.key],model=env[config.model]||config.defaultModel;
 if(!key){const error=new Error(`Configure ${config.key} in the server .env file first.`);error.status=503;throw error;}
 const common={'Content-Type':'application/json'};
 if(provider==='claude')return {url:'https://api.anthropic.com/v1/messages',headers:{...common,'x-api-key':key,'anthropic-version':'2023-06-01'},body:{model,max_tokens:1200,system:instructions,messages}};
 if(provider==='gemini')return {url:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,headers:{...common,'x-goog-api-key':key},body:{systemInstruction:{parts:[{text:instructions}]},contents:messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{maxOutputTokens:1800}}};
 return {url:'https://api.openai.com/v1/responses',headers:{...common,Authorization:`Bearer ${key}`},body:{model,store:false,max_output_tokens:1200,instructions,input:messages}};
}
export function aiText(provider,result){
 if(provider==='claude')return result.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n');
 if(provider==='gemini')return result.candidates?.[0]?.content?.parts?.filter(p=>p.text&&!p.thought).map(p=>p.text).join('\n');
 return result.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n');
}

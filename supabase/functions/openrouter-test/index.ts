import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// TEMPORARY DIAGNOSTIC TOOL — REMOVE AFTER AUTH FIX
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || '';
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'meta-llama/llama-3.1-70b-instruct';
const LLM_ENDPOINT = Deno.env.get('LLM_ENDPOINT') || 'https://openrouter.ai/api/v1/chat/completions';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    if (!LLM_API_KEY) {
      return new Response(JSON.stringify({
        error: 'LLM_API_KEY is not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const prompt = 'Reply with a short JSON object that proves the model is reachable. Include keys: ok, message, model.';
    const response = await fetch(LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 200,
        temperature: 0,
        response_format: {
          type: 'json_object'
        },
        messages: [
          {
            role: 'system',
            content: 'You are a test endpoint. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    const json = await response.json().catch(()=>null);
    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'OpenRouter request failed',
        details: json
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const content = json?.choices?.[0]?.message?.content || null;
    return new Response(JSON.stringify({
      ok: true,
      model: LLM_MODEL,
      content
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

export function ok(data: unknown): Response {
  return new Response(JSON.stringify({ code: 'SUCCESS', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export function fail(message: string, status = 400): Response {
  return new Response(JSON.stringify({ code: 'FAIL', message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

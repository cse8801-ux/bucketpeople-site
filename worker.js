// 버킷피플 — Cloudflare Worker (정적 자산 + 관리자 OAuth)
// 정적 파일은 ASSETS로 서빙하고, /auth·/callback만 GitHub 로그인 처리를 한다.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/auth') return authRedirect(request, env);
    if (url.pathname === '/callback') return authCallback(request, env);
    // 정적 페이지에 검색 색인 금지 헤더를 붙여 응답 (조용한 운영)
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  },
};

// GitHub 로그인 1단계: GitHub 인증 페이지로 보내기
function authRedirect(request, env) {
  const clientId = env.OAUTH_CLIENT_ID;
  if (!clientId) return new Response('OAUTH_CLIENT_ID 환경변수가 설정되지 않았습니다.', { status: 500 });
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/callback`;
  const state = crypto.randomUUID();
  const authUrl =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=repo` +
    `&state=${encodeURIComponent(state)}`;
  return new Response(null, { status: 302, headers: { Location: authUrl, 'Cache-Control': 'no-cache' } });
}

// GitHub 로그인 2단계: 코드를 토큰으로 교환하고 Decap CMS에 전달
async function authCallback(request, env) {
  const code = new URL(request.url).searchParams.get('code');
  const clientId = env.OAUTH_CLIENT_ID;
  const clientSecret = env.OAUTH_CLIENT_SECRET;
  if (!code) return new Response('인증 코드가 없습니다.', { status: 400 });
  if (!clientId || !clientSecret) return new Response('OAuth 환경변수가 설정되지 않았습니다.', { status: 500 });

  let status, content;
  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await res.json();
    if (data.access_token) {
      status = 'success';
      content = { token: data.access_token, provider: 'github' };
    } else {
      status = 'error';
      content = { message: data.error_description || data.error || '토큰을 받지 못했습니다.' };
    }
  } catch (e) {
    status = 'error';
    content = { message: String(e) };
  }

  const payload = JSON.stringify(content);
  const body = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>인증 처리 중</title></head>
<body>
<p style="font-family:sans-serif;text-align:center;margin-top:40px;color:#555;">로그인 처리 중… 이 창은 자동으로 닫힙니다.</p>
<script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage('authorization:github:${status}:${payload}', e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>`;
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

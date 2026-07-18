// Cloudflare Pages Function — GitHub 로그인 1단계
// Decap 관리자에서 "GitHub으로 로그인"을 누르면 이 함수(/auth)가 호출된다.
export async function onRequestGet({ request, env }) {
  const clientId = env.OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response('OAUTH_CLIENT_ID 환경변수가 설정되지 않았습니다.', { status: 500 });
  }
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/callback`;
  const state = crypto.randomUUID();

  const authUrl =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=repo` +
    `&state=${encodeURIComponent(state)}`;

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl, 'Cache-Control': 'no-cache' },
  });
}

// GitHub 로그인 1단계: GitHub 인증 페이지로 보내기
// Decap 관리자에서 "GitHub으로 로그인"을 누르면 이 함수가 호출된다.

export const handler = async (event) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    return { statusCode: 500, body: 'OAUTH_CLIENT_ID 환경변수가 설정되지 않았습니다.' };
  }

  const host = event.headers.host;
  const redirectUri = `https://${host}/.netlify/functions/callback`;
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const authUrl =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=repo` +
    `&state=${encodeURIComponent(state)}`;

  return {
    statusCode: 302,
    headers: { Location: authUrl, 'Cache-Control': 'no-cache' },
    body: '',
  };
};

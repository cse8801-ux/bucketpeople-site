// GitHub 로그인 2단계: GitHub이 되돌려준 코드를 토큰으로 교환하고 Decap에 전달
// GitHub 인증 후 이 함수로 돌아온다.

export const handler = async (event) => {
  const code = event.queryStringParameters && event.queryStringParameters.code;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!code) return { statusCode: 400, body: '인증 코드가 없습니다.' };
  if (!clientId || !clientSecret) {
    return { statusCode: 500, body: 'OAuth 환경변수가 설정되지 않았습니다.' };
  }

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

  // Decap CMS(부모 창)에 결과를 전달하는 표준 핸드셰이크
  const payload = JSON.stringify(content);
  const body = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>인증 처리 중</title></head>
<body>
<p style="font-family:sans-serif;text-align:center;margin-top:40px;color:#555;">로그인 처리 중… 이 창은 자동으로 닫힙니다.</p>
<script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:${status}:${payload}',
      e.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body,
  };
};

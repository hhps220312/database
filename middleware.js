export const config = {
  matcher: ['/(.*)'],
};

export default function middleware(req) {
  const url = new URL(req.url);
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // ユーザー名とパスワードのチェック
    if (user === 'admin' && pwd === 'xctsw2zP2Z220312!') {
      return new Response(null, {
        headers: { 'x-middleware-next': '1' } // Vercelにそのままページを表示させる合図
      });
    }
  }

  // サインイン画面を出す
  return new Response('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Web サイトにサインイン"',
    },
  });
}

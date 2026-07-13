export const config = {
  matcher: ['/(.*)'],
};

export default function middleware(req) {
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // ユーザー名とパスワードのチェック
    if (user === 'admin' && pwd === 'xctsw2zP2Z220312!') {
      return new Response(null, {
        headers: { 'x-middleware-next': '1' }
      });
    }
  }

  // 👇 ここをブラウザがポップアップを出しやすい標準的な形式に変更しました
  return new Response('Access Denied', {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="secure_site"',
    },
  });
}

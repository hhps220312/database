import { NextResponse } from 'next/server';

export const config = {
  // サイト内のすべてのページ・画像・ファイルにサインインを要求する設定
  matcher: ['/(.*)'],
};

export function middleware(req) {
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // ユーザー名とパスワードを設定
    if (user === 'hajime' && pwd === 'xctsw2zP2Z220312!') {
      return NextResponse.next();
    }
  }

  // 認証が間違っているか、まだ入力していない場合はサインイン画面を出す
  return new NextResponse('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Web サイトにサインイン"',
    },
  });
}

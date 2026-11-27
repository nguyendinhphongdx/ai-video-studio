import { Suspense } from 'react';

import { AuthForm } from '@/features/auth/AuthForm';

export const metadata = { title: 'Đăng nhập' };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}

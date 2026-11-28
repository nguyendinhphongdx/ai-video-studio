import { Suspense } from 'react';

import { AuthForm } from '@/features/auth/AuthForm';

export const metadata = { title: 'Tạo tài khoản' };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginInput, AuthResponseDto } from '@mess/shared';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiClientError } from '@/lib/api-client';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted }
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      phone: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      const result = await apiFetch<AuthResponseDto>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      login(result);
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setServerError(
          err.errorCode === 'INVALID_CREDENTIALS' ? t('invalidCredentials') : err.message
        );
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError(tCommon('error'));
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
      <div className="fixed top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-primary">{tCommon('appName')}</h1>
          </Link>
          <p className="text-sm text-text-secondary mt-1">{t('loginSubtitle')}</p>
        </div>

        <Card className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-text-primary mb-5">{t('loginTitle')}</h2>

          {serverError && (
            <div
              role="alert"
              className="p-3.5 mb-5 rounded-token bg-danger-surface border border-danger/30 text-sm text-danger font-medium"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label={t('phoneLabel')}
              placeholder={t('phonePlaceholder')}
              type="tel"
              autoComplete="tel"
              error={isSubmitted ? errors.phone?.message : undefined}
              {...register('phone')}
            />

            <Input
              label={t('passwordLabel')}
              placeholder={t('passwordPlaceholder')}
              type="password"
              autoComplete="current-password"
              error={isSubmitted ? errors.password?.message : undefined}
              {...register('password')}
            />

            <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
              {t('loginButton')}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <Link
              href="/register"
              className="text-sm font-medium text-primary hover:text-primary-hover hover:underline"
            >
              {t('noAccount')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

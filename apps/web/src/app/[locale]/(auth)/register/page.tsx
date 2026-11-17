'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, RegisterInput, AuthResponseDto } from '@mess/shared';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiClientError } from '@/lib/api-client';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      phone: '',
      password: ''
    }
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      const result = await apiFetch<AuthResponseDto>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      login(result);
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError(tCommon('error'));
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-surface text-primary border border-primary/20 shadow-xs mb-3">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{tCommon('appName')}</h1>
          <p className="text-sm text-text-secondary mt-1">{t('registerSubtitle')}</p>
        </div>

        <Card className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-text-primary mb-6">{t('registerTitle')}</h2>

          {serverError && (
            <div className="p-3.5 mb-5 rounded-token bg-danger-surface border border-danger/30 text-sm text-danger font-medium">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={t('nameLabel')}
              placeholder={t('namePlaceholder')}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label={t('phoneLabel')}
              placeholder={t('phonePlaceholder')}
              type="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label={t('passwordLabel')}
              placeholder={t('passwordPlaceholder')}
              type="password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
              {t('registerButton')}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary-hover hover:underline transition-colors"
            >
              {t('hasAccount')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

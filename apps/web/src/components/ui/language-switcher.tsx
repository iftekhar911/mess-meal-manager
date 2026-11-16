'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '../../i18n/routing';

/**
 * Language switcher toggling between Bangla (default) and English.
 */
export const LanguageSwitcher: React.FC = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const nextLocale = locale === 'bn' ? 'en' : 'bn';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button
      onClick={toggleLanguage}
      className="h-9 px-3 bg-surface border border-border rounded-token text-sm font-medium text-text-primary hover:bg-surface-elevated transition-colors focus-ring"
      aria-label="Switch Language"
    >
      {locale === 'bn' ? 'English' : 'বাংলা'}
    </button>
  );
};

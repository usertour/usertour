import React from 'react';
import { useTranslation } from 'react-i18next';

export type ErrorPageProps = {
  type?: '403' | '404' | '500';
};

export const ErrorPage: React.FC<ErrorPageProps> = ({ type }) => {
  const { t } = useTranslation();

  const showResult = () => {
    if (type === '403') {
      return <>{t('error.forbidden')}</>;
    }
    if (type === '500') {
      return <>{t('error.serverError')}</>;
    }
    if (type === '404') {
      return <>{t('error.notFound')}</>;
    }
    return null;
  };

  return <h1>{showResult()}</h1>;
};

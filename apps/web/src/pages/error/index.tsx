import React from 'react';

export type ErrorPageProps = {
  type?: '403' | '404' | '500';
};

export const ErrorPage: React.FC<ErrorPageProps> = ({ type }) => {
  const unauth = 'You are not authorized to access this page.';
  const notFound = 'The page you are trying to visit does not exist.';
  const serverErr = 'Oops! Something is wrong with the server. Please Try again later';

  // The reason we use this function is because the ant.design "Result"
  // component does not call our t() function
  // const getTranslation = (value: string) => {
  //     return i18n.getDataByLanguage(lang || "en").translation[value];
  // };

  const showResult = () => {
    if (type === '403') {
      return <>{unauth}</>;
    }
    if (type === '500') {
      return <>{serverErr}</>;
    }
    if (type === '404') {
      return <>{notFound}</>;
    }
    return null;
  };

  return <h1>{showResult()}</h1>;
};

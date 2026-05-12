import { ThemeTypesSetting } from '@usertour/types';
import { buildGoogleFontUrl, shouldLoadGoogleFont } from '@usertour/helpers';
import { Helmet } from 'react-helmet-async';

export const GoogleFontCss = (props: { settings: ThemeTypesSetting }) => {
  const { settings } = props;
  const fontFamily = settings?.font?.fontFamily;
  if (shouldLoadGoogleFont(fontFamily)) {
    return (
      <Helmet>
        <link href={buildGoogleFontUrl(fontFamily)} rel="stylesheet" type="text/css" />
      </Helmet>
    );
  }
  return <></>;
};

GoogleFontCss.displayName = 'GoogleFontCss';

import { ThemeTypesSetting } from "@usertour-ui/types";
import { Helmet } from "react-helmet-async";

export const GoogleFontCss = (props: { settings: ThemeTypesSetting }) => {
  const { settings } = props;
  if (settings && settings?.font?.fontFamily) {
    return (
      <Helmet>
        <link
          href={`https://fonts.googleapis.com/css2?family=${settings.font.fontFamily}`}
          rel="stylesheet"
          type="text/css"
        ></link>
      </Helmet>
    );
  }
  return <></>;
};

GoogleFontCss.displayName = "GoogleFontCss";

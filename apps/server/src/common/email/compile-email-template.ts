import handlebars from "handlebars";
import mjml2html from "mjml";
import { promises } from "fs";
import { join } from "path";

type Props = {
  fileName: string;
  data: {
    date?: string;
    name?: string;
    url?: string;
    teamName?: string;
    link?: string;
  };
};

export default async function compileEmailTemplate({
  fileName,
  data,
}: Props): Promise<string> {
  const templatePath =
    process.env.NODE_ENV === "production"
      ? join(__dirname, "../../email-templates", fileName)
      : join("src/email-templates", fileName);

  const mjMail = await promises.readFile(templatePath, "utf8");
  const template = mjml2html(mjMail).html;
  return handlebars.compile(template)(data).toString();
}

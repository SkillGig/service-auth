import nconf from "nconf";
import path from "path";

const getConfigFile = (environment) => {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const configDir = path.join(__dirname, environment);
  return path.join(configDir, "keys.json");
};

export const readFileToNconf = () => {
  const environment = process.env.NODE_ENV || "development";
  const configFile = getConfigFile(environment);

  nconf.file({ file: configFile });
  nconf.env();
  nconf.argv();

  return nconf;
};

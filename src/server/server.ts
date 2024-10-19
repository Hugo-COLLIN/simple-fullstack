import {init} from "./steps/init.ts";
import {serve} from "./steps/serve.ts";

export const ENDPOINTS_PROJECT_PATH = "./src/views/endpoints/";

async function main() {
  const routes = await init();
  serve(routes);
}

main();

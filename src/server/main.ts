import {init} from "./steps/init.ts";
import {serve} from "./steps/serve.ts";

async function main() {
  const routes = await init();
  serve(routes);
}

main();

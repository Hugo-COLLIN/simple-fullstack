import {Glob, serve} from "bun";
import {load} from "js-yaml";
import {initDatabaseFromConfig, handleEntityRequest} from "./database.ts";
import {determineRoute, handlePugRendering} from "./routing/pages.ts";
import type {ApiConfig} from "./routing/types.ts";
import {matchRoute} from "./routing/router.ts";

const API_CONFIG_PATH = "./src/views/api/";
export const PAGES_PROJECT_PATH = "./src/views/pages/";

async function main() {
  // Initialize the database from YAML configuration
  const api = new Glob(API_CONFIG_PATH + "*.yaml");

  await createDatabase(api);

  const routes = await createRoutes(api);

  // Serve the routes
  const server = serve({
    fetch(req: Request) {
      const url = new URL(req.url);
      const routeResult = matchRoute(req.method, url.pathname, routes);

      if (routeResult) {
        const {handler, params} = routeResult;
        return handler(req, params);
      }

      return new Response("Not Found", {status: 404});
    },
    port: 3001,
  });

  console.log(`Server started on ${server.url}`);
}

async function createDatabase(api: Glob) {
  for (const file of api.scanSync(".")) {
    const fileContent = Bun.file(file);
    const config = load(await fileContent.text());
    console.log("Loaded YAML file:", file, "with content of:", config);
    initDatabaseFromConfig(config); // Initialize tables from the config
  }
}

async function createRoutes(api: Glob) {
  const routes: Record<string, Record<string, (req: Request, params?: Record<string, string>) => Promise<Response> | Response>> = {};
  const pages = new Glob(PAGES_PROJECT_PATH + "*.pug");

  // Browse all files in the "views" folder
  for (const file of pages.scanSync(".")) {
    const routePath = determineRoute(file);
    if (!routes[routePath]) routes[routePath] = {};
    routes[routePath]["GET"] = handlePugRendering(file);
  }

  // Define API routes dynamically based on the YAML configuration
  for (const file of api.scanSync(".")) {
    const fileContent = Bun.file(file);
    const config = load(await fileContent.text()) as ApiConfig;
    console.log("Loaded YAML file:", file, "with content:", config);

    const entity = config.model.table;

    console.log("Entity found:", entity);

    // Dynamic API route handling based on the configuration
    if (config.routes.create) {
      if (!routes[`/api/${entity}`]) routes[`/api/${entity}`] = {};
      routes[`/api/${entity}`]["POST"] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "create", entity);
    }
    if (config.routes.readAll) {
      if (!routes[`/api/${entity}`]) routes[`/api/${entity}`] = {};
      routes[`/api/${entity}`]["GET"] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "readAll", entity);
    }
    if (config.routes.read) {
      if (!routes[`/api/${entity}/:id`]) routes[`/api/${entity}/:id`] = {};
      routes[`/api/${entity}/:id`]["GET"] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "read", entity, params?.id);
    }
    if (config.routes.update) {
      if (!routes[`/api/${entity}/:id`]) routes[`/api/${entity}/:id`] = {};
      routes[`/api/${entity}/:id`]["PUT"] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "update", entity, params?.id);
    }
    if (config.routes.delete) {
      if (!routes[`/api/${entity}/:id`]) routes[`/api/${entity}/:id`] = {};
      routes[`/api/${entity}/:id`]["DELETE"] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "delete", entity, params?.id);
    }
  }

  routes["/"]["GET"] = async function () {
    const response = await handleEntityRequest(null, "readAll", "todos");

    if (response.ok) {
      const todos = await response.json();
      return handlePugRendering(PAGES_PROJECT_PATH + "index.pug", {todos})();
    } else {
      return new Response("Failed to load todos", {status: 500});
    }
  };

  console.info(routes);

  return routes;
}

main();

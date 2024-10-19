import {load} from "js-yaml";
import {handleEntityRequest, initDatabaseFromConfig} from "../logic/database.ts";
import {api, ENDPOINTS_PROJECT_PATH, handlePugRendering, pages} from "../logic/views.ts";
import type {ApiConfig} from "../types/apiConfig.ts";
import {addRoute, determineRouteName, routes} from "../logic/routes.ts";

export async function init() {
  await createDatabase();
  return await createRoutes();
}


// --- Tree-structure-based entities generation ---

async function createDatabase() {
  for (const file of api.scanSync(".")) {
    const fileContent = Bun.file(file);
    const config = load(await fileContent.text());
    // console.log("Loaded YAML file:", file, "with content of:", config);
    initDatabaseFromConfig(config); // Initialize tables from the config
  }
}

async function createRoutes() {
  // Browse views and configure "GET" routes dynamically
  for (const file of pages.scanSync(".")) {
    addRoute(determineRouteName(file), "GET", handlePugRendering(file));
  }

  // Browse API files and dynamically configure routes based on YAML configuration
  for (const file of api.scanSync(".")) {
    const config = load(await Bun.file(file).text()) as ApiConfig;
    const baseRoute = determineRouteName(file);
    const entity = config.model.table;

    const entityHandler = (action: string, id?: string) => (req: Request, params?: Record<string, string>) =>
      handleEntityRequest(req, action, entity, id || params?.id);

    if (config.routes.create) addRoute(baseRoute, "POST", entityHandler("create"));
    if (config.routes.readAll) addRoute(baseRoute, "GET", entityHandler("readAll"));
    if (config.routes.read) addRoute(`${baseRoute}/:id`, "GET", entityHandler("read"));
    if (config.routes.update) addRoute(`${baseRoute}/:id`, "PUT", entityHandler("update"));
    if (config.routes.delete) addRoute(`${baseRoute}/:id`, "DELETE", entityHandler("delete"));
  }

  routes["/"]["GET"] = async function () {
    const response = await handleEntityRequest(null, "readAll", "todos");

    if (response.ok) {
      const todos = await response.json();
      return handlePugRendering(ENDPOINTS_PROJECT_PATH + "index.pug", {todos})();
    } else {
      return new Response("Failed to load todos", {status: 500});
    }
  };

  console.info(routes);

  return routes;
}


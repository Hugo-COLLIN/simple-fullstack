import {Glob, serve} from "bun";
import {renderFile} from "pug";
import {createToDo, deleteToDo, initDatabase, readToDoList} from "./service.ts";
import {determineRoute, handlePugRendering, matchRoute} from "./routing/pages.ts";

export const PAGES_PROJECT_PATH = "./src/views/pages/";
const COMPONENTS_PROJECT_PATH = "./src/views/components/";

function main() {
  initDatabase(); // Initialize the SQLite database

  // Browse all files in the "views" folder
  const routes: Record<string, (req: Request, params?: Record<string, string>) => Promise<Response> | Response> = {};
  const pages = new Glob(PAGES_PROJECT_PATH + "*.pug");

  for (const file of pages.scanSync(".")) {
    const routePath = determineRoute(file);
    routes[routePath] = handlePugRendering(file);
  }

  // Generic API routes for managing entities
  routes["/api/:entity"] = async function(req: Request, params?: Record<string, string>) {
    if (!params || !params.entity) {
      return new Response("Entity type not specified", { status: 400 });
    }

    const entity = params.entity.toLowerCase();

    switch (req.method) {
      case "POST":
        return handleCreateEntity(req, entity);
      case "GET":
        return handleReadEntityList(entity);
      default:
        return new Response("Method not allowed", { status: 405 });
    }
  };

  routes["/api/:entity/:id"] = async function(req: Request, params?: Record<string, string>) {
    if (!params || !params.entity || !params.id) {
      return new Response("Invalid entity or ID", { status: 400 });
    }

    const entity = params.entity.toLowerCase();
    const id = parseInt(params.id, 10);

    switch (req.method) {
      case "DELETE":
        return handleDeleteEntity(entity, id);
      default:
        return new Response("Method not allowed", { status: 405 });
    }
  };

  // Main page route
  routes["/"] = async function() {
    const todos = await readToDoList();
    const html = renderFile(PAGES_PROJECT_PATH + "index.pug", { todos });
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  };

  console.info(routes);

  // Bun server with dynamic routing
  serve({
    fetch(req: Request) {
      const url = new URL(req.url);
      const routeResult = matchRoute(url.pathname, routes);

      if (routeResult) {
        const { handler, params } = routeResult;
        return handler(req, params);
      }

      return new Response("Not Found", { status: 404 });
    },
    port: 3001,
  });

  console.log("Server started on http://localhost:3000");
}

/**
 * Handle creating a new entity
 */
async function handleCreateEntity(req: Request, entity: string) {
  const formData = await req.formData();
  const title = formData.get("title")?.toString() || "Untitled";
  const status = formData.get("status")?.toString() || "Pending";

  // Handle different entity types (e.g. todos)
  if (entity === "todos") {
    const id = await createToDo(title, status);
    const html = renderFile(COMPONENTS_PROJECT_PATH + "task.pug", { id, title, status });
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  return new Response("Entity not supported", { status: 400 });
}

/**
 * Handle reading a list of entities
 */
async function handleReadEntityList(entity: string) {
  // Handle different entity types
  if (entity === "todos") {
    const todos = await readToDoList();
    const html = renderFile(PAGES_PROJECT_PATH + "index.pug", { todos });
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  return new Response("Entity not supported", { status: 400 });
}

/**
 * Handle deleting an entity
 */
async function handleDeleteEntity(entity: string, id: number) {
  if (entity === "todos") {
    await deleteToDo(id);
    return new Response(null, { status: 200 });
  }

  return new Response("Entity not supported", { status: 400 });
}

main();

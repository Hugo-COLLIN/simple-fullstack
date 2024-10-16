import {Glob, serve} from "bun";
import {renderFile} from "pug";

const PAGES_PROJECT_PATH = "./src/views/pages/";

function main() {
  // Browse all files in the "views" folder
  const routes: Record<string, (req: Request) => Response> = {};
  const pages = new Glob(PAGES_PROJECT_PATH + "*.pug");

  for (const file of pages.scanSync(".")) {
    const routePath = determineRoute(file);
    routes[routePath] = handlePugRendering(file);
  }

  console.info(routes);

  // Bun server with dynamic routing
  serve({
    fetch(req: Request) {
      const url = new URL(req.url);
      const routeHandler = routes[url.pathname];
      if (routeHandler) {
        return routeHandler(req);
      }
      return new Response("Not Found", {status: 404});
    },
    port: 3000,
  });

  console.log("Server started on http://localhost:3000");
}

/**
 * Render pug files
 * @param file The Pug file to render
 */
export function handlePugRendering(file: string) {
  return (req: Request) => {
    const html = renderFile(file);
    return new Response(html, {
      headers: {"Content-Type": "text/html"},
    });
  };
}

/**
 * Determine the route based on the file path
 * @param file The Pug file path
 */
function determineRoute(file: string): string {
  let route = file
    .replace(/\\/g, "/") // Replace folder separators for Windows paths
    .replace(PAGES_PROJECT_PATH, "")
    .replace(".pug", "");

  // If the file is "index.pug", associate to root or subfolder
  if (route.endsWith("index")) {
    route = route.replace("index", "") || "/"; // Manage where file is in a subfolder or at the root
  } else {
    route = `/${route}`;
  }

  return route;
}

main();

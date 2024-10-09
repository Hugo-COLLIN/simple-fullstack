import { serve, Glob } from "bun";
import { renderFile } from "pug";

// Fonction pour rendre les fichiers pug automatiquement
function handlePugRendering(file: string) {
  return (req: Request) => {
    const html = renderFile(file);
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  };
}

// Créer une fonction pour déterminer les routes
function determineRoute(file: string): string {
  let route = file
    .replace(/\\/g, "/") // Remplacer les séparateurs de dossiers pour les chemins sous Windows
    .replace("./src/views/", "") // Enlever le chemin de base
    .replace(".pug", ""); // Enlever l'extension .pug

  // Si le fichier est "index.pug", associer à la racine ou sous-dossier
  if (route.endsWith("index")) {
    route = route.replace("index", "") || "/"; // Gérer le cas où il est dans un sous-dossier ou à la racine
  } else {
    route = `/${route}`; // Ajouter le slash initial pour les autres fichiers
  }

  return route;
}

// Parcourir tous les fichiers dans le dossier "views"
const routes: Record<string, (req: Request) => Response> = {};
const pages = new Glob("./src/views/*.pug");

for (const file of pages.scanSync(".")) {
  const routePath = determineRoute(file);
  routes[routePath] = handlePugRendering(file);
}

console.info(routes);

// Serveur Bun avec routage dynamique
serve({
  fetch(req: Request) {
    const url = new URL(req.url);
    const routeHandler = routes[url.pathname];
    if (routeHandler) {
      return routeHandler(req);
    }
    return new Response("Not Found", { status: 404 });
  },
  port: 3000,
});

interface Field {
  name: string;
  type: string;
  primaryKey?: boolean;
  autoincrement?: boolean;
}

interface Model {
  table: string;
  fields: Field[];
}

interface Routes {
  create?: boolean;
  read?: boolean;
  readAll?: boolean;
  update?: boolean;
  delete?: boolean;
}

export interface ApiConfig {
  model: Model;
  routes: Routes;
}

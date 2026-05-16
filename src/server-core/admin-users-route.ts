type ExpressLikeRequest = unknown;
type ExpressLikeResponse = unknown;
type ExpressLikeHandler = (req: ExpressLikeRequest, res: ExpressLikeResponse) => Promise<unknown> | unknown;
type LoadAdminUsersHandler = () => Promise<{ default: ExpressLikeHandler }>;

type ExpressLikeApp = {
  all: (path: string, handler: ExpressLikeHandler) => unknown;
};

const defaultLoadAdminUsersHandler: LoadAdminUsersHandler = () => import('../../api/admin/users.js');

export function createAdminUsersExpressHandler(loadAdminUsersHandler: LoadAdminUsersHandler = defaultLoadAdminUsersHandler): ExpressLikeHandler {
  return async (req, res) => {
    const { default: handler } = await loadAdminUsersHandler();
    return handler(req, res);
  };
}

export function registerAdminUsersRoute(app: ExpressLikeApp) {
  app.all('/api/admin/users', createAdminUsersExpressHandler());
}

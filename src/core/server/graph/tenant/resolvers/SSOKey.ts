import * as settings from "coral-server/models/settings";

import { GQLSSOKeyTypeResolver } from "coral-server/graph/tenant/schema/__generated__/types";

export const SSOKey: GQLSSOKeyTypeResolver<settings.SSOKey> = {
  lastUsedAt: async ({ kid }, args, ctx) =>
    ctx.loaders.Auth.retrieveSSOKeyLastUsedAt.load(kid),
};

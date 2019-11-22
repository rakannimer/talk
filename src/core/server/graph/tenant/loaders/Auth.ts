import DataLoader from "dataloader";

import TenantContext from "coral-server/graph/tenant/context";
import { retrieveLastUsedAtTenantSSOKeys } from "coral-server/models/tenant";
import { discoverOIDCConfiguration } from "coral-server/services/tenant";

import { GQLDiscoveredOIDCConfiguration } from "coral-server/graph/tenant/schema/__generated__/types";

export default (ctx: TenantContext) => ({
  discoverOIDCConfiguration: new DataLoader<
    string,
    GQLDiscoveredOIDCConfiguration | null
  >(
    issuers =>
      Promise.all(issuers.map(issuer => discoverOIDCConfiguration(issuer))),
    {
      // Disable caching for the DataLoader if the Context is designed to be
      // long lived.
      cache: !ctx.disableCaching,
    }
  ),
  retrieveSSOKeyLastUsedAt: new DataLoader((kids: string[]) =>
    retrieveLastUsedAtTenantSSOKeys(ctx.redis, ctx.tenant.id, kids)
  ),
});

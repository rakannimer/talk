import TenantContext from "coral-server/graph/tenant/context";
import { Tenant } from "coral-server/models/tenant";
import {
  deactivateSSOKey,
  deleteSSOKey,
  regenerateSSOKey,
  rotateSSOKey,
  update,
} from "coral-server/services/tenant";

import {
  GQLDeactivateSSOKeyInput,
  GQLDeleteSSOKeyInput,
  GQLRotateSSOKeyInput,
  GQLUpdateSettingsInput,
} from "coral-server/graph/tenant/schema/__generated__/types";

export const Settings = ({
  mongo,
  redis,
  tenantCache,
  tenant,
  config,
  now,
}: TenantContext) => ({
  update: (input: GQLUpdateSettingsInput): Promise<Tenant | null> =>
    update(mongo, redis, tenantCache, config, tenant, input.settings),
  regenerateSSOKey: (): Promise<Tenant | null> =>
    regenerateSSOKey(mongo, redis, tenantCache, tenant, now),
  rotateSSOKey: ({ inactiveIn }: GQLRotateSSOKeyInput) =>
    rotateSSOKey(mongo, redis, tenantCache, tenant, inactiveIn, now),
  deactivateSSOKey: ({ kid }: GQLDeactivateSSOKeyInput) =>
    deactivateSSOKey(mongo, redis, tenantCache, tenant, kid, now),
  deleteSSOKey: ({ kid }: GQLDeleteSSOKeyInput) =>
    deleteSSOKey(mongo, redis, tenantCache, tenant, kid),
});

import CoralEventListenerBroker, {
  CoralEventPublisherBroker,
} from "coral-server/events/publisher";
import CommonContext, {
  CommonContextOptions,
} from "coral-server/graph/common/context";
import logger from "coral-server/logger";
import { Tenant } from "coral-server/models/tenant";
import { User } from "coral-server/models/user";
import { MailerQueue } from "coral-server/queue/tasks/mailer";
import { ScraperQueue } from "coral-server/queue/tasks/scraper";
import { JWTSigningConfig } from "coral-server/services/jwt";
import TenantCache from "coral-server/services/tenant/cache";

import loaders from "./loaders";
import mutators from "./mutators";

export interface TenantContextOptions extends CommonContextOptions {
  tenant: Tenant;
  tenantCache: TenantCache;
  mailerQueue: MailerQueue;
  scraperQueue: ScraperQueue;
  signingConfig?: JWTSigningConfig;
  clientID?: string;
  broker: CoralEventListenerBroker;
}

export default class TenantContext extends CommonContext {
  public readonly tenant: Tenant;
  public readonly tenantCache: TenantCache;

  public readonly broker: CoralEventPublisherBroker;
  public readonly clientID?: string;
  public readonly loaders: ReturnType<typeof loaders>;
  public readonly mailerQueue: MailerQueue;
  public readonly mutators: ReturnType<typeof mutators>;
  public readonly scraperQueue: ScraperQueue;
  public readonly signingConfig?: JWTSigningConfig;
  public readonly user?: User;

  constructor({
    tenant,
    logger: log = logger,
    broker,
    ...options
  }: TenantContextOptions) {
    super({
      ...options,
      lang: tenant.locale,
      logger: logger.child({ tenantID: tenant.id }, true),
    });

    this.tenant = tenant;
    this.tenantCache = options.tenantCache;
    this.scraperQueue = options.scraperQueue;
    this.mailerQueue = options.mailerQueue;
    this.signingConfig = options.signingConfig;
    this.clientID = options.clientID;

    this.broker = broker.instance(this);
    this.loaders = loaders(this);
    this.mutators = mutators(this);
  }
}

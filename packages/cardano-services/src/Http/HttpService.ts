import * as OpenApiValidator from 'express-openapi-validator';
import {
  HealthCheckResponse,
  HttpProviderConfigPaths,
  Provider,
  ProviderError,
  ProviderFailure,
  providerFailureToStatusCodeMap
} from '@cardano-sdk/core';
import { HttpServer } from './HttpServer';
import { Logger } from 'ts-log';
import { ProviderHandler, providerHandler } from '../util';
import { RunnableModule } from '@cardano-sdk/util';
import { versionPathFromSpec } from '../util/openApi';
import express, { Router } from 'express';
import path from 'path';

const openApiOption = { ignoreUndocumented: true, validateRequests: true, validateResponses: true };

export abstract class HttpService extends RunnableModule {
  public router: express.Router;
  public slug: string;
  public provider: Provider;
  public openApiPath: string;

  constructor(slug: string, provider: Provider, router: express.Router, openApiPath: string, logger: Logger) {
    super(slug, logger);
    this.router = router;
    this.slug = slug;
    this.provider = provider;
    this.openApiPath = path.join(openApiPath, 'openApi.json');

    router.use(OpenApiValidator.middleware({ apiSpec: this.openApiPath, ...openApiOption }));

    const healthHandler = async (req: express.Request, res: express.Response) => {
      logger.debug('/health', { ip: req.ip });
      let body: HealthCheckResponse | Error['message'];
      try {
        body = await this.healthCheck();
      } catch (error) {
        logger.error(error);
        body = error instanceof ProviderError ? error.message : 'Unknown error';
        res.statusCode = 500;
      }
      res.send(body);
    };
    this.router.get('/health', healthHandler);
    this.router.post('/health', healthHandler);
  }

  protected async initializeImpl(): Promise<void> {
    if (this.provider instanceof RunnableModule) await this.provider.initialize();

    const health = await this.healthCheck();
    if (!health.ok) {
      this.logger.warn('Service started in unhealthy state');
    }
  }

  protected async startImpl(): Promise<void> {
    if (this.provider instanceof RunnableModule) await this.provider.start();
  }

  protected async shutdownImpl(): Promise<void> {
    if (this.provider instanceof RunnableModule) await this.provider.shutdown();
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return await this.provider.healthCheck();
  }

  apiVersionPath(): string {
    return versionPathFromSpec(this.openApiPath);
  }

  attachProviderRoutes<T extends Provider>(provider: T, router: Router, paths: HttpProviderConfigPaths<T>) {
    for (const methodName in paths) {
      const handler = providerHandler((provider[methodName] as Function).bind(provider));

      router.post(paths[methodName], handler(HttpService.routeHandler(this.logger), this.logger));
    }
  }

  static routeHandler(logger: Logger): ProviderHandler {
    return async (args, _r, res, _n, handler) => {
      try {
        return HttpServer.sendJSON(res, await handler(args));
      } catch (error) {
        logger.error(error);

        if (error instanceof ProviderError) {
          const code = providerFailureToStatusCodeMap[error.reason];

          return HttpServer.sendJSON(res, error, code);
        }

        return HttpServer.sendJSON(res, new ProviderError(ProviderFailure.Unhealthy, error), 500);
      }
    };
  }
}

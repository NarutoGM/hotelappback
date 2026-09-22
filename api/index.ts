import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';

let server: any;

export default async function handler(req: any, res: any) {
  try {
    if (!server) {
      const app = await NestFactory.create(AppModule);
      app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
      });
      await app.init();
      const expressApp = app.getHttpAdapter().getInstance();
      server = expressApp;
    }
    return server(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Error]:', err);
    return res.status(500).json({
      error: 'Internal Serverless Boot Error',
      message: err?.message || String(err),
      stack: err?.stack,
    });
  }
}

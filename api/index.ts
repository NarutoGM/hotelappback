import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';

let server: any;

export default async function handler(req: any, res: any) {
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
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';

import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

const server = express();
let isAppInitialized = false;

async function bootstrapServer() {
  if (!isAppInitialized) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    await app.init();
    isAppInitialized = true;
  }
  return server;
}

export default async function handler(req: any, res: any) {
  try {
    await bootstrapServer();
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

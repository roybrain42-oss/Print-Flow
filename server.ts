import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import authRoutes from './server/routes/authRoutes';
import publicRoutes from './server/routes/publicRoutes';
import tenantRoutes from './server/routes/tenantRoutes';
import adminRoutes from './server/routes/adminRoutes';
import downloadRoutes from './server/routes/downloadRoutes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security and body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic security headers - allow framing for AI Studio preview iframe
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      app: 'PrintFlow Multi-Tenant SaaS',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Routers
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/tenant', tenantRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/download', downloadRoutes);

  // Catch unhandled API routes with JSON 404 instead of falling through to SPA HTML
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Global Error Handler for API routes
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Error]:', err);
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Uploaded file exceeds the maximum allowed size limit (35 MB).' });
        return;
      }
      res.status(400).json({ error: `File upload error: ${err.message}` });
      return;
    }
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ error: message });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PrintFlow Server successfully running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

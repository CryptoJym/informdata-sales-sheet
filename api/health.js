/**
 * Health check endpoint for monitoring
 * GET /api/health
 *
 * Returns:
 * - 200 OK: Service healthy
 * - 503 Service Unavailable: Missing critical dependencies
 */

import fs from 'fs';
import path from 'path';
import { validateChatEnv } from '../utils/env-validation.js';

export const config = {
  runtime: 'nodejs'
};

export default async function handler(request) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };

  // Check environment variables
  const envValidation = validateChatEnv();
  checks.checks.environment = {
    status: envValidation.valid ? 'pass' : 'fail',
    errors: envValidation.errors,
    warnings: envValidation.warnings
  };

  // Check for embeddings file (optional but improves performance)
  const embedPath = path.join(process.cwd(), 'data', 'embeddings.json');
  const hasEmbeddings = fs.existsSync(embedPath);
  checks.checks.embeddings = {
    status: hasEmbeddings ? 'pass' : 'warn',
    message: hasEmbeddings
      ? 'Embeddings file found (fast retrieval)'
      : 'No embeddings file (will parse HTML on-demand)'
  };

  // Check for HTML source files
  const pages = [
    'mvr_api.html',
    'api_docs.html',
    'national_scan_components.html',
    'databases_coverage.html'
  ];
  const missingPages = pages.filter(p => !fs.existsSync(path.join(process.cwd(), p)));
  checks.checks.sources = {
    status: missingPages.length === pages.length ? 'fail' : 'pass',
    foundPages: pages.length - missingPages.length,
    totalPages: pages.length,
    missingPages: missingPages.length > 0 ? missingPages : undefined
  };

  // Overall status
  const hasCriticalError = !envValidation.valid || missingPages.length === pages.length;
  checks.status = hasCriticalError ? 'unhealthy' : 'healthy';

  // Return appropriate status code
  const statusCode = hasCriticalError ? 503 : 200;

  return new Response(JSON.stringify(checks, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

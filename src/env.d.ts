import 'astro:env';
import type { CloudflareEnv } from '@astrojs/cloudflare';

declare global {
  namespace App {
    interface Locals {
      workersEnv: CloudflareEnv;
    }
  }
}
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync, watch } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const outdir = join(__dirname, '..', 'dist');

async function dev() {
  // Ensure dist directory exists
  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true });
  }

  // Copy static assets initially
  const dataSrc = join(__dirname, '..', 'data');
  const dataDest = join(outdir, 'data');
  if (existsSync(dataSrc)) {
    copyDir(dataSrc, dataDest);
  }

  const configSrc = join(__dirname, '..', '.env');
  const configDest = join(outdir, '.env');
  if (existsSync(configSrc)) {
    copyFileSync(configSrc, configDest);
  }

  const ctx = await build({
    entryPoints: [join(__dirname, '..', 'src', 'index.js')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outdir,
    format: 'esm',
    external: [
      '@discordjs/opus',
      'libsodium-wrappers',
      'ffmpeg-static',
      '@snazzah/davey-win32-x64-msvc',
      'discord.js',
      'distube',
      '@distube/soundcloud',
      '@distube/yt-dlp',
      'dotenv',
      'pino',
      'pino-pretty',
    ],
    mainFields: ['module', 'main'],
    conditions: ['module', 'import', 'require'],
    sourcemap: true,
    sourcesContent: true,
    treeShaking: true,
    minify: false,
    legalComments: 'none',
    logLevel: 'info',
    loader: {
      '.node': 'file',
    },
    define: {
      'process.env.NODE_ENV': '"development"',
    },
    plugins: [
      {
        name: 'watch-copy',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) {
              console.log('[watch] Rebuild complete');
            }
          });
        },
      },
    ],
  });

  await ctx.watch();

  // Watch data directory for changes
  watch(dataSrc, { recursive: true }, () => {
    copyDir(dataSrc, dataDest);
    console.log('[watch] Data directory synced');
  });

  console.log('Development server watching for changes...');
}

function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

dev().catch(() => process.exit(1));
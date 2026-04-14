const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const browserSync = require('browser-sync').create();
const chokidar = require('chokidar');
const { createProxyMiddleware } = require('http-proxy-middleware');

const repoRoot = path.resolve(__dirname, '..', '..');
const distRoot = path.join(repoRoot, 'website', 'dist');
const buildScriptPath = path.join(repoRoot, 'website', 'build', 'build-site.js');
const sourceStylesPath = path.join(repoRoot, 'website', 'styles.css');
const distStylesPath = path.join(distRoot, 'styles.css');
const apiProxyTarget = process.env.WEBSITE_API_PROXY_TARGET || 'http://127.0.0.1:3000';
const port = Number(process.env.WEBSITE_DEV_PORT || 8080);

const watchPaths = [
  path.join(repoRoot, 'website', 'content'),
  path.join(repoRoot, 'website', 'templates'),
  path.join(repoRoot, 'website', 'js'),
  path.join(repoRoot, 'website', 'assets'),
  path.join(repoRoot, 'website', 'styles.css'),
  path.join(repoRoot, 'database', 'import', 'metadata', 'collections.yml'),
  path.join(repoRoot, 'database', 'import', 'metadata', 'sources.yml'),
];

let isBuilding = false;
let rebuildQueued = false;
let queuedTrigger = null;

function isCssTrigger(trigger) {
  return trigger === 'website/styles.css';
}

function syncStylesheet() {
  fs.mkdirSync(distRoot, { recursive: true });
  fs.copyFileSync(sourceStylesPath, distStylesPath);
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [buildScriptPath], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Website build failed with exit code ${code}`));
    });
  });
}

async function rebuild(trigger) {
  if (isBuilding) {
    rebuildQueued = true;
    queuedTrigger = trigger;
    return;
  }

  isBuilding = true;
  console.log(`[website:dev] rebuilding (${trigger})`);

  try {
    if (isCssTrigger(trigger)) {
      syncStylesheet();
      browserSync.reload('*.css');
      return;
    }

    await runBuild();
    browserSync.reload();
  } catch (error) {
    console.error(`[website:dev] ${error.message}`);
  } finally {
    isBuilding = false;
    if (rebuildQueued) {
      const nextTrigger = queuedTrigger || 'queued change';
      rebuildQueued = false;
      queuedTrigger = null;
      rebuild(nextTrigger);
    }
  }
}

async function main() {
  await rebuild('startup');

  browserSync.init({
    port,
    open: false,
    notify: false,
    ghostMode: false,
    server: {
      baseDir: distRoot,
      middleware: [
        createProxyMiddleware({
          pathFilter: '/api',
          target: apiProxyTarget,
          changeOrigin: true,
          ws: true,
          proxyTimeout: 10000,
        }),
        function noCacheMiddleware(req, res, next) {
          res.setHeader('Cache-Control', 'no-store');
          next();
        },
      ],
    },
  }, (error) => {
    if (error) {
      throw error;
    }
    console.log(`[website:dev] serving http://127.0.0.1:${port}`);
    console.log(`[website:dev] proxying /api to ${apiProxyTarget}`);
  });

  chokidar.watch(watchPaths, {
    ignoreInitial: true,
  }).on('all', (_eventName, changedPath) => {
    rebuild(path.relative(repoRoot, changedPath));
  });
}

main().catch((error) => {
  console.error(`[website:dev] ${error.message}`);
  process.exit(1);
});

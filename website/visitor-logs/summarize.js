const fs = require('fs');
const path = require('path');
const readline = require('readline');
const zlib = require('zlib');

const DEFAULT_LOG_DIR = '/data/logs';
const DEFAULT_OUTPUT_FILE = '/data/logs/visitor-summary.txt';
const DAY_MS = 24 * 60 * 60 * 1000;

const ASSET_EXTENSIONS = new Set([
  '.avif',
  '.css',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.map',
  '.png',
  '.svg',
  '.txt',
  '.webmanifest',
  '.woff',
  '.woff2',
  '.xml',
]);

const BOT_USER_AGENT_PARTS = [
  'bot',
  'crawl',
  'curl',
  'headless',
  'monitor',
  'python-requests',
  'scanner',
  'slurp',
  'spider',
  'uptime',
  'wget',
];

function parseArgs(argv) {
  const args = {
    logDir: process.env.VISITOR_LOG_DIR || DEFAULT_LOG_DIR,
    outputFile: process.env.VISITOR_SUMMARY_FILE || DEFAULT_OUTPUT_FILE,
    daemon: process.env.VISITOR_SUMMARY_DAEMON === 'true',
    intervalMs: Number(process.env.VISITOR_SUMMARY_INTERVAL_MS || DAY_MS),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--daemon') {
      args.daemon = true;
    } else if (arg === '--log-dir') {
      args.logDir = argv[index + 1];
      index += 1;
    } else if (arg === '--output') {
      args.outputFile = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function dayKeyFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function emptyStats() {
  return {
    generatedAt: new Date().toISOString(),
    periodStart: null,
    periodEnd: null,
    sourceFiles: [],
    malformedLines: 0,
    totalRequests: 0,
    totalPageViews: 0,
    humanPageViews: 0,
    botRequests: 0,
    apiRequests: 0,
    assetRequests: 0,
    otherRequests: 0,
    uniqueVisitorKeys: new Set(),
    humanUniqueVisitorKeys: new Set(),
    days: new Map(),
    paths: new Map(),
    statusClasses: new Map(),
    methods: new Map(),
  };
}

function ensureDay(stats, day) {
  if (!stats.days.has(day)) {
    stats.days.set(day, {
      requests: 0,
      pageViews: 0,
      humanPageViews: 0,
      botRequests: 0,
      apiRequests: 0,
      assetRequests: 0,
      uniqueVisitors: new Set(),
      humanUniqueVisitors: new Set(),
    });
  }

  return stats.days.get(day);
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function firstHeader(headers, name) {
  if (!headers) {
    return '';
  }

  const exactValue = headers[name];
  if (Array.isArray(exactValue)) {
    return exactValue[0] || '';
  }
  if (typeof exactValue === 'string') {
    return exactValue;
  }

  const lowerName = name.toLowerCase();
  const foundKey = Object.keys(headers).find((key) => key.toLowerCase() === lowerName);
  const value = foundKey ? headers[foundKey] : '';
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return typeof value === 'string' ? value : '';
}

function normalizeUserAgent(userAgent) {
  return String(userAgent || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function isLikelyBot(userAgent) {
  const normalized = normalizeUserAgent(userAgent);
  return BOT_USER_AGENT_PARTS.some((part) => normalized.includes(part));
}

function normalizePath(uri) {
  if (!uri) {
    return '/';
  }

  try {
    const parsed = new URL(uri, 'http://example.invalid');
    return parsed.pathname || '/';
  } catch (error) {
    return String(uri).split('?')[0] || '/';
  }
}

function classifyPath(pathname) {
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return 'api';
  }
  if (
    pathname === '/styles.css'
    || pathname.startsWith('/assets/')
    || pathname.startsWith('/js/')
    || ASSET_EXTENSIONS.has(path.extname(pathname).toLowerCase())
  ) {
    return 'asset';
  }
  return 'page';
}

function statusClass(status) {
  if (!Number.isFinite(status) || status < 100) {
    return 'unknown';
  }
  return `${Math.floor(status / 100)}xx`;
}

function visitorKey(request, userAgent) {
  const ip = request.client_ip || request.remote_ip || 'unknown-ip';
  return `${ip}|${normalizeUserAgent(userAgent) || 'unknown-agent'}`;
}

function processRecord(stats, record) {
  const request = record.request || {};
  const date = new Date(Number(record.ts) * 1000);
  if (Number.isNaN(date.getTime())) {
    return;
  }

  const day = dayKeyFromDate(date);
  const dayStats = ensureDay(stats, day);
  const method = String(request.method || '').toUpperCase();
  const status = Number(record.status);
  const pathname = normalizePath(request.uri);
  const kind = classifyPath(pathname);
  const userAgent = firstHeader(request.headers, 'User-Agent');
  const bot = isLikelyBot(userAgent);
  const successful = status >= 200 && status < 400;
  const pageView = successful && (method === 'GET' || method === 'HEAD') && kind === 'page';
  const key = visitorKey(request, userAgent);

  stats.totalRequests += 1;
  dayStats.requests += 1;
  increment(stats.methods, method || 'UNKNOWN');
  increment(stats.statusClasses, statusClass(status));

  if (bot) {
    stats.botRequests += 1;
    dayStats.botRequests += 1;
  }
  if (kind === 'api') {
    stats.apiRequests += 1;
    dayStats.apiRequests += 1;
  } else if (kind === 'asset') {
    stats.assetRequests += 1;
    dayStats.assetRequests += 1;
  } else {
    stats.otherRequests += 1;
  }

  if (pageView) {
    stats.totalPageViews += 1;
    dayStats.pageViews += 1;
    increment(stats.paths, pathname);
    stats.uniqueVisitorKeys.add(key);
    dayStats.uniqueVisitors.add(key);
    if (!bot) {
      stats.humanPageViews += 1;
      dayStats.humanPageViews += 1;
      stats.humanUniqueVisitorKeys.add(key);
      dayStats.humanUniqueVisitors.add(key);
    }
  }

  if (!stats.periodStart || day < stats.periodStart) {
    stats.periodStart = day;
  }
  if (!stats.periodEnd || day > stats.periodEnd) {
    stats.periodEnd = day;
  }
}

async function processFile(stats, filePath) {
  const stream = fs.createReadStream(filePath);
  const input = filePath.endsWith('.gz') ? stream.pipe(zlib.createGunzip()) : stream;
  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }

    try {
      processRecord(stats, JSON.parse(line));
    } catch (error) {
      stats.malformedLines += 1;
    }
  }
}

function mtimeMs(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch (error) {
    return 0;
  }
}

function discoverLogFiles(logDir) {
  if (!fs.existsSync(logDir)) {
    return [];
  }

  return fs.readdirSync(logDir)
    .filter((name) => {
      return name === 'access.log'
        || name.startsWith('access.log.')
        || /^access-.+\.log(\.gz)?$/.test(name);
    })
    .map((name) => path.join(logDir, name))
    .filter((filePath) => fs.statSync(filePath).isFile())
    .sort((a, b) => mtimeMs(a) - mtimeMs(b));
}

function sortedEntries(map, limit = null) {
  const entries = Array.from(map.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return limit ? entries.slice(0, limit) : entries;
}

function machineStats(stats) {
  const daily = Array.from(stats.days.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, dayStats]) => ({
      date: day,
      requests: dayStats.requests,
      pageViews: dayStats.pageViews,
      humanPageViews: dayStats.humanPageViews,
      botRequests: dayStats.botRequests,
      apiRequests: dayStats.apiRequests,
      assetRequests: dayStats.assetRequests,
      uniqueVisitors: dayStats.uniqueVisitors.size,
      humanUniqueVisitors: dayStats.humanUniqueVisitors.size,
    }));

  return {
    generatedAt: stats.generatedAt,
    periodStart: stats.periodStart,
    periodEnd: stats.periodEnd,
    sourceFiles: stats.sourceFiles.map((filePath) => path.basename(filePath)),
    malformedLines: stats.malformedLines,
    totals: {
      requests: stats.totalRequests,
      pageViews: stats.totalPageViews,
      humanPageViews: stats.humanPageViews,
      botRequests: stats.botRequests,
      apiRequests: stats.apiRequests,
      assetRequests: stats.assetRequests,
      otherRequests: stats.otherRequests,
      uniqueVisitors: stats.uniqueVisitorKeys.size,
      humanUniqueVisitors: stats.humanUniqueVisitorKeys.size,
    },
    daily,
    topPaths: sortedEntries(stats.paths, 20).map(([pathname, count]) => ({ path: pathname, count })),
    statusClasses: Object.fromEntries(sortedEntries(stats.statusClasses)),
    methods: Object.fromEntries(sortedEntries(stats.methods)),
  };
}

function table(headers, rows) {
  const widths = headers.map((header, index) => Math.max(
    String(header).length,
    ...rows.map((row) => String(row[index]).length)
  ));
  const renderRow = (row) => row.map((cell, index) => String(cell).padEnd(widths[index])).join('  ');
  return [
    renderRow(headers),
    renderRow(widths.map((width) => '-'.repeat(width))),
    ...rows.map(renderRow),
  ].join('\n');
}

function renderReport(stats) {
  const data = machineStats(stats);
  const dailyRows = data.daily.map((day) => [
    day.date,
    day.requests,
    day.pageViews,
    day.humanPageViews,
    day.uniqueVisitors,
    day.humanUniqueVisitors,
    day.botRequests,
    day.apiRequests,
    day.assetRequests,
  ]);
  const pathRows = data.topPaths.map((entry) => [entry.count, entry.path]);
  const statusRows = Object.entries(data.statusClasses).map(([key, value]) => [key, value]);

  return [
    'Demoscapes visitor summary',
    '===========================',
    '',
    `Generated at: ${data.generatedAt}`,
    `Covered dates: ${data.periodStart || 'none'} to ${data.periodEnd || 'none'}`,
    `Source files: ${data.sourceFiles.length ? data.sourceFiles.join(', ') : 'none'}`,
    `Malformed log lines skipped: ${data.malformedLines}`,
    '',
    'Totals',
    '------',
    `Requests: ${data.totals.requests}`,
    `Page views: ${data.totals.pageViews}`,
    `Human page views: ${data.totals.humanPageViews}`,
    `Approximate unique visitors: ${data.totals.uniqueVisitors}`,
    `Approximate human unique visitors: ${data.totals.humanUniqueVisitors}`,
    `Bot requests: ${data.totals.botRequests}`,
    `API requests: ${data.totals.apiRequests}`,
    `Asset requests: ${data.totals.assetRequests}`,
    `Other requests: ${data.totals.otherRequests}`,
    '',
    'Daily',
    '-----',
    dailyRows.length
      ? table(['date', 'requests', 'page_views', 'human_page_views', 'unique_visitors', 'human_unique_visitors', 'bot_requests', 'api_requests', 'asset_requests'], dailyRows)
      : 'No access log records found.',
    '',
    'Top paths',
    '---------',
    pathRows.length ? table(['count', 'path'], pathRows) : 'No page views found.',
    '',
    'Status classes',
    '--------------',
    statusRows.length ? table(['class', 'count'], statusRows) : 'No status classes found.',
    '',
    'Machine readable JSON',
    '---------------------',
    'BEGIN_VISITOR_SUMMARY_JSON',
    JSON.stringify(data, null, 2),
    'END_VISITOR_SUMMARY_JSON',
    '',
  ].join('\n');
}

async function writeSummary(options) {
  fs.mkdirSync(options.logDir, { recursive: true });
  fs.mkdirSync(path.dirname(options.outputFile), { recursive: true });

  const stats = emptyStats();
  stats.sourceFiles = discoverLogFiles(options.logDir);

  for (const filePath of stats.sourceFiles) {
    await processFile(stats, filePath);
  }

  fs.writeFileSync(options.outputFile, renderReport(stats));
  console.log(`Wrote visitor summary to ${options.outputFile}`);
}

function delayUntilNextUtcMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 5, 0, 0);
  return Math.max(next.getTime() - now.getTime(), 60 * 1000);
}

async function main() {
  const options = parseArgs(process.argv);
  await writeSummary(options);

  if (!options.daemon) {
    return;
  }

  setTimeout(function runDaily() {
    writeSummary(options).catch((error) => {
      console.error('Failed to write visitor summary:', error);
    });
    setTimeout(runDaily, options.intervalMs);
  }, delayUntilNextUtcMidnight());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

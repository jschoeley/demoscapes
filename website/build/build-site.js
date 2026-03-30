const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const websiteRoot = path.join(repoRoot, 'website');
const contentRoot = path.join(websiteRoot, 'content');
const templatesRoot = path.join(websiteRoot, 'templates');
const distRoot = path.join(websiteRoot, 'dist');
const sourcesYamlPath = path.join(repoRoot, 'database', 'import', 'metadata', 'sources.yml');
const collectionsYamlPath = path.join(repoRoot, 'database', 'import', 'metadata', 'collections.yml');

let embedCounter = 0;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripQuotes(value) {
  const trimmed = String(value).trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parsePrimitive(value) {
  const stripped = stripQuotes(value);
  if (stripped === 'true') return true;
  if (stripped === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(stripped)) return Number(stripped);
  return stripped;
}

function parseFrontmatterBlock(block) {
  const data = {};
  const lines = block.replaceAll('\r\n', '\n').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const idx = trimmed.indexOf(':');
    if (idx === -1) {
      return;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    data[key] = parsePrimitive(value);
  });
  return data;
}

function parseFrontmatter(source) {
  if (!source.startsWith('---\n')) {
    return { data: {}, content: source };
  }

  const closing = source.indexOf('\n---\n', 4);
  if (closing === -1) {
    return { data: {}, content: source };
  }

  const rawFrontmatter = source.slice(4, closing);
  const body = source.slice(closing + 5);
  const data = parseFrontmatterBlock(rawFrontmatter);
  return { data, content: body };
}

function parseListYaml(yamlText, rootKey) {
  const lines = yamlText.replaceAll('\r\n', '\n').split('\n');
  const items = [];
  let current = null;

  lines.forEach((line) => {
    if (!line.trim() || line.trim().startsWith('#')) {
      return;
    }

    if (line.trim() === `${rootKey}:`) {
      return;
    }

    const itemMatch = line.match(/^\s*-\s+([A-Za-z0-9_]+):\s*(.+)?$/);
    if (itemMatch) {
      if (current) {
        items.push(current);
      }
      current = {};
      current[itemMatch[1]] = parsePrimitive(itemMatch[2] || '');
      return;
    }

    const fieldMatch = line.match(/^\s+([A-Za-z0-9_]+):\s*(.+)?$/);
    if (fieldMatch && current) {
      current[fieldMatch[1]] = parsePrimitive(fieldMatch[2] || '');
    }
  });

  if (current) {
    items.push(current);
  }

  return items;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInlineMarkdown(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function markdownToHtml(markdownText) {
  const lines = markdownText.replaceAll('\r\n', '\n').split('\n');
  const out = [];
  let inList = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    out.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!inList) {
      return;
    }
    out.push('</ul>');
    inList = false;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      flushParagraph();
      closeList();
      return;
    }

    if (trimmed.startsWith('<div class="lexis-embed"')) {
      flushParagraph();
      closeList();
      out.push(trimmed);
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      out.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      return;
    }

    const listMatch = trimmed.match(/^-\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${renderInlineMarkdown(listMatch[1])}</li>`);
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  closeList();

  return out.join('\n');
}

function parseLexisAttributes(rawAttrs) {
  const attributes = {};
  const regex = /(\w+)=("([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = regex.exec(rawAttrs)) !== null) {
    attributes[match[1]] = match[3] !== undefined ? match[3] : match[4];
  }

  const options = {};
  if (attributes.measureKey) options.measureKey = attributes.measureKey;
  if (attributes.seriesKey) options.seriesKey = attributes.seriesKey;
  if (attributes.collectionKey) options.collectionKey = attributes.collectionKey;
  if (attributes.title) options.title = attributes.title;
  if (attributes.captionMode) options.captionMode = attributes.captionMode;
  if (attributes.showControls) {
    options.showControls = attributes.showControls === 'true';
  }

  if (attributes.strata) {
    try {
      options.strata = JSON.parse(attributes.strata);
    } catch (error) {
      throw new Error(`Invalid lexis strata JSON: ${attributes.strata}`);
    }
  }

  return options;
}

function applyLexisShortcodes(markdownText) {
  return markdownText.replace(/\{\{<\s*lexis\s+([\s\S]*?)\s*>\}\}/g, (_match, attrs) => {
    const options = parseLexisAttributes(attrs);
    const id = `lexis-embed-${embedCounter}`;
    embedCounter += 1;
    const encoded = encodeURIComponent(JSON.stringify(options));
    return `<div class="lexis-embed" id="${id}" data-lexis-options="${encoded}"></div>`;
  });
}

function readMarkdown(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFrontmatter(source);
  const transformed = applyLexisShortcodes(parsed.content);
  const html = markdownToHtml(transformed);

  return {
    frontmatter: parsed.data || {},
    html,
  };
}

function renderLogoHtml() {
  const logoPath = path.join(websiteRoot, 'assets', 'logo.svg');
  if (fs.existsSync(logoPath)) {
    return '<img src="/assets/logo.svg" alt="Demoscapes" class="brand-logo" />';
  }
  return '<span class="brand-text">demoscapes</span>';
}

function renderBasePage({ title, navKey, content }) {
  const templatePath = path.join(templatesRoot, 'base.html');
  let template = fs.readFileSync(templatePath, 'utf8');

  const navClasses = {
    home: navKey === 'home' ? 'is-current' : '',
    topics: navKey === 'topics' ? 'is-current' : '',
    collections: navKey === 'collections' ? 'is-current' : '',
    sources: navKey === 'sources' ? 'is-current' : '',
    about: navKey === 'about' ? 'is-current' : '',
  };

  const replacements = {
    '{{TITLE}}': title,
    '{{CONTENT}}': content,
    '{{LOGO}}': renderLogoHtml(),
    '{{NAV_HOME}}': navClasses.home,
    '{{NAV_TOPICS}}': navClasses.topics,
    '{{NAV_COLLECTIONS}}': navClasses.collections,
    '{{NAV_SOURCES}}': navClasses.sources,
    '{{NAV_ABOUT}}': navClasses.about,
  };

  Object.keys(replacements).forEach((placeholder) => {
    template = template.replaceAll(placeholder, replacements[placeholder]);
  });

  return template;
}

function renderArticleList(items, basePath) {
  if (items.length === 0) {
    return '<p>No content yet.</p>';
  }

  const cards = items
    .map((item) => {
      return [
        '<article class="content-card">',
        `  <h2><a href="/${basePath}/${item.slug}.html">${escapeHtml(item.title)}</a></h2>`,
        item.summary ? `  <p>${escapeHtml(item.summary)}</p>` : '',
        '</article>',
      ].join('\n');
    })
    .join('\n');

  return `<section class="content-grid">${cards}</section>`;
}

function writeHtml(outputPath, html) {
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, html, 'utf8');
}

function sortByOrderThenTitle(a, b) {
  const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
  const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return String(a.title || '').localeCompare(String(b.title || ''));
}

function renderMarkdownPage(markdownPath, navKey, outFilePath) {
  const parsed = readMarkdown(markdownPath);
  const pageTitle = parsed.frontmatter.title || 'Demoscapes';
  const html = renderBasePage({
    title: pageTitle,
    navKey,
    content: `<article class="content-page markdown-content">${parsed.html}</article>`,
  });
  writeHtml(outFilePath, html);
}

function buildTopics(sectionName, navKey) {
  const sectionDir = path.join(contentRoot, sectionName);
  const outDir = path.join(distRoot, sectionName);
  ensureDir(outDir);

  const files = fs
    .readdirSync(sectionDir)
    .filter((file) => file.endsWith('.md'));

  const entries = files.map((file) => {
    const filePath = path.join(sectionDir, file);
    const parsed = readMarkdown(filePath);
    const slug = parsed.frontmatter.slug || slugify(path.basename(file, '.md'));
    const title = parsed.frontmatter.title || slug;
    const summary = parsed.frontmatter.summary || '';
    const order = parsed.frontmatter.order;

    const pageHtml = renderBasePage({
      title,
      navKey,
      content: `<article class="content-page markdown-content">${parsed.html}</article>`,
    });
    writeHtml(path.join(outDir, `${slug}.html`), pageHtml);

    return { slug, title, summary, order };
  });

  entries.sort(sortByOrderThenTitle);

  const indexTitle = 'Topics';
  const intro = '<p>Background articles and methodological notes.</p>';

  const indexContent = [
    '<section class="content-page">',
    `  <h1>${indexTitle}</h1>`,
    `  ${intro}`,
    renderArticleList(entries, sectionName),
    '</section>',
  ].join('\n');

  const indexHtml = renderBasePage({ title: indexTitle, navKey, content: indexContent });
  writeHtml(path.join(distRoot, `${sectionName}.html`), indexHtml);
}

function buildSourcesPage() {
  const introPath = path.join(contentRoot, 'data-sources.md');
  const introParsed = readMarkdown(introPath);
  const sources = parseListYaml(fs.readFileSync(sourcesYamlPath, 'utf8'), 'sources');

  const cards = sources.map((source) => {
    const link = source.url
      ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.url)}</a>`
      : '';
    return [
      '<article class="source-card">',
      `  <h2>${escapeHtml(source.name || source.key || '')}</h2>`,
      `  <p class="source-key"><strong>Key:</strong> ${escapeHtml(source.key || '')}</p>`,
      source.citation ? `  <p>${escapeHtml(source.citation)}</p>` : '',
      source.license ? `  <p><strong>License:</strong> ${escapeHtml(source.license)}</p>` : '',
      link ? `  <p>${link}</p>` : '',
      '</article>',
    ].join('\n');
  }).join('\n');

  const content = [
    '<section class="content-page markdown-content">',
    introParsed.html,
    '</section>',
    '<section class="source-grid">',
    cards,
    '</section>',
  ].join('\n');

  const page = renderBasePage({
    title: introParsed.frontmatter.title || 'Data Sources',
    navKey: 'sources',
    content,
  });
  writeHtml(path.join(distRoot, 'data-sources.html'), page);
}

function buildCollectionsFromMetadata() {
  const collections = parseListYaml(fs.readFileSync(collectionsYamlPath, 'utf8'), 'collections')
    .filter((entry) => entry && entry.key)
    .filter((entry) => entry.isPublic !== false)
    .map((entry) => ({
      key: String(entry.key),
      slug: slugify(entry.key),
      title: entry.name || entry.key,
      summary: entry.summary || entry.description || '',
      description: entry.description || '',
      order: entry.order,
    }))
    .sort(sortByOrderThenTitle);

  const outDir = path.join(distRoot, 'collections');
  ensureDir(outDir);

  const cards = collections
    .map((collection) => {
      return [
        '<article class="content-card">',
        `  <h2><a href="/collections/${collection.slug}.html">${escapeHtml(collection.title)}</a></h2>`,
        collection.summary ? `  <p>${escapeHtml(collection.summary)}</p>` : '',
        '</article>',
      ].join('\n');
    })
    .join('\n');

  const indexContent = [
    '<section class="content-page">',
    '  <h1>Collections</h1>',
    '  <p>Curated subsets of data and preconfigured visualizations.</p>',
    `  <section class="content-grid">${cards}</section>`,
    '</section>',
  ].join('\n');

  writeHtml(
    path.join(distRoot, 'collections.html'),
    renderBasePage({ title: 'Collections', navKey: 'collections', content: indexContent }),
  );

  collections.forEach((collection) => {
    const options = {
      collectionKey: collection.key,
      title: `${collection.title} Lexis surface`,
      showControls: true,
    };
    const encoded = encodeURIComponent(JSON.stringify(options));
    const detailContent = [
      '<article class="content-page markdown-content">',
      `  <h1>${escapeHtml(collection.title)}</h1>`,
      collection.description ? `  <p>${escapeHtml(collection.description)}</p>` : '',
      `  <div class="lexis-embed" id="collection-${escapeHtml(collection.slug)}" data-lexis-options="${encoded}"></div>`,
      '</article>',
    ].join('\n');

    writeHtml(
      path.join(outDir, `${collection.slug}.html`),
      renderBasePage({ title: collection.title, navKey: 'collections', content: detailContent }),
    );
  });
}

function buildHomePage() {
  const parsed = readMarkdown(path.join(contentRoot, 'index.md'));
  const html = renderBasePage({
    title: parsed.frontmatter.title || 'Demoscapes',
    navKey: 'home',
    content: `<article class="content-page markdown-content">${parsed.html}</article>`,
  });
  writeHtml(path.join(distRoot, 'index.html'), html);
}

function main() {
  resetDir(distRoot);

  buildHomePage();
  renderMarkdownPage(path.join(contentRoot, 'about.md'), 'about', path.join(distRoot, 'about.html'));
  buildTopics('topics', 'topics');
  buildCollectionsFromMetadata();
  buildSourcesPage();

  copyRecursive(path.join(websiteRoot, 'styles.css'), path.join(distRoot, 'styles.css'));
  copyRecursive(path.join(websiteRoot, 'js'), path.join(distRoot, 'js'));
  copyRecursive(path.join(websiteRoot, 'assets'), path.join(distRoot, 'assets'));

  console.log('Website build complete.');
}

main();

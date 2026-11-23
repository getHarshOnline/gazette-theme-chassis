import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';

const configured = process.env.GAZETTE_SASS_MODULE && process.env.GAZETTE_BASE_PATH && process.env.GAZETTE_HANDOFF_DISPLAY_FONT && process.env.GAZETTE_HANDOFF_READING_FONT;
const fontBytes = async location => {
  if (!/^https?:/.test(location)) return readFile(location);
  const response = await fetch(location);
  assert.ok(response.ok, `Font request failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

// Native schema/rendering is covered by relationships.py. This fixture uses the
// existing component markup and compiled styles to measure its static layout.
test('handoff inputs join review and continuation on phones without losing text or the print account', {skip: !configured}, async () => {
  const module = await import(pathToFileURL(process.env.GAZETTE_SASS_MODULE));
  const sass = module.default || module;
  const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const base = process.env.GAZETTE_BASE_PATH;
  const options = {logger: {warn() {}}, importers: [{findFileUrl(url) {
    return url.includes('shared/') ? pathToFileURL(`${base}/styles/${url.split('shared/')[1]}`) : null;
  }}]};
  const physics = sass.compile(`${base}/styles/physics.scss`, options).css;
  const world = sass.compile(fileURLToPath(new URL('../styles/world.scss', import.meta.url)), options).css;
  const tokens = await readFile(new URL('../tokens/world.css', import.meta.url), 'utf8');
  const template = await readFile(new URL('../templates/components/product-handoff.html', import.meta.url), 'utf8');
  const [display, reading] = await Promise.all([process.env.GAZETTE_HANDOFF_DISPLAY_FONT, process.env.GAZETTE_HANDOFF_READING_FONT].map(fontBytes));
  const fonts = `@font-face{font-family:'Fixture Display';font-weight:100 900;font-stretch:50% 125%;src:url(data:font/woff2;base64,${display.toString('base64')})}@font-face{font-family:'Fixture Reading';font-weight:400 700;src:url(data:font/woff2;base64,${reading.toString('base64')})}:root{--world-type-display-family:'Fixture Display';--type-family-reading:'Fixture Reading'}`;
  const inputs = [
    {title: 'An instrument report', body: 'An instrument records a changed condition that needs examination.'},
    {title: 'A request for help', body: 'A person explains the problem and the assistance they need.'},
    {title: 'A supporting observation', body: 'Another observer supplies context without deciding the outcome.'},
  ];
  const arguments_ = {
    review: {title: 'Examine the information', body: 'Compare the reports, retain uncertainty and identify what remains unanswered.'},
    continuation: {title: 'Carry the context onward', body: 'The person accepting the assignment receives the information already examined.'},
  };
  const qualification = 'Receiving a report and accepting work remain separate responsibilities.';
  const html = template
    .replace(/{% for input in component.arguments.inputs %}([\s\S]*?){% endfor %}/, (_, item) => inputs.map(input => item.replace(/{{ input\.(title|body) }}/g, (_, key) => input[key])).join(''))
    .replace(/{{ component.arguments\.(review|continuation)\.(title|body) }}/g, (_, role, key) => arguments_[role][key])
    .replace('{{ component.body.html | safe }}', `<p>${qualification}</p>`);
  assert.ok(!html.includes('{{') && !html.includes('{%'));
  const expected = [...inputs, ...Object.values(arguments_)].flatMap(part => [part.title, part.body]).concat(qualification);
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390, 1280]) for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({viewport: {width, height: 844}, javaScriptEnabled: false});
      await page.setContent(`<html data-mode="${mode}"><head><style>${tokens}\n${physics}\n${world}\n${fonts}</style></head><body><main><div class="publication-body"><div class="project-explanation">${html}</div></div></main></body></html>`);
      await page.evaluate(async () => {await Promise.all([document.fonts.load('24px "Fixture Display"'), document.fonts.load('18px "Fixture Reading"')]); await document.fonts.ready;});
      for (const medium of ['screen', 'print']) {
        await page.emulateMedia({media: medium});
        const actual = await page.evaluate(() => {
          const handoff = document.querySelector('.product-handoff');
          const parts = [...handoff.children];
          const rect = element => {const {left, right, top, bottom, width, height} = element.getBoundingClientRect(); return {left, right, top, bottom, width, height};};
          const pseudo = (element, selector) => {const css = getComputedStyle(element, selector); return {content: css.content, display: css.display, left: parseFloat(css.left), top: parseFloat(css.top), width: parseFloat(css.width), height: parseFloat(css.height), vertical: parseFloat(css.borderInlineStartWidth), horizontal: parseFloat(css.borderBlockStartWidth)};};
          const text = [...handoff.querySelectorAll('h3,p')];
          return {
            parts: parts.map(rect), connectors: parts.slice(1, 3).map(part => pseudo(part, '::before')),
            branches: [...parts[0].children].map(part => pseudo(part, '::before')),
            join: pseudo(parts[0], '::after'), rail: parseFloat(getComputedStyle(parts[0]).borderInlineStartWidth),
            text: text.map(element => ({value: element.textContent, box: rect(element), overflow: element.scrollWidth > element.clientWidth + 1})),
            overflow: handoff.scrollWidth > handoff.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
            fonts: [...document.fonts].map(face => face.status),
          };
        });
        const context = `${width}/${mode}/${medium}`;
        assert.deepEqual(actual.text.map(item => item.value), expected, context);
        assert.ok(actual.fonts.length === 2 && actual.fonts.every(status => status === 'loaded'), context);
        assert.equal(actual.overflow, false, context);
        assert.ok(actual.text.every(item => item.box.height > 0 && !item.overflow), context);
        if (medium === 'screen' && width < 768) {
          assert.ok(actual.rail > 0 && actual.join.horizontal > 0, context);
          assert.ok(actual.branches.every(branch => branch.content !== 'none' && branch.horizontal > 0 && branch.width > 0), context);
          actual.connectors.forEach((line, index) => {
            const target = actual.parts[index + 1], previous = actual.parts[index];
            assert.notEqual(line.display, 'none', context);
            assert.ok(line.vertical > 0 && line.horizontal === 0 && line.height > 0, context);
            assert.ok(Math.abs(target.top + line.top - previous.bottom) <= 2, `${context}: disconnected start`);
            assert.ok(Math.abs(line.top + line.height) <= 2, `${context}: disconnected end`);
            assert.ok(previous.bottom < target.top, `${context}: overlapping responsibilities`);
          });
        } else if (medium === 'screen') {
          assert.ok(actual.parts[0].right < actual.parts[1].left && actual.parts[1].right < actual.parts[2].left, context);
          assert.ok(actual.connectors.every(line => line.horizontal > 0 && line.width > 0), context);
          assert.ok(actual.branches.every(branch => branch.content === 'none'), context);
        } else {
          assert.ok(actual.connectors.every(line => line.display === 'none'), context);
          assert.ok(actual.branches.every(branch => branch.content === 'none'), context);
          actual.parts.slice(1).forEach((part, index) => assert.ok(part.top >= actual.parts[index].bottom, context));
        }
      }
      await page.close();
    }
  } finally {await browser.close();}
});

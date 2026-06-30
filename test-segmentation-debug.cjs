// 诊断脚本：模拟 "A new era for software testing" 文章的分段
const { JSDOM } = require('jsdom');

// 模拟可能的 rawHtml 结构
const testCases = [
  {
    name: 'Only title in h1',
    rawHtml: '<h1>A new era for software testing</h1>',
  },
  {
    name: 'Title + paragraphs',
    rawHtml: '<h1>A new era for software testing</h1><p>First paragraph.</p><p>Second paragraph.</p>',
  },
  {
    name: 'Title in article tag',
    rawHtml: '<article><h1>A new era for software testing</h1><p>Content here.</p></article>',
  },
];

function normalizeSegment(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function splitHtmlSegments(html) {
  try {
    const dom = new JSDOM(`<body>${html}</body>`);
    const document = dom.window.document;
    const blockSelector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,td,th';
    const segments = Array.from(document.querySelectorAll(blockSelector))
      .map((node) => normalizeSegment(node.textContent ?? ''))
      .filter(Boolean);

    if (segments.length > 0) {
      return segments;
    }

    return [normalizeSegment(document.body.textContent ?? '')].filter(Boolean);
  } catch {
    return [normalizeSegment(html.replace(/<[^>]+>/g, ' '))].filter(Boolean);
  }
}

testCases.forEach(test => {
  console.log(`\n=== ${test.name} ===`);
  console.log('Input:', test.rawHtml.substring(0, 80) + (test.rawHtml.length > 80 ? '...' : ''));
  const segments = splitHtmlSegments(test.rawHtml);
  console.log('Segments count:', segments.length);
  segments.forEach((seg, i) => {
    console.log(`  [${i}]:`, seg.substring(0, 60) + (seg.length > 60 ? '...' : ''));
  });
});

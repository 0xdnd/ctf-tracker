import DOMPurify from 'dompurify';

// Hook ensuring zero remote egress for all images (blocks remote HTTP/HTTPS tracking beacons)
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (data.attrName === 'src' && node.tagName === 'IMG') {
    const val = (data.attrValue || '').trim();
    // Allow only relative local paths, local filenames, or safe base64 image data URIs
    const isSafeSource = /^(\/|\.\/|data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,|[a-zA-Z0-9_.-]+\.(png|jpe?g|gif|webp|svg))/i.test(val);
    if (!isSafeSource) {
      data.attrValue = ''; // Neutralize remote tracking beacon
    }
  }
});

/**
 * Strict DOMPurify sanitization for HTML content (Markdown renders, notes, writeups).
 * Blocks all script execution, iframe/object embedding, and inline event handlers (on*).
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string' || !dirty.trim()) return '';

  const result = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'b', 'i', 'strong', 'em', 'strike', 'del',
      'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'hr', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'span', 'div', 'mark', 'a', 'img', 'br', 'sub', 'sup', 'kbd',
      'dl', 'dt', 'dd', 'input', 'button', 'details', 'summary'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'class', 'id', 'target', 'rel', 'src', 'alt', 'width', 'height',
      'loading', 'type', 'checked', 'disabled', 'aria-label', 'aria-hidden', 'role', 'name'
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'style', 'link', 'meta', 'base', 'applet'],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onkeydown', 'onkeypress', 'onkeyup', 'style', 'formaction'
    ],
  });

  return typeof result === 'string' && !result.trim() ? '' : result;
}

/**
 * Strict DOMPurify sanitization for SVG diagrams and vector graphics (Mermaid diagrams, attack graphs).
 * Preserves SVG visual structure while forbidding script tags, external links, animations, and event handlers.
 */
export function sanitizeSvg(dirtySvg: string): string {
  if (!dirtySvg || typeof dirtySvg !== 'string' || !dirtySvg.trim()) return '';

  const result = DOMPurify.sanitize(dirtySvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_ATTR: ['dominant-baseline'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed', 'link', 'meta', 'foreignObject',
      'animate', 'set', 'animateTransform', 'animateMotion', 'discard', 'handler'
    ],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onbegin', 'onend', 'onrepeat', 'xlink:href'
    ],
  });

  return typeof result === 'string' && !result.trim() ? '' : result;
}

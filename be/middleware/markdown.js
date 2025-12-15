const { marked } = require('marked');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// DOMPurify instance for server-side
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// 'Marked' Config
marked.setOptions({
    headerIds: false,
    mangle: false,
    sanitize: false, // We'll sanitize with DOMPurify instead
    silent: false,
    breaks: true, // Convert line breaks to <br>
    gfm: true, // Enable GitHub flavored markdown
});

// 'DOMPurify' Config 
const purifyConfig = {
    // Allowed tags and attributes
    ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'del', 's', 'strike',
        'blockquote', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 
        'h3', 'h4', 'h5', 'h6', 'hr', 'table', 'thead', 'tbody', 'tr', 
        'td', 'th'
    ],
    ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp):\/\/|mailto:|tel:|#)/i,

    // Not allowed tags and attributes (security against scripting)
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'style']
};

function renderMarkdown(markdown) {
    try {
        if (!markdown || typeof markdown !== 'string') {
            return '';
        }

        // Converting markdown to HTML
        const rawHtml = marked(markdown);
        
        // Preventing XSS by sanitizing the HTML
        const safeHtml = DOMPurify.sanitize(rawHtml, purifyConfig);
        
        return safeHtml;
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return '';
    }
}

// Escape HTML special characters
function escapeHtml(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function stripMarkdown(markdown) {
    try {
        if (!markdown || typeof markdown !== 'string') {
            return '';
        }

        // Convert to HTML first, then strip all HTML tags
        const html = marked(markdown);
        const plainText = html.replace(/<[^>]*>/g, '');
        
        // Decode HTML entities
        return plainText
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .trim();
    } catch (error) {
        console.error('Error stripping markdown:', error);
        return markdown;
    }
}

module.exports = {
    renderMarkdown,
    escapeHtml,
    stripMarkdown
};

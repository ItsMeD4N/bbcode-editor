document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('bbcode-input');
    const highlightLayer = document.getElementById('highlight-layer').querySelector('code');
    const lineNumbers = document.getElementById('line-numbers');
    const previewOutput = document.getElementById('preview-output');
    const editorScroll = document.getElementById('editor-scroll');
    const lineCount = document.getElementById('line-count');

    let isSyncingToPreview = false;
    let isSyncingToEditor = false;

    const defaultTemplate = ``;

    function parseBBCode(text) {
        let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html = html.replace(/  /g, ' &nbsp;');

        let prevHtml;
        do {
            prevHtml = html;

            html = html.replace(/\[divbox=([^\]]+)\]((?:(?!\[\/?divbox[=\]])[\s\S])*?)\[\/divbox\]/gi, (match, color, content) => {
                color = color.trim().replace(/["']/g, ''); // sanitize color
                let classes = 'p-5 rounded-lg shadow-sm mb-4 transition-colors duration-300 bbcode-divbox ';
                let style = '';
                if (color.toLowerCase() === 'white') {
                    classes += 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700';
                } else if (color.toLowerCase() === 'darkblue') {
                    classes += 'bg-blue-900 text-white border border-blue-800';
                } else {
                    style = `background-color: ${color};`;
                }
                return '<div ' +
                    `class="${classes}" ` +
                    `style="${style}" ` +
                    `data-bbcode-color="${color}"` +
                    `>${content}</div>`;
            });

            html = html.replace(/\[lspdsubtitle=([^\]]+)\]((?:(?!\[\/?lspdsubtitle[=\]])[\s\S])*?)\[\/lspdsubtitle\]/gi, (match, color, content) => {
                color = color.trim().replace(/["']/g, '');
                return '<div ' +
                    `style="background-color: ${color};" ` +
                    `data-bbcode-color="${color}" ` +
                    'class="text-white font-bold p-2 px-4 mb-3 uppercase rounded shadow-sm tracking-wide text-sm bbcode-subtitle"' +
                    `>${content}</div>`;
            });

            html = html.replace(/\[spoiler=([^\]]+)\]((?:(?!\[\/?spoiler[=\]])[\s\S])*?)\[\/spoiler\]/gi, (match, title, content) => {
                title = title.replace(/["']/g, '');
                return '<details ' +
                    'class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md mb-3 overflow-hidden shadow-sm transition-all duration-300 bbcode-spoiler" ' +
                    `data-bbcode-title="${title}"` +
                    '><summary ' +
                    'class="p-3 cursor-pointer font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors select-none"' +
                    `>${title}</summary><div ` +
                    'class="p-4 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 bbcode-spoiler-content"' +
                    `>${content}</div></details>`;
            });

            html = html.replace(/\[img\]((?:(?!\[\/?img\])[\s\S])*?)\[\/img\]/gi, (match, url) => {
                url = url.trim().replace(/["']/g, '');
                return '<span ' +
                    'class="relative inline-block group bbcode-img-wrapper max-w-full my-2" ' +
                    'contenteditable="false"' +
                    '><img ' +
                    `src="${url}" ` +
                    'alt="User Image" ' +
                    'class="block max-w-full rounded-md shadow-sm bbcode-img"' +
                    '><div ' +
                    'class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-md cursor-pointer bbcode-img-edit transition-all"' +
                    '><span ' +
                    'class="text-white text-sm font-medium px-3 py-1 bg-gray-900/80 rounded-full"' +
                    '><i class="fa-solid fa-link"></i> Ubah Link</span></div></span>';
            });

            html = html.replace(/\[center\]((?:(?!\[\/?center\])[\s\S])*?)\[\/center\]/gi, '<div ' +
                'style="text-align: center; width: 100%; display: block;" ' +
                'class="bbcode-center"' +
                `>$1</div>`);

            html = html.replace(/\[b\]((?:(?!\[\/?b\])[\s\S])*?)\[\/b\]/gi, '<strong>$1</strong>');

            html = html.replace(/\[size=([^\]]+)\]((?:(?!\[\/?size[=\]])[\s\S])*?)\[\/size\]/gi, (match, size, content) => {
                size = parseFloat(size) || 100;
                return '<span ' +
                    `style="font-size: ${size}%;" ` +
                    `data-bbcode-size="${size}" ` +
                    'class="bbcode-size"' +
                    `>${content}</span>`;
            });

            html = html.replace(/\[color=([^\]]+)\]((?:(?!\[\/?color[=\]])[\s\S])*?)\[\/color\]/gi, (match, color, content) => {
                color = color.trim().replace(/["']/g, '');
                return '<span ' +
                    `style="color: ${color};" ` +
                    `data-bbcode-color="${color}" ` +
                    'class="bbcode-color"' +
                    `>${content}</span>`;
            });

        } while (html !== prevHtml);

        html = html.replace(/\n/g, '<br>');

        html = html.replace(/<\/div><br>/g, '</div>');
        html = html.replace(/<div([^>]*)><br>/g, '<div$1>');
        html = html.replace(/<\/details><br>/g, '</details>');

        return html;
    }

    function parseHTMLToBBCode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.replace(/\u00A0/g, ' ');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        let innerBBCode = Array.from(node.childNodes).map(parseHTMLToBBCode).join('');
        let tag = node.tagName.toLowerCase();

        if (tag === 'br') return '\n';
        if (tag === 'strong' || tag === 'b') return `[b]${innerBBCode}[/b]`;
        if (tag === 'img') return `[img]${node.getAttribute('src')}[/img]`;

        if (tag === 'span') {
            if (node.classList.contains('bbcode-img-wrapper')) {
                let img = node.querySelector('img');
                return img ? `[img]${img.getAttribute('src')}[/img]` : '';
            }
            if (node.classList.contains('bbcode-color') || node.style.color) {
                let color = node.getAttribute('data-bbcode-color') || node.style.color;
                return `[color=${color}]${innerBBCode}[/color]`;
            }
            if (node.classList.contains('bbcode-size') || node.style.fontSize) {
                let size = node.getAttribute('data-bbcode-size') || parseFloat(node.style.fontSize);
                return `[size=${size}]${innerBBCode}[/size]`;
            }
        }

        if (tag === 'div') {
            if (node.classList.contains('bbcode-center') || node.style.textAlign === 'center') {
                return `[center]${innerBBCode.replace(/^[\r\n]+|[\r\n]+$/g, '')}[/center]\n`;
            }
            if (node.classList.contains('bbcode-divbox')) {
                let color = node.getAttribute('data-bbcode-color') || 'white';
                return `[divbox=${color}]\n${innerBBCode.replace(/^[\r\n]+|[\r\n]+$/g, '')}\n[/divbox]\n`;
            }
            if (node.classList.contains('bbcode-subtitle')) {
                let color = node.getAttribute('data-bbcode-color') || '#11224E';
                return `[lspdsubtitle=${color}]${innerBBCode.replace(/^[\r\n]+|[\r\n]+$/g, '')}[/lspdsubtitle]\n`;
            }
            return `\n${innerBBCode}\n`;
        }

        if (tag === 'details' || node.classList.contains('bbcode-spoiler')) {
            let summaryNode = node.querySelector('summary');
            let title = summaryNode ? summaryNode.textContent.replace(/\u00A0/g, ' ') : (node.getAttribute('data-bbcode-title') || 'Spoiler');
            let contentNode = node.querySelector('.bbcode-spoiler-content') || node.querySelector('div');
            let contentBBCode = contentNode ? Array.from(contentNode.childNodes).map(parseHTMLToBBCode).join('') : '';
            return `[spoiler=${title.trim()}]\n${contentBBCode.replace(/^[\r\n]+|[\r\n]+$/g, '')}\n[/spoiler]\n`;
        }

        return innerBBCode;
    }

    function applyHighlighting(text) {
        let escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        let highlighted = escaped.replace(/(\[)(\/?)([a-zA-Z0-9]+)(?:(=)(.*?))?(\])/g, (match, openBracket, slash, tag, equals, value, closeBracket) => {
            let res = `<span class="hl-bracket">${openBracket}${slash}</span>`;
            res += `<span class="hl-tag">${tag}</span>`;
            if (equals && value !== undefined) {
                res += `<span class="hl-equals">${equals}</span>`;
                res += `<span class="hl-value">${value}</span>`;
            }
            res += `<span class="hl-bracket">${closeBracket}</span>`;
            return res;
        });

        return highlighted;
    }

    function updatePreviewFromEditor() {
        if (isSyncingToEditor) return;
        isSyncingToPreview = true;

        const text = textarea.value;
        highlightLayer.innerHTML = applyHighlighting(text) + (text.endsWith('\n') ? ' ' : '');

        const linesCount = text.split('\n').length;
        lineNumbers.innerHTML = Array(linesCount).fill(0).map((_, i) => i + 1).join('<br>');
        lineCount.innerHTML = `<i class="fa-solid fa-list-ol mr-1"></i> ${linesCount} line${linesCount !== 1 ? 's' : ''}`;

        let rawHtml = parseBBCode(text);

        if (typeof DOMPurify !== 'undefined') {
            rawHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['data-bbcode-color', 'data-bbcode-title', 'data-bbcode-size', 'contenteditable'] });
        }

        previewOutput.innerHTML = rawHtml;
        localStorage.setItem('bbcode_draft', text);

        isSyncingToPreview = false;
    }

    function updateEditorFromPreview() {
        if (isSyncingToPreview) return;
        isSyncingToEditor = true;

        const parsedBBCode = parseHTMLToBBCode(previewOutput).trim();
        textarea.value = parsedBBCode;

        highlightLayer.innerHTML = applyHighlighting(parsedBBCode) + (parsedBBCode.endsWith('\n') ? ' ' : '');

        const linesCount = parsedBBCode.split('\n').length;
        lineNumbers.innerHTML = Array(linesCount).fill(0).map((_, i) => i + 1).join('<br>');
        lineCount.innerHTML = `<i class="fa-solid fa-list-ol mr-1"></i> ${linesCount} line${linesCount !== 1 ? 's' : ''}`;

        localStorage.setItem('bbcode_draft', parsedBBCode);

        isSyncingToEditor = false;
    }

    textarea.addEventListener('input', updatePreviewFromEditor);

    previewOutput.addEventListener('input', () => {
        updateEditorFromPreview();
    });

    let currentEditingImg = null;

    previewOutput.addEventListener('click', (e) => {
        let editBtn = e.target.closest('.bbcode-img-edit');
        if (editBtn) {
            let img = editBtn.parentElement.querySelector('img');
            if (img) {
                currentEditingImg = img;
                const currentSrc = img.getAttribute('src');
                const defaultPrompt = (currentSrc === 'xxxxx' || currentSrc.includes('via.placeholder.com')) ? '' : currentSrc;

                document.getElementById('img-modal-input').value = defaultPrompt;
                document.getElementById('img-modal').classList.remove('hidden');
                document.getElementById('img-modal').classList.add('flex');
                document.getElementById('img-modal-input').focus();
            }
        }
    });

    document.getElementById('img-modal-cancel').addEventListener('click', () => {
        document.getElementById('img-modal').classList.add('hidden');
        document.getElementById('img-modal').classList.remove('flex');
        currentEditingImg = null;
    });

    document.getElementById('img-modal-save').addEventListener('click', () => {
        if (currentEditingImg) {
            const newSrc = document.getElementById('img-modal-input').value.trim();
            if (newSrc !== '') {
                currentEditingImg.setAttribute('src', newSrc);
                updateEditorFromPreview();
            }
            document.getElementById('img-modal').classList.add('hidden');
            document.getElementById('img-modal').classList.remove('flex');
            currentEditingImg = null;
        }
    });

    textarea.addEventListener('scroll', () => {
        highlightLayer.parentElement.scrollTop = textarea.scrollTop;
        highlightLayer.parentElement.scrollLeft = textarea.scrollLeft;
        lineNumbers.scrollTop = textarea.scrollTop;
    });

    document.getElementById('btn-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(textarea.value).then(() => {
            const btn = document.getElementById('btn-copy');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        });
    });

    document.getElementById('btn-download').addEventListener('click', () => {
        const htmlContent = previewOutput.innerHTML;
        const fullHtml =
            `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LSPD Patrol Report Export</title>
            
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            
            <style>
                body { 
                    font-family: 'Inter', sans-serif; 
                    background-color: #f3f4f6; 
                    color: #1f2937; 
                }
                .bbcode-content { 
                    max-width: 800px; 
                    margin: 2rem auto; 
                    background: white; 
                    padding: 2rem; 
                    border-radius: 0.5rem; 
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); 
                }
                .dark body { 
                    background-color: #111827; 
                    color: #f9fafb; 
                }
                .dark .bbcode-content { 
                    background: #1f2937; 
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.5); 
                }
                details > summary { 
                    list-style: none; 
                }
                details > summary::-webkit-details-marker { 
                    display: none; 
                }
            </style>
        </head>
        <body class="${document.documentElement.classList.contains('dark') ? 'dark' : ''}">
            <div class="bbcode-content">
                ${htmlContent}
            </div>
        </body>
        </html>`;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lspd_report.html';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('btn-export').addEventListener('click', async () => {
        const btn = document.getElementById('btn-export');
        const originalText = btn.innerHTML;

        if (typeof html2canvas === 'undefined') {
            alert('Export library is still loading, please wait a moment.');
            return;
        }

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
        btn.disabled = true;

        try {
            const isDark = document.documentElement.classList.contains('dark');
            const originalBg = previewOutput.style.backgroundColor;
            previewOutput.style.backgroundColor = isDark ? '#1f2937' : '#ffffff';

            const canvas = await html2canvas(previewOutput, {
                scale: 2,
                useCORS: true,
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                logging: false
            });

            const link = document.createElement('a');
            link.download = 'lspd_report_preview.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            previewOutput.style.backgroundColor = originalBg;

            btn.innerHTML = '<i class="fa-solid fa-check"></i> Exported!';
        } catch (err) {
            console.error('Error exporting PNG:', err);
            alert('Failed to export to PNG. Check console for details.');
            btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Failed';
        }

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the editor?')) {
            textarea.value = '';
            updatePreviewFromEditor();
        }
    });

    document.getElementById('btn-theme').addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('bbcode_theme', isDark ? 'dark' : 'light');

        const icon = document.querySelector('#btn-theme i');
        if (isDark) {
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
        }
    });

    const previewSection = document.getElementById('preview-section');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen.addEventListener('click', () => {
        previewSection.classList.toggle('fullscreen-active');
        if (previewSection.classList.contains('fullscreen-active')) {
            btnFullscreen.innerHTML = '<i class="fa-solid fa-compress"></i>';
            document.body.style.overflow = 'hidden';
        } else {
            btnFullscreen.innerHTML = '<i class="fa-solid fa-expand"></i>';
            document.body.style.overflow = '';
        }
    });

    const savedTheme = localStorage.getItem('bbcode_theme');
    const icon = document.querySelector('#btn-theme i');
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
        icon.classList.replace('fa-moon', 'fa-sun');
    } else {
        document.documentElement.classList.add('dark');
        icon.classList.replace('fa-sun', 'fa-moon');
    }

    const savedDraft = localStorage.getItem('bbcode_draft');
    if (savedDraft !== null && savedDraft !== '') {
        textarea.value = savedDraft;
    } else {
        textarea.value = defaultTemplate;
    }

    textarea.focus();
    updatePreviewFromEditor();
});

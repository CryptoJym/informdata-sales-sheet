// Light-weight HTML partial include: <div data-include="components/header.html"></div>
(function() {
  function injectIncludes() {
    const nodes = document.querySelectorAll('[data-include]');
    nodes.forEach(async (node) => {
      const url = node.getAttribute('data-include');
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load ' + url);
        const html = await res.text();
        node.outerHTML = html;
      } catch (e) {
        console.error(e);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectIncludes);
  } else {
    injectIncludes();
  }

  // Attach chat widget after include
  function attachChat() {
    if (document.getElementById('vup-chat-widget')) return;

    // HTML escaping utility to prevent XSS
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    const btn = document.createElement('button');
    btn.id = 'vup-chat-widget';
    btn.textContent = 'Chat';
    btn.style.cssText = 'position:fixed;right:16px;bottom:16px;background:#2563eb;color:#fff;border:none;border-radius:999px;padding:.6rem 1rem;font-weight:700;box-shadow:0 10px 20px rgba(37,99,235,.25);z-index:9999;cursor:pointer';
    document.body.appendChild(btn);
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:16px;bottom:64px;width:360px;max-width:92vw;background:#fff;border:1px solid #d4dae5;border-radius:12px;box-shadow:0 12px 28px rgba(15,23,42,.18);padding:12px;display:none;z-index:9999;';
    panel.innerHTML = '<div style="font-weight:700;margin-bottom:8px">Docs Assistant</div><div id="vup-chat-log" style="height:260px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin-bottom:8px;font-size:14px"></div><div style="display:flex;gap:8px;"><input id="vup-chat-input" placeholder="Ask about MVR/API…" style="flex:1;padding:.5rem;border:1px solid #d4dae5;border-radius:8px"/><button id="vup-chat-send" style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:.5rem .9rem;font-weight:700">Send</button></div>';
    document.body.appendChild(panel);
    btn.addEventListener('click', ()=>{ panel.style.display = panel.style.display==='none'?'block':'none'; });
    const log = panel.querySelector('#vup-chat-log');
    const input = panel.querySelector('#vup-chat-input');
    const send = panel.querySelector('#vup-chat-send');
    let isLoading = false;

    async function ask(){
      const q = input.value.trim();
      if(!q || isLoading) return;

      // Disable input during request
      isLoading = true;
      input.disabled = true;
      send.disabled = true;
      send.textContent = '...';
      input.value = '';

      const add = (role, text, isHtml = false)=>{
        const div = document.createElement('div');
        div.style.margin = '6px 0';
        const roleSpan = document.createElement('b');
        roleSpan.textContent = role + ': ';
        div.appendChild(roleSpan);
        if (isHtml) {
          // For bot responses with escaped HTML
          const contentSpan = document.createElement('span');
          contentSpan.innerHTML = text;
          div.appendChild(contentSpan);
        } else {
          // For user input - safe text node
          div.appendChild(document.createTextNode(text));
        }
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
      };

      add('You', q);

      // Add loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.style.margin = '6px 0';
      loadingDiv.style.fontStyle = 'italic';
      loadingDiv.style.color = '#666';
      loadingDiv.textContent = 'Bot is thinking...';
      log.appendChild(loadingDiv);
      log.scrollTop = log.scrollHeight;

      try{
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s client timeout

        const r = await fetch('/api/chat', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ query: q }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Remove loading indicator
        loadingDiv.remove();

        if (!r.ok) {
          const errorData = await r.json().catch(() => ({}));
          const errorMsg = errorData.error || `Server error (${r.status})`;
          add('Bot', errorMsg + (errorData.fallback ? `\n\n${errorData.fallback}` : ''));
        } else {
          const j = await r.json();
          if(j.answer) {
            // Escape HTML then replace newlines with <br/>
            const escaped = escapeHtml(j.answer);
            add('Bot', escaped.replace(/\n/g,'<br/>'), true);
          }
          else add('Bot', j.error || j.fallback || 'No answer');
        }
      }catch(e){
        loadingDiv.remove();
        if (e.name === 'AbortError') {
          add('Bot', 'Request timed out. Please try again with a simpler question.');
        } else {
          add('Bot', 'Failed to reach server. Please check your connection and try again.');
        }
      } finally {
        // Re-enable input
        isLoading = false;
        input.disabled = false;
        send.disabled = false;
        send.textContent = 'Send';
        input.focus();
      }
    }
    send.addEventListener('click', ask);
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') ask(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachChat); else attachChat();
})();

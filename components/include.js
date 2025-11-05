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
    async function ask(){
      const q = input.value.trim(); if(!q) return; input.value='';
      const add = (role, text)=>{ const div=document.createElement('div'); div.style.margin='6px 0'; div.innerHTML = `<b>${role}:</b> ${text}`; log.appendChild(div); log.scrollTop = log.scrollHeight; };
      add('You', q);
      try{
        const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query: q })});
        const j = await r.json();
        if(j.answer) add('Bot', j.answer.replace(/\n/g,'<br/>'));
        else add('Bot', j.error||'No answer');
      }catch(e){ add('Bot', 'Failed to query.'); }
    }
    send.addEventListener('click', ask);
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') ask(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachChat); else attachChat();
})();

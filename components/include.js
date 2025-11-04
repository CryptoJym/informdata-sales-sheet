// Light-weight HTML partial include: <div data-include="components/header.html"></div>
(function() {
  function injectIncludes() {
    const nodes = document.querySelectorAll('[data-include]');
    nodes.forEach(async (node) => {
      const url = node.getAttribute('data-include');
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load ' + url);
        node.outerHTML = await res.text();
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
})();


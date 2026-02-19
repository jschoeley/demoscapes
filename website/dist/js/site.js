(function (global) {
  function decodeLexisOptions(encoded) {
    if (!encoded) {
      return {};
    }

    try {
      return JSON.parse(decodeURIComponent(encoded));
    } catch (error) {
      console.error("Invalid lexis embed options", error);
      return {};
    }
  }

  function initLexisEmbeds(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll(".lexis-embed[data-lexis-options]");

    nodes.forEach((node) => {
      if (node.dataset.lexisInitialized === "true") {
        return;
      }
      if (typeof global.createLexisSurface !== "function") {
        return;
      }

      const options = decodeLexisOptions(node.getAttribute("data-lexis-options"));
      global.createLexisSurface(node, options);
      node.dataset.lexisInitialized = "true";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLexisEmbeds(document);
  });

  global.initLexisEmbeds = initLexisEmbeds;
})(window);

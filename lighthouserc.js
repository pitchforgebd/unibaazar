// Phase 0 scaffold: wires Lighthouse CI to the test server, with the
// performance/a11y/best-practices/SEO budgets from the master plan's §5.7.
// Enforced as "error" once the storefront rebuild (Phase 5) is complete;
// kept as "warn" for now since the current UI predates the design system.
module.exports = {
  ci: {
    collect: {
      url: [
        "http://127.0.0.1:3100/",
        "http://127.0.0.1:3100/shop",
        "http://127.0.0.1:3100/product/cotton-crew-tshirt",
        "http://127.0.0.1:3100/checkout",
      ],
      startServerCommand: "npm run start:test",
      startServerReadyPattern: "Ready on",
      startServerReadyTimeout: 60_000,
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.5 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};

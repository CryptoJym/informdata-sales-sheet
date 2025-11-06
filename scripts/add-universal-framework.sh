#!/bin/bash

# Add header and footer includes to subdirectory HTML files

files=(
  "docs/sales/county_fee_breakdown.html"
  "docs/sales/national_scan_components.html"
  "integrations/informdata_sdk_webhooks.html"
)

for file in "${files[@]}"; do
  echo "Processing $file..."

  # Add header after <body> tag if not present
  if ! grep -q 'data-include.*header.html' "$file"; then
    sed -i 's|<body class="\([^"]*\)">|<body class="\1">\n  <div data-include="../../components/header.html"></div>|' "$file"
    echo "  ✓ Added header"
  fi

  # Add main id if not present
  if ! grep -q 'id="main-content"' "$file"; then
    sed -i 's|<main class="\([^"]*\)">|<main class="\1" id="main-content">|' "$file"
    echo "  ✓ Added main-content id"
  fi

  # Add footer and include.js before </body> if not present
  if ! grep -q 'data-include.*footer.html' "$file"; then
    # Find the line before </body> and add footer components
    sed -i 's|</body>|  <div data-include="../../components/footer.html"></div>\n  <script src="../../components/include.js" defer></script>\n</body>|' "$file"
    echo "  ✓ Added footer and include.js"
  fi

  echo ""
done

echo "✅ Complete! All subdirectory pages now have universal framework."

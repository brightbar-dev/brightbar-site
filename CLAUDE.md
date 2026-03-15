# brightbar-site

Brand site for Brightbar developer tools. Hugo + PaperMod, deployed on Cloudflare Pages.

## Deploy

```bash
./scripts/deploy.sh
```

## Structure

- `content/blog/` — blog posts (markdown, PaperMod front matter)
- `content/products/_index.md` — products section listing
- `content/products/<product>.md` — individual product pages (devtools-pro, browser-api-client, etc.)
- `static/privacy/` — per-product privacy policy pages (plain HTML)
- `layouts/partials/extend_footer.html` — custom footer (newsletter form, copyright)
- `hugo.toml` — site config (theme, menus, social icons)
- `themes/PaperMod/` — vendored theme (don't edit directly)

## URLs

- Home: https://brightbar.dev/
- Blog: https://brightbar.dev/blog/
- Products: https://brightbar.dev/products/
- Product pages: https://brightbar.dev/products/{product-name}/
- Privacy: https://brightbar.dev/privacy/{product-name}
- RSS: https://brightbar.dev/index.xml
- Search: https://brightbar.dev/search/

## Notes

- CF Pages strips .html extensions with 308 redirect — privacy URLs work fine without extension
- Privacy pages are static HTML (not Hugo content) so they have stable URLs for CWS listings
- PaperMod theme is vendored, not a git submodule

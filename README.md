# INFO 492 · Team 1

A static research website for Sandra Zhu, Micah Santos, and Hangyu Zhang, taking the general contractor perspective on AI-assisted RFI prioritization.

## Preview

No build step or package installation is required:

```sh
python3 -m http.server 4920 --bind 127.0.0.1
```

Open http://127.0.0.1:4920. The site also works on static hosting such as GitHub Pages. Keep `index.html`, `css/`, and `js/` together.

## Content and interaction

- Research background, testable thesis, and linked references
- Six fictional RFIs with arrival-order and preset risk-priority sorting
- Request selection with illustrative reasoning and a suggested next step
- Four planned demos from the original team website
- California High-Speed Rail project lens and synthetic-data contingency
- Coordination flow, team members, and links to the working document and presentation

The 10% cost reduction is a research hypothesis, not a measured result. The queue is a front-end concept with fixed synthetic examples; it does not use AI or live project data. Member-specific roles have not been invented.

## Files

- `index.html`: semantic page structure and research content
- `css/style.css`: responsive styling, grid background, floating request illustration, and reduced-motion support
- `js/main.js`: sample requests, sorting, selection, and scroll reveals

Fonts load from Google Fonts with local sans-serif fallbacks. The site requires no backend and stores no user information.

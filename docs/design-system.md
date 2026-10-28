# AnalyMark interface decisions

The existing Next.js 16 / React 19 interface uses one global stylesheet and semantic CSS variables. Preserve the current functionality and deterministic calculations.

Applied UI UX Pro Max guidance: Minimalism & Swiss Style for the overall layout; Data-Dense Dashboard for aligned prices, readable tables, row feedback and responsive summaries. The generated landing patterns did not fit a working seller dashboard and were not used. Preserve the user's teal, warm white and dark navy preferences, supplied marketplace logos, three analysis tabs, and absence of gradients/shadows.

- Body 15px; main form values 16px; supplementary labels at least 12px (small brand lettering and eyebrow labels excepted).
- Primary ink #203339, muted #586c70, accent #0f766e, canvas #f8faf8, sidebar #0d2130. Existing semantic variables remain the source of truth.
- Prices use tabular numerals. Market statistics use every loaded upstream page after completeness validation; local table pagination never changes the minimum or median. Incomplete collections cannot drive recommendations.
- Display seller prices as a desktop table and labelled stacked rows on mobile. Keep one data representation.
- Collapse optional comparisons; do not hide seller prices behind this disclosure.
- 44px primary controls, visible keyboard focus, skip link, labelled URL field, semantic tables, native modal with focus containment and Escape. Mobile navigation contains focus and closes on Escape.
- Under reduced motion, disable transitions and the loading spinner animation. No external font requests or new UI dependencies.
- Mobile drawer breakpoint 767px; calculator becomes one column below 1024px. Adapt without page-wide horizontal scrolling.

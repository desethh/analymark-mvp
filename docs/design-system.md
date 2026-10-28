# AnalyMark — alternative Bento design

Branch: `design/alternative`. The original light design remains on `main`.

Direction: the user's dark Material / Bento reference, combined with verified UI UX Pro Max Bento Box Grid guidance. The generic generator suggested glassmorphism, which does not match the request and was not used. No blur, gradients, shadows, fake charts, or invented data.

- Graphite canvas #141715, surface #212722, purple surface #2b2933; foreground #f0f3e9 and muted #afb9ae.
- Functional accents: lime #d3ee90 for primary actions / minimum / positive results, lavender #c4b5ef for median and recommendations, blue #b6d7da for the market step. Light tiles use dark foregrounds. Negative results include both text and a warm red surface.
- Asymmetric opening pair, rounded 20–28px tiles, 12–16px grid gaps, 24–28px internal spacing; visible layout hierarchy instead of decorative effects.
- Compact navigation rail on desktop; labelled focus-contained drawer below 768px. Original marketplace logos are preserved.
- Three analysis tabs remain. One selected product only. Cross-card comparison, its modal and controls are removed. Historical saved data is preserved; new saves send an empty legacy offers array to retain API compatibility.
- Complete seller-price statistics, local table pagination, recommendations, procurement scenarios, tariff calculations, CSV and saved calculations retain their business logic.
- No sample numbers in empty states. Market median appears in the opening tile only after full source validation.
- 16px inputs, supplementary text 12–13px, tabular numbers, visible focus, reduced-motion support, keyboard tab navigation, labelled icon controls.
- Responsive tests target 375 / 768 / 1024 / 1440 CSS pixels, plus default viewport. All major tiles reflow; mobile seller rows use the existing single semantic table.

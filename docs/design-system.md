# AnalyMark — alternative Bento design

Branch: `design/alternative`. The original light design remains on `main`.

Direction: the user's dark Material / Bento reference, combined with verified UI UX Pro Max Bento Box Grid guidance. The generic generator suggested glassmorphism, which does not match the request and was not used. No blur, gradients, shadows, fake charts, or invented data.

- Graphite canvas #141715, surface #212722, purple surface #2b2933; foreground #f0f3e9 and muted #afb9ae.
- Functional accents: lime #d3ee90 for primary actions / minimum / positive results, lavender #c4b5ef for median and recommendations, blue #b6d7da for the market step. Light tiles use dark foregrounds. Negative results include both text and a warm red surface.
- Public landing uses an asymmetric opening pair; workspace starts with a compact practical heading. Rounded 20–28px tiles, 12–16px grid gaps, 24–28px internal spacing; visible layout hierarchy instead of decorative effects.
- Compact navigation rail on desktop; labelled focus-contained drawer below 768px. Original marketplace logos are preserved.
- Three analysis tabs remain. One selected product only. Cross-card comparison, its modal and controls are removed. Historical saved data is preserved; new saves send an empty legacy offers array to retain API compatibility.
- Complete seller-price statistics, local table pagination, recommendations, procurement scenarios, tariff calculations, CSV and saved calculations retain their business logic.
- No sample numbers in workspace empty states. The public landing has one explicitly labelled arithmetic example; it does not claim live market results.
- 16px inputs, supplementary text 12–13px, tabular numbers, visible focus, reduced-motion support, keyboard tab navigation, labelled icon controls.
- Responsive tests target 375 / 768 / 1024 / 1440 CSS pixels, plus default viewport. All major tiles reflow; mobile seller rows use the existing single semantic table.

## Public site and accounts

Public navigation has a wordmark, an explanation anchor and login/workspace CTA. The homepage explains the three-step workflow and current scope without invented testimonials or promises of profit. Existing graphite/lime/lavender/blue tokens are retained instead of the generic generator’s unrelated palette. Account forms have visible labels, autocomplete, password visibility control, validation feedback and submit loading state. On mobile the form precedes the introductory content. Workspace has account name/logout and a compact heading, with no promotional opening pair.

## Landing capabilities showcase

Replaces the old “Что есть в MVP” list with four pill tabs and a single visible feature panel, following the supplied references. Graphite for market, lavender for economics, blue for procurement, and purple graphite for saved calculations. Product-interface illustrations are HTML/CSS with Lucide icons, and numerical examples are explicitly labelled as educational. Tabs support arrow keys, Home/End, visible focus, persistent panel IDs and responsive wrapping. CTA uses the server-provided register/workspace destination. No autoplay, gradients or shadows.

## Seller tools

Shared public/private catalog: task pill tabs, introduction tile, two tool cards with code-native Lucide illustrations and actual marketplace logos. Dark Bento palette retained from the user references; no gradients, 3D shadows or fake sales figures. Separate AI screens use labelled source fields and a result column, collapse on mobile. Connection-dependent tools have explicit unavailable status. AI generation is disabled until explicitly enabled with a server key. Working sources and integration status remain separate.

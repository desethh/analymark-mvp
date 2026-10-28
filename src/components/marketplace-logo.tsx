const logos = {
  kaspi: '/marketplaces/kaspi.png',
  ozon: '/marketplaces/ozon.png',
  wb: '/marketplaces/wildberries.png',
} as const;

/** Original supplied assets, shared by every marketplace identity in the UI.
 * Adjacent marketplace names label the images for assistive technology. */
export function MarketplaceLogo({market, className = ''}: {
  market: keyof typeof logos;
  className?: string;
}) {
  return <img src={logos[market]} width={32} height={32} alt="" aria-hidden="true" className={`marketplace-logo ${className}`} />;
}

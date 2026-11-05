export type LegendItem = { color: string; name: string; meaning: string }

// A colour key: a swatch, its name and what it means. Dots for markers on the pitch, bars for bands on the slider.
export default function Legend({ items, swatch = 'dot' }: { items: LegendItem[]; swatch?: 'dot' | 'bar' }) {
  return (
    <ul className="docs-legend">
      {items.map((item) => (
        <li key={item.name}>
          <span className={`docs-swatch docs-swatch--${swatch}`} style={{ background: item.color }} aria-hidden="true" />
          <strong>{item.name}</strong>: {item.meaning}
        </li>
      ))}
    </ul>
  )
}

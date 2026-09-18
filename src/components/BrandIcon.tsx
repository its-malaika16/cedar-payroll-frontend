type BrandIconProps = {
  src: string
  alt: string
  className?: string
  /** `navy` = white on dark navy surfaces. Default tints the glyph to #17375E. */
  tone?: 'navy' | 'light' | 'auto'
}

const ICON_NAVY = '#17375E'

export function BrandIcon({
  src,
  alt,
  className = 'size-6',
  tone = 'light',
}: BrandIconProps) {
  const onDark = tone === 'navy'
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`inline-block shrink-0 ${className}`}
      style={{
        backgroundColor: onDark ? '#ffffff' : ICON_NAVY,
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        maskMode: 'alpha',
      }}
    />
  )
}

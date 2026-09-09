import { ImageResponse } from 'next/og';

/**
 * Favicon, generated in code.
 *
 * A caret on charcoal: the upvote arrow, which is the one glyph that reads as
 * Product Hunt at 16 pixels. Square, hard-edged, brand orange on the surface
 * colour, per the design system.
 *
 * To use the portrait brand mark instead, drop favicon.ico into app/ and Next
 * will prefer it over this file.
 */

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#121011',
          color: '#ff8000',
          fontSize: 46,
          fontWeight: 800,
          lineHeight: 1
        }}
      >
        &#9650;
      </div>
    ),
    size
  );
}

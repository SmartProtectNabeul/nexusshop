import { Star, StarHalf } from 'lucide-react';

export default function StarRating({ rating, size = 14 }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Star
        key={`full-${i}`}
        size={size}
        fill="var(--star-color)"
        stroke="var(--star-color)"
        strokeWidth={1.5}
      />
    );
  }

  if (hasHalf) {
    stars.push(
      <StarHalf
        key="half"
        size={size}
        fill="var(--star-color)"
        stroke="var(--star-color)"
        strokeWidth={1.5}
      />
    );
  }

  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <Star
        key={`empty-${i}`}
        size={size}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={1.5}
      />
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
      {stars}
      <span
        style={{
          marginInlineStart: '6px',
          fontSize: 'var(--font-xs)',
          color: 'var(--text-secondary)',
          fontWeight: 500,
        }}
      >
        {rating}
      </span>
    </span>
  );
}

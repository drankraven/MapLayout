export const CompassArrow = ({ color = 'black' }: { color?: string }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
    className="drop-shadow-md"
  >
    {/* Compass Base */}
    <path d="M60 20 L75 60 L60 100 L45 60 Z" fill={color} stroke={color} strokeWidth="1" />
    <path d="M60 20 L75 60 L60 60 Z" fill={color} />
    <path d="M60 20 L45 60 L60 60 Z" fill="white" stroke={color} strokeWidth="1" />
    
    <path d="M60 100 L75 60 L60 60 Z" fill="white" stroke={color} strokeWidth="1"/>
    <path d="M60 100 L45 60 L60 60 Z" fill={color} />

    <path d="M20 60 L60 45 L100 60 L60 75 Z" fill={color} stroke={color} strokeWidth="1"/>
    <path d="M20 60 L60 45 L60 60 Z" fill="white" stroke={color} strokeWidth="1"/>
    <path d="M20 60 L60 75 L60 60 Z" fill={color} />
    <path d="M100 60 L60 45 L60 60 Z" fill={color} />
    <path d="M100 60 L60 75 L60 60 Z" fill="white" stroke={color} strokeWidth="1"/>

    {/* Letters */}
    <text x="60" y="15" fill={color} fontSize="16" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">N</text>
    <text x="60" y="115" fill={color} fontSize="16" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">S</text>
    <text x="10" y="65" fill={color} fontSize="16" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">W</text>
    <text x="110" y="65" fill={color} fontSize="16" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">E</text>
  </svg>
);

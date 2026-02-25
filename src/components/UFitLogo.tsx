export function UFitLogo({ className = "", width = 200, height = 200 }) {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <linearGradient id="waveCyan" x1="140" y1="40" x2="60" y2="100" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="waveBlue" x1="60" y1="140" x2="140" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.1" />
                </filter>
            </defs>

            {/* Top Graphic Group */}
            <g filter="url(#shadow)" transform="translate(0, 10)">

                {/* Connecting Lines */}
                <path d="M 85 55 L 70 80" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
                <path d="M 50 80 L 70 95" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
                <path d="M 150 90 L 130 80" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
                <path d="M 100 110 L 100 130" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />

                {/* Waves */}
                {/* Upper Cyan Wave */}
                <path
                    d="M 115 45 C 135 45, 140 60, 135 75 C 110 95, 80 100, 50 120 C 60 100, 90 85, 115 45 Z"
                    fill="url(#waveCyan)"
                />
                {/* Lower Blue Wave */}
                <path
                    d="M 85 135 C 65 135, 60 120, 65 105 C 90 85, 120 80, 150 60 C 140 80, 110 95, 85 135 Z"
                    fill="url(#waveBlue)"
                />

                {/* Nodes */}
                {/* Heart Node (Top) */}
                <circle cx="85" cy="55" r="12" fill="#38bdf8" />
                <path d="M 85 58 L 81 54 A 3 3 0 0 1 85 50 A 3 3 0 0 1 89 54 Z" fill="#ffffff" />

                {/* User Node 1 (Left) */}
                <circle cx="50" cy="80" r="12" fill="#3b82f6" />
                <circle cx="50" cy="77" r="3.5" fill="#ffffff" />
                <path d="M 43 85 C 43 82, 47 81, 50 81 C 53 81, 57 82, 57 85 C 57 86, 56 86, 56 86 L 44 86 C 44 86, 43 86, 43 85 Z" fill="#ffffff" />

                {/* User Node 2 (Right) */}
                <circle cx="150" cy="90" r="12" fill="#22d3ee" />
                <circle cx="150" cy="87" r="3.5" fill="#ffffff" />
                <path d="M 143 95 C 143 92, 147 91, 150 91 C 153 91, 157 92, 157 95 C 157 96, 156 96, 156 96 L 144 96 C 144 96, 143 96, 143 95 Z" fill="#ffffff" />

                {/* User Node 3 (Bottom) */}
                <circle cx="100" cy="130" r="12" fill="#3b82f6" />
                <circle cx="100" cy="127" r="3.5" fill="#ffffff" />
                <path d="M 93 135 C 93 132, 97 131, 100 131 C 103 131, 107 132, 107 135 C 107 136, 106 136, 106 136 L 94 136 C 94 136, 93 136, 93 135 Z" fill="#ffffff" />

            </g>
        </svg>
    );
}

export function VimoLogo({ className = "", width = 200, height = 200 }) {
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
                <linearGradient id="vmGrad" x1="20" y1="40" x2="180" y2="160" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FF5722" />
                    <stop offset="45%" stopColor="#E64A19" />
                    <stop offset="100%" stopColor="#7B1FA2" />
                </linearGradient>
                <linearGradient id="vmGradTail" x1="120" y1="60" x2="185" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#E64A19" />
                    <stop offset="100%" stopColor="#6A1B9A" />
                </linearGradient>
            </defs>

            {/* Stylized VM mark — V on the left, heartbeat zigzag, swooping tail */}
            <path
                d="
                    M 22 50
                    L 58 148
                    L 88 68
                    L 110 128
                    L 130 72
                    Q 145 42, 168 52
                    Q 186 60, 182 78
                    Q 178 90, 165 85
                    Q 155 80, 158 70
                "
                stroke="url(#vmGrad)"
                strokeWidth="22"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* Swooping tail accent */}
            <path
                d="
                    M 130 72
                    Q 148 38, 172 50
                    Q 190 60, 184 80
                    Q 178 96, 162 88
                "
                stroke="url(#vmGradTail)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.6"
            />
        </svg>
    );
}

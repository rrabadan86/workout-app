export function UFitLogo({ className = "", width = 200, height = 240 }) {
    return (
        <img
            src="/logo.jpg"
            alt="uFit Logo"
            width={width}
            height={height}
            className={`object-contain ${className}`}
        />
    );
}

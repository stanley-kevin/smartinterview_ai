export default function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="20" height="20" rx="5" stroke="#4C7CFF" strokeWidth="1.6" />
        <path d="M6.5 14.5V11.8C6.5 9.4 8.4 7.5 10.8 7.5H11.2C13.6 7.5 15.5 9.4 15.5 11.8V14.5" stroke="#4C7CFF" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="11" cy="14.5" r="1.4" fill="#34D399" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-text">
        SmartInterview <span className="text-accent">AI</span>
      </span>
    </div>
  );
}

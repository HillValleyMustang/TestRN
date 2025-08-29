import React from 'react';
import { LucideProps } from 'lucide-react';

export const DownArrowInCircle = ({ className, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="10" className="fill-transparent group-data-[selected=true]:fill-[currentColor]" />
    <path d="M12 8v8" />
    <path d="m8 12 4 4 4 4" />
  </svg>
);
import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"], // Default sans-serif to Poppins
        // Removed display font as Satoshi is no longer used
      },
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
        action: {
          DEFAULT: 'hsl(var(--action-primary))',
          foreground: 'hsl(var(--action-primary-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
        onboarding: {
          primary: 'hsl(var(--onboarding-primary))',
          'primary-light': 'hsl(var(--onboarding-primary-light))',
          'primary-faint': 'hsl(var(--onboarding-primary-faint))',
        },
        workout: {
          'upper-body-a': 'hsl(var(--workout-upper-body-a))',
          'upper-body-a-light': 'hsl(var(--workout-upper-body-a-light))',
          'upper-body-b': 'hsl(var(--workout-upper-body-b))',
          'upper-body-b-light': 'hsl(var(--workout-upper-body-b-light))',
          'lower-body-a': 'hsl(var(--workout-lower-body-a))',
          'lower-body-a-light': 'hsl(var(--workout-lower-body-a-light))',
          'lower-body-b': 'hsl(var(--workout-lower-body-b))',
          'lower-body-b-light': 'hsl(var(--workout-lower-body-b-light))',
          'push': 'hsl(var(--workout-push))',
          'push-light': 'hsl(var(--workout-push-light))',
          'pull': 'hsl(var(--workout-pull))',
          'pull-light': 'hsl(var(--workout-pull-light))',
          'legs': 'hsl(var(--workout-legs))',
          'legs-light': 'hsl(var(--workout-legs-light))',
          'bonus': 'hsl(var(--workout-bonus))',
          'bonus-light': 'hsl(var(--workout-bonus-light))',
          'ad-hoc': 'hsl(var(--workout-ad-hoc))',
          'ad-hoc-light': 'hsl(var(--workout-ad-hoc-light))',
        },
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-fast': { // NEW
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-slide-up': {
          from: { opacity: '0', transform: 'translateY(40px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.8s ease-out forwards',
        'fade-in-fast': 'fade-in-fast 0.3s ease-out forwards', // NEW
        'fade-in-slide-up': 'fade-in-slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  		},
      boxShadow: {
        'workout-pill-selected': '0 8px 20px -6px rgba(0, 0, 0, 0.2)', // A subtle, diffused shadow
      },
  	}
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    {
      pattern: /(bg|text|border)-workout-(upper-body-a|lower-body-a|upper-body-b|lower-body-b|push|pull|legs|bonus|ad-hoc)/,
    },
    {
      pattern: /(from|to)-workout-(upper-body-a|lower-body-a|upper-body-b|lower-body-b|push|pull|legs|bonus|ad-hoc)(-light)?/,
    },
    // Add the specific background colors for the fitness level badge to the safelist
    'bg-gray-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-yellow-500',
    // Added for WeeklyMomentumBars
    'bg-gray-100',
    'bg-gray-200',
    'bg-green-200',
    'bg-green-400',
    'bg-green-600',
  ],
} satisfies Config;
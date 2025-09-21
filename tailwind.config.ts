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
  				DEFAULT: '0 84.2% 60.2%',
  				foreground: '0 0% 98%'
  			},
        action: {
          DEFAULT: 'hsl(var(--action-primary))',
          foreground: 'hsl(var(--action-primary-foreground))'
        },
  			border: '0 0% 89.8%',
  			input: '0 0% 89.8%',
  			ring: '0 0% 3.9%',
  			chart: {
  				'1': '12 76% 61%',
  				'2': '173 58% 39%',
  				'3': '197 37% 24%',
  				'4': '43 74% 66%',
  				'5': '27 87% 67%'
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
        workout: {
          'upper-body-a': 'hsl(var(--workout-upper-body-a))',
          'upper-body-b': 'hsl(var(--workout-upper-body-b))',
          'lower-body-a': 'hsl(var(--workout-lower-body-a))',
          'lower-body-b': 'hsl(var(--workout-lower-body-b))',
          'push': 'hsl(var(--workout-push))',
          'pull': 'hsl(var(--workout-pull))',
          'legs': 'hsl(var(--workout-legs))',
          'bonus': 'hsl(var(--workout-bonus))',
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
        'fade-in-slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'ellipsis-pulse': { // NEW: Ellipsis animation
          '0%': { content: '""' },
          '33%': { content: '"."' },
          '66%': { content: '".."' },
          '100%': { content: '"..."' },
        },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-slide-up': 'fade-in-slide-up 0.6s ease-out forwards',
        'ellipsis-pulse': 'ellipsis-pulse 1.5s infinite step-end', // NEW: Ellipsis animation
  		},
      boxShadow: {
        'workout-pill-selected': '0 8px 20px -6px rgba(0, 0, 0, 0.2)', // A subtle, diffused shadow
      },
  	}
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    {
      pattern: /(bg|text|border)-workout-(upper-body-a|lower-body-a|upper-body-b|lower-body-b|push|pull|legs|bonus)/,
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
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
        'input-glow': {
          '0%': { boxShadow: '0 0 0 0px hsl(var(--ring) / 0.3)' },
          '100%': { boxShadow: '0 0 0 3px hsl(var(--ring) / 0.3)' },
        },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-slide-up': 'fade-in-slide-up 0.6s ease-out forwards',
        'input-glow': 'input-glow 0.3s ease-out forwards',
  		},
      boxShadow: {
        'workout-pill-selected': '0 8px 20px -6px rgba(0, 0, 0, 0.2)', // A subtle, diffused shadow
        'input-glow-focus': '0 0 0 3px hsl(var(--ring) / 0.3), 0 0 0 6px hsl(var(--ring) / 0.15)',
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
    // Added for new gradients
    'bg-[length:100%_100%]', // For gradient backgrounds
    'bg-[image:var(--gradient-checkbox)]',
    'bg-[image:var(--gradient-button-complete)]',
    'from-[hsl(var(--workout-upper-body-a))]',
    'to-[hsl(var(--workout-bonus))]',
    'from-[hsl(var(--action-primary))]',
    'to-[hsl(var(--workout-upper-body-a))]',
  ],
} satisfies Config;
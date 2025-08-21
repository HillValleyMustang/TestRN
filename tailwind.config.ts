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
  				'upper-body-a-base': 'hsl(var(--workout-upper-body-a-base))',
  				'upper-body-a-bg': 'hsl(var(--workout-upper-body-a-bg))',
  				'upper-body-a-text': 'hsl(var(--workout-upper-body-a-text))',
  				'upper-body-a-border': 'hsl(var(--workout-upper-body-a-border))',
  				'lower-body-a-base': 'hsl(var(--workout-lower-body-a-base))',
  				'lower-body-a-bg': 'hsl(var(--workout-lower-body-a-bg))',
  				'lower-body-a-text': 'hsl(var(--workout-lower-body-a-text))',
  				'lower-body-a-border': 'hsl(var(--workout-lower-body-a-border))',
  				'upper-body-b-base': 'hsl(var(--workout-upper-body-b-base))',
  				'upper-body-b-bg': 'hsl(var(--workout-upper-body-b-bg))',
  				'upper-body-b-text': 'hsl(var(--workout-upper-body-b-text))',
  				'upper-body-b-border': 'hsl(var(--workout-upper-body-b-border))',
  				'lower-body-b-base': 'hsl(var(--workout-lower-body-b-base))',
  				'lower-body-b-bg': 'hsl(var(--workout-lower-body-b-bg))',
  				'lower-body-b-text': 'hsl(var(--workout-lower-body-b-text))',
  				'lower-body-b-border': 'hsl(var(--workout-lower-body-b-border))',
  				'push-base': 'hsl(var(--workout-push-base))',
  				'push-bg': 'hsl(var(--workout-push-bg))',
  				'push-text': 'hsl(var(--workout-push-text))',
  				'push-border': 'hsl(var(--workout-push-border))',
  				'pull-base': 'hsl(var(--workout-pull-base))',
  				'pull-bg': 'hsl(var(--workout-pull-bg))',
  				'pull-text': 'hsl(var(--workout-pull-text))',
  				'pull-border': 'hsl(var(--workout-pull-border))',
  				'legs-base': 'hsl(var(--workout-legs-base))',
  				'legs-bg': 'hsl(var(--workout-legs-bg))',
  				'legs-text': 'hsl(var(--workout-legs-text))',
  				'legs-border': 'hsl(var(--workout-legs-border))',
  				'bonus-base': 'hsl(var(--workout-bonus-base))',
  				'bonus-bg': 'hsl(var(--workout-bonus-bg))',
  				'bonus-text': 'hsl(var(--workout-bonus-text))',
  				'bonus-border': 'hsl(var(--workout-bonus-border))',
  			}
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
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    {
      pattern: /(text|bg|border)-workout-(upper-body-a|lower-body-a|upper-body-b|lower-body-b|push|pull|legs|bonus)-(base|bg|text|border)/,
    },
  ],
} satisfies Config;
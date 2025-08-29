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
          'upper-body-a': {
            color: 'hsl(var(--workout-upper-body-a-color))',
            'gradient-start': 'hsl(var(--workout-upper-body-a-gradient-start))',
            'gradient-end': 'hsl(var(--workout-upper-body-a-gradient-end))',
          },
          'lower-body-a': {
            color: 'hsl(var(--workout-lower-body-a-color))',
            'gradient-start': 'hsl(var(--workout-lower-body-a-gradient-start))',
            'gradient-end': 'hsl(var(--workout-lower-body-a-gradient-end))',
          },
          'upper-body-b': {
            color: 'hsl(var(--workout-upper-body-b-color))',
            'gradient-start': 'hsl(var(--workout-upper-body-b-gradient-start))',
            'gradient-end': 'hsl(var(--workout-upper-body-b-gradient-end))',
          },
          'lower-body-b': {
            color: 'hsl(var(--workout-lower-body-b-color))',
            'gradient-start': 'hsl(var(--workout-lower-body-b-gradient-start))',
            'gradient-end': 'hsl(var(--workout-lower-body-b-gradient-end))',
          },
          'push': {
            color: 'hsl(var(--workout-push-color))',
            'gradient-start': 'hsl(var(--workout-push-gradient-start))',
            'gradient-end': 'hsl(var(--workout-push-gradient-end))',
          },
          'pull': {
            color: 'hsl(var(--workout-pull-color))',
            'gradient-start': 'hsl(var(--workout-pull-gradient-start))',
            'gradient-end': 'hsl(var(--workout-pull-gradient-end))',
          },
          'legs': {
            color: 'hsl(var(--workout-legs-color))',
            'gradient-start': 'hsl(var(--workout-legs-gradient-start))',
            'gradient-end': 'hsl(var(--workout-legs-gradient-end))',
          },
          'bonus': {
            color: 'hsl(var(--workout-bonus-color))',
            'gradient-start': 'hsl(var(--workout-bonus-gradient-start))',
            'gradient-end': 'hsl(var(--workout-bonus-gradient-end))',
          },
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
  			},
        'fade-in-slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-slide-up': 'fade-in-slide-up 0.6s ease-out forwards',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    {
      pattern: /(text|bg|border)-workout-(upper-body-a|lower-body-a|upper-body-b|lower-body-b|push|pull|legs|bonus)-(color|gradient-start|gradient-end)/,
    },
  ],
} satisfies Config;
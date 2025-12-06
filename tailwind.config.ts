import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// QuickBooks Brand Colors
  			qb: {
  				green: {
  					DEFAULT: '#2CA01C',
  					50: '#E8F5E6',
  					100: '#C8E6C3',
  					200: '#A4D69C',
  					300: '#7FC675',
  					400: '#5BB854',
  					500: '#2CA01C',
  					600: '#108000',
  					700: '#0D6600',
  					800: '#0A4D00',
  					900: '#073300'
  				},
  				blue: {
  					DEFAULT: '#0077C5',
  					dark: '#0D2942',
  					50: '#E6F3FA',
  					100: '#B3DCF0',
  					200: '#80C5E6',
  					300: '#4DAEDC',
  					400: '#2697D2',
  					500: '#0077C5',
  					600: '#005FA0',
  					700: '#00477A',
  					800: '#002F54',
  					900: '#0D2942'
  				},
  				gray: {
  					50: '#F4F5F8',
  					100: '#E8EBF0',
  					200: '#D1D5DE',
  					300: '#B3B9C6',
  					400: '#8C95A6',
  					500: '#6B7280',
  					600: '#4B5563',
  					700: '#374151',
  					800: '#1F2937',
  					900: '#111827'
  				}
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
  			'shimmer': {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(100%)' }
  			},
  			'pulse-glow': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.5' }
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-5px)' }
  			},
  			'scale-in': {
  				'0%': { transform: 'scale(0)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '1' }
  			},
  			'slide-up': {
  				'0%': { transform: 'translateY(20px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			'gradient-x': {
  				'0%, 100%': { 'background-position': '0% 50%' },
  				'50%': { 'background-position': '100% 50%' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'shimmer': 'shimmer 2s infinite',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  			'float': 'float 3s ease-in-out infinite',
  			'scale-in': 'scale-in 0.5s ease-out',
  			'slide-up': 'slide-up 0.5s ease-out',
  			'gradient-x': 'gradient-x 3s ease infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config

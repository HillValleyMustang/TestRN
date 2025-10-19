// ui/theme.ts
export const color = {
  bg: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  overlay: 'rgba(0,0,0,0.6)',
  ring: 'rgba(0,0,0,0.05)',
  primary: '#4F46E5',   // indigo-600
  danger: '#E11D48',    // rose-600
};

export const radius = { md: 12, lg: 16 };
export const space = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24 };

export const shadow = {
  ios: { shadowColor:'#000', shadowOpacity:0.15, shadowRadius:20, shadowOffset:{width:0,height:10} },
  android: { elevation:10 },
};

export const text = {
  title: { fontSize: 20, fontWeight: '700' as const, color: color.text },
  label: { fontSize: 13, fontWeight: '600' as const, color: color.text },
  body:  { fontSize: 15, color: '#374151' },
  muted: { fontSize: 15, color: color.muted },
};
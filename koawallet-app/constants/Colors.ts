// Constantes de la aplicación KoaWallet
export const API_BASE_URL = 'http://192.168.2.109:3000'; // Cambia por tu IP local

export const Colors = {
    // Fondos
    background: '#0D0A08',
    surface: '#1A1410',
    surfaceLight: '#241C16',
    card: '#1E1710',

    // Acentos
    gold: '#C9A84C',
    goldLight: '#E8C870',
    goldDark: '#A07830',
    cacao: '#6B3A2A',
    cacaoLight: '#8B5A40',

    // Textos
    textPrimary: '#F5EDD8',
    textSecondary: '#A89070',
    textMuted: '#6B5A40',

    // Estados
    success: '#4CAF50',
    error: '#EF5350',
    warning: '#FFA726',

    // Bordes / Separadores
    border: '#2A2018',
    borderLight: '#3A2A1A',
};

export const Typography = {
    h1: { fontSize: 32, fontWeight: '700' as const },
    h2: { fontSize: 24, fontWeight: '700' as const },
    h3: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    bodyBold: { fontSize: 16, fontWeight: '600' as const },
    sm: { fontSize: 14, fontWeight: '400' as const },
    xs: { fontSize: 12, fontWeight: '400' as const },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

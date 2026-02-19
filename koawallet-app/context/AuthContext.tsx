import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

interface User {
    id: number;
    email: string;
    name?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkStoredToken();
    }, []);

    const checkStoredToken = async () => {
        try {
            const stored = await AsyncStorage.getItem('koa_token');
            const storedUser = await AsyncStorage.getItem('koa_user');
            if (stored && storedUser) {
                setToken(stored);
                setUser(JSON.parse(storedUser));
            }
        } catch { }
        setIsLoading(false);
    };

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { token: t, user: u } = res.data;
        await AsyncStorage.setItem('koa_token', t);
        await AsyncStorage.setItem('koa_user', JSON.stringify(u));
        setToken(t);
        setUser(u);
    };

    const register = async (email: string, password: string, name: string) => {
        const res = await api.post('/auth/register', { email, password, name });
        const { token: t, user: u } = res.data;
        await AsyncStorage.setItem('koa_token', t);
        await AsyncStorage.setItem('koa_user', JSON.stringify(u));
        setToken(t);
        setUser(u);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('koa_token');
        await AsyncStorage.removeItem('koa_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}

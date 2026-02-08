import { User } from './User';

export interface AuthSession {
    token: string;
    user: User;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface AuthError {
    error: string;
}

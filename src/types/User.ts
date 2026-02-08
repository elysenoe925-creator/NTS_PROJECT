export type UserRole = 'admin' | 'employee' | 'manager';

export type StoreId = 'majunga' | 'tamatave' | 'all' | string;

export interface User {
    id: number;
    username: string;
    displayName: string;
    role: UserRole;
    store: StoreId;
    avatar?: string | null;
}

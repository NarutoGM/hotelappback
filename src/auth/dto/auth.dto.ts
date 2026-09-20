export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  documentNumber?: string;
  role?: 'GUEST' | 'RECEPTIONIST' | 'ADMIN';
}

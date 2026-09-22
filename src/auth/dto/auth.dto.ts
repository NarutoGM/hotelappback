export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  documentNumber?: string;
  phone?: string;
  role?: 'GUEST' | 'RECEPTIONIST' | 'ADMIN';
}

export interface UpdateProfileDto {
  fullName?: string;
  phone?: string;
  documentNumber?: string;
}

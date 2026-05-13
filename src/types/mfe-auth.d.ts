declare module "mfe_auth/LoginPage" {
  const Component: React.ComponentType;
  export default Component;
}

declare module "mfe_auth/SignupPage" {
  const Component: React.ComponentType;
  export default Component;
}

declare module "mfe_auth/AuthContext" {
  type Role = "vendedor" | "gestor" | "admin";
  type User = { name: string; email: string; roles?: Role[] };

  export const AuthProvider: React.FC<{ children: React.ReactNode }>;
  export function useAuth(): {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (data: {
      name: string;
      email: string;
      password: string;
      password_confirm: string;
      role: Role;
    }) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
  };
}

declare module "mfe_auth/theme" {
  import type { Theme } from "@mui/material/styles";
  export const theme: Theme;
}

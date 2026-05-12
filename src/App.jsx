import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  AppBar, Toolbar, Box, Typography, Button, Stack, CircularProgress, Container,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "mfe_auth/AuthContext";

const LoginPage  = lazy(() => import("mfe_auth/LoginPage"));
const SignupPage = lazy(() => import("mfe_auth/SignupPage"));

function FullPageLoader() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <CircularProgress />
    </Box>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const role = user.roles?.[0];
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : null;

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <Box sx={{ textAlign: "right", lineHeight: 1.2, display: "flex", flexDirection: "column" }}>
        <Typography component="span" variant="body2" fontWeight={600} color="text.primary">
          {user.name}
        </Typography>
        <Typography component="span" variant="caption" color="text.secondary">
          {user.email}
        </Typography>
        {roleLabel && (
          <Typography component="span" variant="caption" color="primary" fontWeight={600}>
            {roleLabel}
          </Typography>
        )}
      </Box>
      <Button
        size="small"
        startIcon={<LogoutIcon />}
        onClick={logout}
        sx={{ color: "text.secondary" }}
      >
        Sair
      </Button>
    </Stack>
  );
}

function Dashboard() {
  return (
    <>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Toolbar>
          <Typography variant="h6" color="primary" fontWeight={700} sx={{ flexGrow: 1 }}>
            Plus
          </Typography>
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bem-vindo ao sistema de gestão de estoque.
        </Typography>
      </Container>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={<LoginPage onLogin={() => (window.location.href = "/")} />}
          />
          <Route
            path="/signup"
            element={<SignupPage />}
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0B57D0" },
    secondary: { main: "#006C51" },
    background: { default: "#F7F9FC", paper: "#FFFFFF" },
    text: { primary: "#1F1F1F", secondary: "#444746" },
    divider: "#E1E3E6",
    error: { main: "#B3261E" },
    warning: { main: "#F9AB00" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: `"Noto Sans TC", "Roboto", "Helvetica", "Arial", sans-serif`,
    h4: { fontWeight: 500, letterSpacing: 0 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 500 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 40, borderRadius: 20, paddingInline: 16 },
      },
    },
    MuiFab: {
      styleOverrides: { root: { borderRadius: 16 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid #E1E3E6",
          borderRadius: 16,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small", fullWidth: true },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E1E3E6",
          color: "#1F1F1F",
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { backgroundColor: "#FFFFFF" },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: "#F7F9FC" },
      },
    },
  },
});

export default theme;

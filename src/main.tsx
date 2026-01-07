import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Error boundary and debugging
console.log('🚀 App iniciando...');
console.log('📍 Location:', window.location.href);
console.log('🌐 User Agent:', navigator.userAgent);

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ No se encontró el elemento root!');
  document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Error: No se encontró el elemento root</h1><p>Por favor, verifica que el HTML tenga un div con id="root"</p></div>';
} else {
  try {
    createRoot(rootElement).render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <App />
      </ThemeProvider>
    );
    console.log('✅ App renderizada correctamente');
  } catch (error) {
    console.error('❌ Error al renderizar la app:', error);
    rootElement.innerHTML = `<div style="padding: 20px; text-align: center;"><h1>Error al cargar la aplicación</h1><p>${error instanceof Error ? error.message : String(error)}</p></div>`;
  }
}

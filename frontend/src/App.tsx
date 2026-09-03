import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Orders from "@/pages/Orders";
import OrderDetails from "@/pages/OrderDetails";
import Products from "@/pages/Products";
import SettingsPage from "@/pages/Settings";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetails />} />
        <Route path="/products" element={<Products />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      {/* bottom-right: o topo-direito é a barra de navegação — um toast ali bloqueia os cliques */}
      <Toaster position="bottom-right" richColors />
    </>
  );
}

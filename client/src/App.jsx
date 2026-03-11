import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Wall from './pages/Wall';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/wall" element={<Wall />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/register/:token" element={<Register />} />
        <Route path="/" element={<Wall />} />
      </Routes>
    </BrowserRouter>
  );
}

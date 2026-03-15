import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Levels from './pages/Levels';
import Wall from './pages/Wall';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import Register from './pages/Register';
import RedLightGreenLight from './pages/RedLightGreenLight';
import MingleGame from './pages/MingleGame';
import TugOfWar from './pages/TugOfWar';
import GlassBridge from './pages/GlassBridge';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Levels />} />
        <Route path="/panel" element={<Wall />} />
        <Route path="/wall" element={<Wall />} />
        <Route path="/level/1" element={<RedLightGreenLight />} />
        <Route path="/level/2" element={<MingleGame />} />
        <Route path="/level/3" element={<TugOfWar />} />
        <Route path="/level/4" element={<GlassBridge />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/register/:token" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

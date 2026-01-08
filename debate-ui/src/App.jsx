import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Debate from './pages/Debate';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/debate/:sessionId" element={<Debate />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
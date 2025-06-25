import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Host from './Host';
import Viewer from './Viewer';
import ViewerJoin from './ViewerJoin';
import './App.css'

function App() {
  return (
    <Router>
      <nav>
        <Link to="/host">Host</Link> | <Link to="/view">Viewer</Link>
      </nav>
      <Routes>
        <Route path="/host" element={<Host />} />
        <Route path="/view" element={<ViewerJoin />} />
        <Route path="/view/:streamId" element={<Viewer />} />
        <Route path="/" element={<div><h1>Welcome to Video Stream App</h1></div>} />
      </Routes>
    </Router>
  );
}

export default App;

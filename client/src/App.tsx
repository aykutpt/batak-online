import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OnlineGameProvider } from './context/OnlineGameContext';
import HomePage from './pages/HomePage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import PracticePage from './pages/PracticePage';
import RoomListPage from './pages/RoomListPage';

export default function App() {
  return (
    <BrowserRouter>
      <OnlineGameProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms" element={<RoomListPage />} />
          <Route path="/create" element={<CreateRoomPage />} />
          <Route path="/join" element={<JoinRoomPage />} />
          <Route path="/join/:code" element={<JoinRoomPage />} />
          <Route path="/lobby/:code" element={<LobbyPage />} />
          <Route path="/game/:code" element={<GamePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </OnlineGameProvider>
    </BrowserRouter>
  );
}

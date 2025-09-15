import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import useUser from '../customHooks/useUser';

import Home from '../views/Home';
import Pricing from '../views/Pricing';
import Login from '../views/Login';
import Dashboard from '../views/Dashboard';
import Products from '../views/Products';
import Moves from '../views/Moves';
import Profile from '../views/Profile';
import Error from '../views/E404';

export default function App() {

  const { user } = useUser();
  const [mode, setMode] = useState(false);

    return (
      <div className={mode ? 'dark' : 'light'}>
        <BrowserRouter>
          {
            user
            ? (
              <Routes>
                <Route path="/dashboard" element={<Dashboard mode={mode} setMode={setMode}/>} />
                <Route path="/products" element={<Products mode={mode} setMode={setMode}/>} />
                <Route path="/moves" element={<Moves mode={mode} setMode={setMode}/>} />
                <Route path="/profile" element={<Profile mode={mode} setMode={setMode}/>} />
              </Routes>
            )
            : (
              <Routes>
                <Route path="/login" element={<Login mode={mode} setMode={setMode}/>} />
                <Route path="/pricing" element={<Pricing mode={mode} setMode={setMode}/>} />
                <Route path="/" element={<Home mode={mode} setMode={setMode}/>} />
              </Routes>
            )
          }
        </BrowserRouter>
      </div>
    );
  }
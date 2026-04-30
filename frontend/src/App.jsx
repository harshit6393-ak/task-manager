import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// This connects to your Python backend!
const API_URL = 'http://127.0.0.1:5000/api';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  // Login & Register States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Dashboard States
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0 });
  const [tasks, setTasks] = useState([]);

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const statsRes = await axios.get(`${API_URL}/dashboard`, getAuthHeaders());
      setStats(statsRes.data);
      const tasksRes = await axios.get(`${API_URL}/tasks`, getAuthHeaders());
      setTasks(tasksRes.data);
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) {
      alert('Login Failed: Check your email and password');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Automatically making the first user an Admin for your assignment
      await axios.post(`${API_URL}/register`, { name, email, password, role: 'Admin' });
      alert('Registration successful! Please login now.');
      setIsRegistering(false);
    } catch (err) {
      alert('Registration Failed. Email might already be in use.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  const updateTaskStatus = async (id, newStatus) => {
    await axios.put(`${API_URL}/tasks/${id}/status`, { status: newStatus }, getAuthHeaders());
    fetchData(); // Refresh data
  };

  // IF NOT LOGGED IN, SHOW LOGIN/REGISTER PAGE
  if (!token) {
    return (
      <div className="login-container" style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>Task Manager {isRegistering ? 'Register' : 'Login'}</h2>
        <form onSubmit={isRegistering ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', width: '300px', margin: '0 auto', gap: '10px' }}>
          
          {isRegistering && (
            <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          
          <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>
            {isRegistering ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <br/>
        <button onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Already have an account? Login' : 'Need an account? Register Here'}
        </button>
      </div>
    );
  }

  // IF LOGGED IN, SHOW DASHBOARD
  return (
    <div className="dashboard-container" style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
        <h1>Welcome, {user.name} ({user.role})</h1>
        <button onClick={handleLogout} style={{ height: '40px', cursor: 'pointer' }}>Logout</button>
      </header>

      <section className="stats-board" style={{ display: 'flex', gap: '20px', marginTop: '20px', fontSize: '20px', fontWeight: 'bold' }}>
        <div className="stat-card">Total Tasks: {stats.total}</div>
        <div className="stat-card">Completed: {stats.completed}</div>
        <div className="stat-card" style={{ color: 'red' }}>Overdue: {stats.overdue}</div>
      </section>

      <section className="tasks-board" style={{ marginTop: '40px' }}>
        <h2>Your Tasks</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4' }}>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Title</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Project</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center' }}>No tasks found! You need to add some via the backend.</td></tr>
            ) : (
              tasks.map(task => (
                <tr key={task.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{task.title}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{task.projectId?.name || 'N/A'}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{task.status}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    <select 
                      value={task.status} 
                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                    >
                      <option value="Todo">Todo</option>
                      <option value="In-Progress">In-Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;

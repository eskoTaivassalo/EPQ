// src/components/auth/Register.js
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';
import './styles/Auth.css'; // Assuming you have a CSS file for styling
const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableCategories(categoriesData);
    };
    
    fetchCategories();
  }, []);

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        categories: selectedCategories,
        createdAt: new Date(),
        location: null // Will be updated later
      });
      
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        
        <div className="form-group">
          <label>Select your interests</label>
          <div className="categories-grid">
            {availableCategories.map(category => (
              <div 
                key={category.id} 
                className={`category-item ${selectedCategories.includes(category.id) ? 'selected' : ''}`}
                onClick={() => handleCategoryToggle(category.id)}
              >
                <span className="category-icon">{category.icon}</span>
                <span>{category.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { usersAPI } from '../services/api';
import './ProfilePage.css';

export function ProfilePage() {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    age: user?.age || '',
    gender: user?.gender || '',
    preferences: user?.preferences?.join(', ') || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Prepare update data
      const updateData = {
        username: formData.username,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender || undefined,
        preferences: formData.preferences
          ? formData.preferences.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
      };

      // Add password data if changing password
      if (showPasswordSection && passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          setError('New passwords do not match');
          setLoading(false);
          return;
        }

        if (passwordData.newPassword.length < 6) {
          setError('New password must be at least 6 characters');
          setLoading(false);
          return;
        }

        if (!passwordData.currentPassword) {
          setError('Current password is required to change password');
          setLoading(false);
          return;
        }

        updateData.currentPassword = passwordData.currentPassword;
        updateData.newPassword = passwordData.newPassword;
      }

      // Update profile
      const response = await usersAPI.updateProfile(updateData);

      // Update local storage with new user data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Re-login to update context
      await login(user.email, passwordData.currentPassword || 'skip-password-check');

      setSuccess('Profile updated successfully!');

      // Reset password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordSection(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>My Profile</h1>

        <div className="profile-info">
          <div className="info-item">
            <span className="info-label">Email:</span>
            <span className="info-value">{user?.email}</span>
            <span className="info-note">(Cannot be changed)</span>
          </div>
          <div className="info-item">
            <span className="info-label">Role:</span>
            <span className={`badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
              {user?.role}
            </span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="age">Age</label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              min="0"
              max="150"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="preferences">Preferences (comma-separated)</label>
            <input
              type="text"
              id="preferences"
              name="preferences"
              value={formData.preferences}
              onChange={handleChange}
              placeholder="electronics, books, sports"
              disabled={loading}
            />
            <small className="form-hint">Separate multiple preferences with commas</small>
          </div>

          <div className="password-section">
            <button
              type="button"
              className="btn-toggle-password"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
            >
              {showPasswordSection ? '− Hide' : '+ Change'} Password
            </button>

            {showPasswordSection && (
              <div className="password-fields">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password *</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password *</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    minLength="6"
                    disabled={loading}
                  />
                  <small className="form-hint">Minimum 6 characters</small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;

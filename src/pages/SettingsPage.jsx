import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { user, login, logout, theme, toggleTheme } = useContext(AuthContext);
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [role, setRole] = useState(user?.role || 'CONSUMER');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const credits = Number(user?.credits ?? 0);
  const walletBalance = Number(user?.walletBalance ?? 0);

  const fetchTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const res = await fetch('http://localhost:5000/api/sdk/license-tokens', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setTokens(data);
      }
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  React.useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast.error('Please enter a name for your token');
      return;
    }
    setIsCreatingToken(true);
    try {
      const res = await fetch('http://localhost:5000/api/sdk/license-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newTokenName })
      });
      const data = await res.json();
      if (res.ok) {
        setTokens([data, ...tokens]);
        setNewTokenName('');
        toast.success('License token created');
      } else {
        toast.error(data.error || 'Failed to create token');
      }
    } catch (err) {
      toast.error('Failed to create token');
    } finally {
      setIsCreatingToken(false);
    }
  };

  const handleDeleteToken = async (tokenId) => {
    if (!window.confirm('Are you sure you want to delete this token? Apps using it will lose access.')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/sdk/license-tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setTokens(tokens.filter(t => t.id !== tokenId));
        toast.success('Token deleted');
      }
    } catch (err) {
      toast.error('Failed to delete token');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Token copied to clipboard');
  };

  if (!user) {
    return null;
  }

  const handleUpdate = async () => {
    if (password && password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error('Password confirmation does not match');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = { role };
      if (password) payload.password = password;

      const res = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, localStorage.getItem('token')); // update context
        toast.success('Profile updated successfully');
        setPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Type DELETE to confirm account deletion');
      return;
    }

    setIsDeleting(true);

    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        logout();
        toast.success('Account deleted');
        navigate('/');
      } else {
        toast.error('Failed to delete account');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleThemeChange = (nextTheme) => {
    if (nextTheme !== theme) {
      toggleTheme();
    }
  };

  const canSaveChanges = role !== user.role || Boolean(password);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>
          Manage your account profile, publishing role, language and security in one place.
          These settings are applied to your NexusShop account immediately after saving.
        </p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Profile and Preferences</h2>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Email</label>
              <div className={styles.value}>{user.email}</div>
            </div>
            <div className={styles.field}>
              <label>Credits</label>
              <div className={styles.value}>{credits} credits</div>
            </div>
          </div>

          <div className={styles.field}>
            <label>Account Type</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={styles.select}
            >
              <option value="CONSUMER">Consumer - Buy apps</option>
              <option value="DEVELOPER">Developer - Publish apps</option>
              {user.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
            </select>
            {role === 'DEVELOPER' && (
              <p className={styles.hint}>
                Developers pay a one-time 10 credit fee to unlock posting access, and all apps are reviewed before publication.
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label>Language</label>
            <select
              className={styles.select}
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          <div className={styles.field}>
            <label>Theme</label>
            <div className={styles.segment}>
              <button
                type="button"
                className={theme === 'dark' ? 'active' : ''}
                onClick={() => handleThemeChange('dark')}
              >
                Dark
              </button>
              <button
                type="button"
                className={theme === 'light' ? 'active' : ''}
                onClick={() => handleThemeChange('light')}
              >
                Light
              </button>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              className={styles.primaryButton}
              onClick={handleUpdate}
              disabled={!canSaveChanges || isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              className={styles.neutralButton}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Security</h2>

          <div className={styles.field}>
            <label>New Password</label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>Confirm New Password</label>
            <input
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
            />
          </div>

          <p className={styles.hint}>
            Set a password here if you created this account with Google and want to use email and password login.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Danger Zone</h2>
          <div className={styles.warning}>
            Deleting your account removes your profile and access permanently.
          </div>
          <div className={styles.field}>
            <label>Type DELETE to confirm</label>
            <input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className={styles.input}
              placeholder="DELETE"
            />
          </div>
          <button className={styles.dangerButton} onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting Account...' : 'Delete Account'}
          </button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Status Snapshot</h2>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Role</label>
              <div className={styles.value}>{user.role}</div>
            </div>
            <div className={styles.field}>
              <label>Wallet Balance</label>
              <div className={styles.value}>{walletBalance} TND</div>
            </div>
          </div>

          <p className={styles.hint}>
            Need credits to publish a new app? Open Credits from the top bar to submit your D17 payment proof.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Personal License Tokens</h2>
          <p className={styles.hint}>
            Generate tokens to authenticate yourself in third-party apps integrated with the Nexus Link SDK.
          </p>

          <div className={styles.tokenForm} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. My Laptop"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <button 
              className={styles.primaryButton} 
              onClick={handleCreateToken}
              disabled={isCreatingToken}
              style={{ whiteSpace: 'nowrap' }}
            >
              {isCreatingToken ? 'Generating...' : 'Generate Token'}
            </button>
          </div>

          <div className={styles.tokenList}>
            {isLoadingTokens ? (
              <p>Loading tokens...</p>
            ) : tokens.length === 0 ? (
              <p className={styles.hint}>No tokens generated yet.</p>
            ) : (
              tokens.map(token => (
                <div key={token.id} className={styles.tokenItem} style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginBottom: '10px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong>{token.name}</strong>
                    <button 
                      onClick={() => handleDeleteToken(token.id)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <code style={{ 
                      background: '#000', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      flexGrow: 1, 
                      fontSize: '12px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {token.token}
                    </code>
                    <button 
                      className={styles.neutralButton} 
                      onClick={() => copyToClipboard(token.token)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Copy
                    </button>
                  </div>
                  <div className={styles.hint} style={{ marginTop: '5px', fontSize: '11px' }}>
                    Created: {new Date(token.createdAt).toLocaleDateString()} 
                    {token.lastUsed && ` • Last used: ${new Date(token.lastUsed).toLocaleDateString()}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

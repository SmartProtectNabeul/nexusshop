import React, { useState, useEffect, useCallback, useContext } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const [payments, setPayments] = useState([]);
  const [pendingApps, setPendingApps] = useState([]);
  const [appsError, setAppsError] = useState('');
  const [activeTab, setActiveTab] = useState('apps');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('token');
  const allowedAdminEmails = new Set(['rayen@bahroun.com', 'ahmedmidonajjar@gmail.com']);
  const isAdmin = user?.role === 'ADMIN' || allowedAdminEmails.has(String(user?.email || '').toLowerCase());

  const fetchPayments = useCallback(async (hardRefresh = false) => {
    try {
      const res = await fetch(`http://localhost:5000/api/d17/admin/payments${hardRefresh ? '?refresh=true' : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setPayments(data);
      } else if (res.status === 403) {
        setPayments([]);
      } else {
        setPayments([]);
        console.error('Failed to fetch payments:', data);
      }
    } catch (err) {
      console.error(err);
      setPayments([]);
    }
  }, [token]);

  const fetchPendingApps = useCallback(async (hardRefresh = false) => {
    if (!token) {
      setPendingApps([]);
      setAppsError('Missing authentication token. Please log in again.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/apps/admin/pending${hardRefresh ? '?refresh=true' : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setPendingApps(data);
        setAppsError('');
      } else if (res.status === 403) {
        setPendingApps([]);
        setAppsError('You are not allowed to view admin app submissions.');
      } else {
        setPendingApps([]);
        setAppsError(data.error || 'Unable to load pending app submissions');
        console.error('Failed to fetch pending apps:', data);
      }
    } catch (err) {
      console.error(err);
      setPendingApps([]);
      setAppsError('Unable to contact the server while loading pending apps');
    }
  }, [token]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchPayments();
    fetchPendingApps();
  }, [fetchPayments, fetchPendingApps, isAdmin]);

  const handleApprove = async (transactionId) => {
    try {
      const res = await fetch('http://localhost:5000/api/d17/admin/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionId })
      });
      if (res.ok) {
        setPayments((prev) => prev.filter((p) => p.transactionId !== transactionId));
        toast.success('Payment approved');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to approve payment');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve payment');
    }
  };

  const handleReject = async (transactionId) => {
    try {
      const res = await fetch('http://localhost:5000/api/d17/admin/reject', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionId })
      });
      if (res.ok) {
        setPayments((prev) => prev.filter((p) => p.transactionId !== transactionId));
        toast.success('Payment rejected');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reject payment');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject payment');
    }
  };

  const handleReviewApp = async (productId, decision) => {
    try {
      const res = await fetch('http://localhost:5000/api/apps/admin/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, decision }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to review app');
        return;
      }

      setPendingApps((prev) => prev.filter((app) => app.id !== productId));
      toast.success(decision === 'APPROVE' ? 'App approved and published' : 'App rejected');
    } catch (error) {
      console.error(error);
      toast.error('Failed to review app');
    }
  };

  const handleAdminDownload = async (productId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/apps/admin/download/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate download link');
        return;
      }
      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      toast.success('Download started in a new tab');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download app file');
    }
  };

  const handleVirusTotalScan = async (productId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/apps/admin/scan/${productId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit VirusTotal scan');
        return;
      }
      if (data.analysisUrl) {
        window.open(data.analysisUrl, '_blank', 'noopener,noreferrer');
      }
      toast.success('VirusTotal scan submitted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to run VirusTotal scan');
    }
  };

  const formatDate = (isoDate) => {
    try {
      return new Date(isoDate).toLocaleString();
    } catch (_error) {
      return isoDate;
    }
  };

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>You do not have permission to access this page.</p>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>
          Review developer app submissions and validate D17 payment confirmations.
        </p>
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          onClick={() => setActiveTab('apps')}
          className={activeTab === 'apps' ? styles.tabActive : styles.tab}
        >
          Pending Apps ({pendingApps.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={activeTab === 'payments' ? styles.tabActive : styles.tab}
        >
          Pending Payments ({payments.length})
        </button>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            {activeTab === 'apps' ? 'Developer App Submissions' : 'D17 Payment Confirmations'}
          </h2>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={async () => {
              setIsRefreshing(true);
              await Promise.all([fetchPendingApps(true), fetchPayments(true)]);
              setIsRefreshing(false);
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {activeTab === 'apps' ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>App</th>
                  <th>Developer</th>
                  <th>Category</th>
                  <th>Pricing</th>
                  <th>Assets</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApps.length === 0 && (
                  <tr>
                    <td colSpan="6" className={styles.empty}>
                      No pending app submissions found.
                      {appsError && <div className={styles.errorText}>{appsError}</div>}
                    </td>
                  </tr>
                )}

                {pendingApps.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <strong>{app.title}</strong>
                      <div className={styles.meta}>{app.description?.slice(0, 90)}...</div>
                      <div className={styles.meta}>Submitted: {formatDate(app.createdAt)}</div>
                    </td>
                    <td>
                      <div>{app.developer?.email || 'Unknown'}</div>
                      <div className={styles.meta}>{app.developerId?.slice(0, 8)}...</div>
                    </td>
                    <td>{app.category}</td>
                    <td>{app.price} TND</td>
                    <td>
                      <div className={styles.meta}>Thumbnail:</div>
                      <a className={styles.link} href={app.thumbnailUrl} target="_blank" rel="noreferrer">Open</a>
                      <div className={styles.meta}>File path:</div>
                      <span className={styles.pathText}>{app.fileUrl}</span>
                    </td>
                    <td>
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          className={styles.utility}
                          onClick={() => handleAdminDownload(app.id)}
                        >
                          Download App
                        </button>
                        <button
                          type="button"
                          className={styles.utility}
                          onClick={() => handleVirusTotalScan(app.id)}
                        >
                          VirusTotal Scan
                        </button>
                        <button
                          type="button"
                          className={styles.approve}
                          onClick={() => handleReviewApp(app.id, 'APPROVE')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className={styles.reject}
                          onClick={() => handleReviewApp(app.id, 'REJECT')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan="4" className={styles.empty}>
                      No pending payments found.
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.user?.email}
                      <div className={styles.meta}>ID: {p.userId.substring(0, 8)}...</div>
                    </td>
                    <td>
                      <strong>{p.amount} TND</strong>
                    </td>
                    <td>
                      <div>Phone: <strong>{p.senderPhone}</strong></div>
                      <div className={styles.pathText}>{p.transactionId}</div>
                    </td>
                    <td>
                      <div className={styles.inlineActions}>
                        <button
                          onClick={() => handleApprove(p.transactionId)}
                          className={styles.approve}
                          type="button"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(p.transactionId)}
                          className={styles.reject}
                          type="button"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

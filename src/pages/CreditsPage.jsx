import React, { useState, useContext } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

export default function CreditsPage() {
  const [amount, setAmount] = useState(10);
  const [transactionId, setTransactionId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [step, setStep] = useState(1);
  const { user } = useContext(AuthContext);

  const handleProceed = () => {
    if (!user) {
      toast.error('Please login first');
      return;
    }
    setStep(2);
  };

  const handleSubmitProof = async () => {
    if (!transactionId || !senderPhone) {
      toast.error('Please fill in both fields');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/d17/submit-proof', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount, transactionId, senderPhone })
      });
      if (res.ok) {
        toast.success('Payment proof submitted');
        setStep(3);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit proof');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit proof');
    }
  };

  return (
    <div style={{ padding: '60px 20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#4444', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '32px' }}>Buy Credits</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>10 TND = 10 Credits</p>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '20px' }}>Select Amount</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                min="10" step="10"
                style={{ padding: '15px', width: '120px', fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '2px solid #eee' }}
              />
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>TND</span>
            </div>
            <button onClick={handleProceed} style={{ width: '100%', padding: '15px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,112,243,0.3)' }}>
              Proceed to Payment
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'rgba(0, 255, 255, 0.6)', padding: '25px', borderRadius: '12px', border: '1px solid #eee' }}>
              <h3 style={{ marginBottom: '15px', color: '#111' }}>Payment Instructions</h3>
              <p style={{ lineHeight: '1.6', color: '#444' }}>
                Please send <strong style={{ fontSize: '18px', color: '#000' }}>{amount} TND</strong> via D17 to:
              </p>
              <div style={{ background: '#4444', padding: '15px', borderRadius: '8px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px', margin: '15px 0', border: '2px dashed #ccc' }}>
                +216 58 885 966
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '15px', fontSize: '18px' }}>Submit Proof of Payment</h4>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Your Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 25 123 456"
                value={senderPhone}
                onChange={e => setSenderPhone(e.target.value)}
                style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', marginBottom: '15px', boxSizing: 'border-box' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>D17 Transaction ID</label>
              <input
                type="text"
                placeholder="Enter the transaction ID from your D17 receipt"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', marginBottom: '20px', boxSizing: 'border-box' }}
              />

              <button onClick={handleSubmitProof} style={{ width: '100%', padding: '15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                Confirm Payment
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
            <h3 style={{ marginBottom: '15px', fontSize: '24px' }}>Proof Submitted!</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Your payment proof has been successfully submitted. Please wait for an admin to verify your D17 transaction. Once approved, your credits will appear in your profile automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

import AdminSidebar from './admin/AdminSidebar';
import AdminDashboardHome from './admin/AdminDashboardHome';
import AdminInviteCodes from './admin/AdminInviteCodes';
import AdminWalletRequests from './admin/AdminWalletRequests';
import AdminWalletWithdrawals from './admin/AdminWalletWithdrawals';
import AdminTasks from './admin/AdminTasks';
import AdminProducts from './admin/AdminProducts';
import AdminCustomers from './admin/AdminCustomers';

const AdminDashboard = () => {
  const { adminToken, logoutAdmin, addToast } = useAuth();
  const navigate = useNavigate();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Database lists
  const [usersList, setUsersList] = useState([]);
  const [rechargesList, setRechargesList] = useState([]);
  const [withdrawalsList, setWithdrawalsList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);

  // Fetch all database lists
  const fetchAllData = async () => {
    if (!adminToken) return;
    try {
      const headers = { 'Authorization': `Bearer ${adminToken}` };
      
      // Users
      const resUsers = await fetch('/api/admin/users', { headers });
      if (resUsers.ok) setUsersList(await resUsers.json());

      // Recharges
      const resRecharges = await fetch('/api/admin/recharges', { headers });
      if (resRecharges.ok) setRechargesList(await resRecharges.json());

      // Withdrawals
      const resWithdrawals = await fetch('/api/admin/withdrawals', { headers });
      if (resWithdrawals.ok) setWithdrawalsList(await resWithdrawals.json());

      // Tasks
      const resTasks = await fetch('/api/admin/tasks', { headers });
      if (resTasks.ok) setTasksList(await resTasks.json());

      // Invite Codes
      const resInviteCodes = await fetch('/api/admin/invite-codes', { headers });
      if (resInviteCodes.ok) setInviteCodes(await resInviteCodes.json());

    } catch (e) {
      console.error('Error fetching dashboard lists:', e);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [adminToken]);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin-login');
  };

  // Badge notification counts
  const pendingRecharges = rechargesList.filter(r => r.status === 'pending').length;
  const pendingWithdrawals = withdrawalsList.filter(w => w.status === 'pending').length;
  const pendingTasks = tasksList.filter(t => t.status === 'submitted').length; // submitted tasks awaiting approval

  // Sub-view router
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <AdminDashboardHome 
            usersList={usersList} 
            rechargesList={rechargesList} 
            withdrawalsList={withdrawalsList} 
            tasksList={tasksList} 
          />
        );
      case 'Invite Codes':
        return (
          <AdminInviteCodes 
            inviteCodes={inviteCodes} 
            fetchAllData={fetchAllData} 
            adminToken={adminToken} 
            addToast={addToast} 
          />
        );
      case 'Wallet Requests':
        return (
          <AdminWalletRequests 
            rechargesList={rechargesList} 
            fetchAllData={fetchAllData} 
            adminToken={adminToken} 
            addToast={addToast} 
          />
        );
      case 'Wallet Withdrawals':
        return (
          <AdminWalletWithdrawals 
            withdrawalsList={withdrawalsList} 
            fetchAllData={fetchAllData} 
            adminToken={adminToken} 
            addToast={addToast} 
          />
        );
      case 'Tasks':
        return (
          <AdminTasks 
            tasksList={tasksList} 
            usersList={usersList} 
            fetchAllData={fetchAllData} 
            adminToken={adminToken} 
            addToast={addToast} 
          />
        );
      case 'Products':
        return (
          <AdminProducts 
            adminToken={adminToken} 
            addToast={addToast} 
          />
        );
      case 'Customers':
        return (
          <AdminCustomers 
            usersList={usersList} 
            fetchAllData={fetchAllData} 
            adminToken={adminToken} 
            addToast={addToast} 
          />
        );
      case 'Partners':
      case 'Portal Settings':
        return (
          <div style={{ padding: '40px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
            This section is placeholder and will be configured in future portal settings updates.
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      minHeight: '100vh',
      background: '#111827',
      color: '#f3f4f6',
      fontFamily: 'Outfit, Inter, sans-serif'
    }}>
      {/* Sidebar navigation */}
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        pendingRecharges={pendingRecharges}
        pendingWithdrawals={pendingWithdrawals}
        pendingTasks={pendingTasks}
      />

      {/* Main panel content workspace */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        height: '100vh',
        background: '#111827'
      }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;

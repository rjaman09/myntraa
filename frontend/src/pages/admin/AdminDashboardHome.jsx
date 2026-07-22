import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  Wallet, 
  ShoppingBag,
  ArrowUpRight,
  ClipboardCheck,
  UserCheck
} from 'lucide-react';

const AdminDashboardHome = ({ usersList, rechargesList, withdrawalsList, tasksList }) => {
  // 1. Math calculations
  const totalWalletBalance = usersList.reduce((sum, u) => sum + parseFloat(u.balance || 0), 0);
  const pendingRequests = rechargesList.filter(r => r.status === 'pending').length + 
                          withdrawalsList.filter(w => w.status === 'pending').length;

  const completedTasks = tasksList.filter(t => t.status === 'completed');
  const todaySalesAmt = completedTasks.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const avgOrderAmt = completedTasks.length > 0 ? (todaySalesAmt / completedTasks.length) : 0;

  // Task statuses breakdown
  const pendingTasks = tasksList.filter(t => t.status === 'assigned').length;
  const frozenTasks = tasksList.filter(t => t.status === 'submitted').length;
  const doneTasks = tasksList.filter(t => t.status === 'completed').length;
  const expiredTasks = tasksList.filter(t => t.status === 'expired').length;
  const rejectedTasks = tasksList.filter(t => t.status === 'rejected').length;

  const pendingRechargesAmt = rechargesList
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  const activeCustomersCount = usersList.length;

  const topCustomers = [...usersList]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const statsCards = [
    {
      title: "TODAY'S PORTAL SALES",
      value: `₹ ${todaySalesAmt.toFixed(2)}`,
      detail: `${completedTasks.length} orders • ₹ ${avgOrderAmt.toFixed(2)} avg. order`,
      color: '#ff3f6c',
      icon: TrendingUp
    },
    {
      title: "PENDING REQUESTS",
      value: `${pendingRequests}`,
      detail: "Awaiting admin action",
      color: '#fbbf24',
      icon: Clock
    },
    {
      title: "TOTAL WALLET BALANCE",
      value: `₹ ${totalWalletBalance.toFixed(2)}`,
      detail: `${usersList.length} registered customers`,
      color: '#10b981',
      icon: Wallet
    },
    {
      title: "PORTAL ORDERS",
      value: `${tasksList.length}`,
      detail: "Total allocated tasks",
      color: '#60a5fa',
      icon: ShoppingBag
    }
  ];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'white' }}>Customer Portal</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>Recharge requests, portal orders and customer activity.</p>
      </div>

      {/* Stats Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        {statsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} style={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.5px' }}>{card.title}</span>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'white' }}>{card.value}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', fontWeight: '600' }}>{card.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operations Overview Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#e5e7eb', margin: 0 }}>Operations</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {/* Tasks Status Counts Card */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Tasks</span>
              <span style={{ fontSize: '10px', color: '#ff3f6c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View all tasks <ArrowUpRight size={12} />
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Pending', count: pendingTasks, color: '#9ca3af' },
                { label: 'Frozen', count: frozenTasks, color: '#fbbf24' },
                { label: 'Completed today', count: doneTasks, color: '#10b981' },
                { label: 'Expired today', count: expiredTasks, color: '#ef4444' },
                { label: 'Rejected today', count: rejectedTasks, color: '#ef4444' }
              ].map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0' }}>
                  <span style={{ color: '#9ca3af' }}>{item.label}</span>
                  <span style={{ fontWeight: '700', color: item.count > 0 ? item.color : '#4b5563' }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Recharge Cashflow Card */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Pending recharge</span>
              <ClipboardCheck size={18} style={{ color: '#10b981' }} />
            </div>
            <div style={{ margin: '20px 0' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>
                ₹ {pendingRechargesAmt.toFixed(2)}
              </div>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>
                Total amount in queue awaiting verification
              </span>
            </div>
            <div style={{ borderTop: '1px solid #374151', paddingTop: '12px', fontSize: '11px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Customers Active</span>
              <span style={{ fontWeight: '700', color: 'white' }}>{activeCustomersCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Lists section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Top Wallet Balances Customers */}
        <div style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'white', margin: '0 0 16px 0' }}>Top customers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topCustomers.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '10px 0' }}>No customer data.</div>
            ) : (
              topCustomers.map(user => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{user.phone}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>UID: {user.uid}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>
                    ₹ {parseFloat(user.balance).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;

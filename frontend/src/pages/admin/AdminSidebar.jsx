import React from 'react';
import { 
  LayoutDashboard, 
  Tag, 
  Wallet, 
  Landmark, 
  ClipboardList, 
  Users, 
  Settings, 
  Package, 
  LogOut,
  ChevronRight,
  UserCheck
} from 'lucide-react';

const AdminSidebar = ({ activeTab, setActiveTab, onLogout, pendingRecharges = 0, pendingWithdrawals = 0, pendingTasks = 0 }) => {
  const menuGroups = [
    {
      title: 'CUSTOMERS',
      items: [
        { id: 'Customers', label: 'Customers', icon: Users }
      ]
    },
    {
      title: 'CUSTOMER PORTAL',
      items: [
        { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'Invite Codes', label: 'Invite Codes', icon: Tag },
        { id: 'Wallet Requests', label: 'Wallet Requests', icon: Wallet, badge: pendingRecharges },
        { id: 'Wallet Withdrawals', label: 'Wallet Withdrawals', icon: Landmark, badge: pendingWithdrawals },
        { id: 'Tasks', label: 'Tasks', icon: ClipboardList, badge: pendingTasks },
        { id: 'Partners', label: 'Partners', icon: UserCheck },
        { id: 'Portal Settings', label: 'Portal Settings', icon: Settings }
      ]
    },
    {
      title: 'PRODUCTS',
      items: [
        { id: 'Products', label: 'Products', icon: Package }
      ]
    }
  ];

  return (
    <div style={{
      width: '240px',
      background: '#111827',
      borderRight: '1px solid #1f2937',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: '#ff3f6c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '900',
          fontSize: '20px',
          fontFamily: 'Outfit, sans-serif'
        }}>
          M
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px' }}>
            Main Store
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600' }}>Customer Portal • Live</span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#4b5563',
              letterSpacing: '1px',
              paddingLeft: '12px',
              marginBottom: '8px'
            }}>
              {group.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: isActive ? '#1f2937' : 'transparent',
                      border: 'none',
                      color: isActive ? 'white' : '#9ca3af',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={18} style={{ color: isActive ? '#ff3f6c' : '#6b7280' }} />
                      <span style={{ fontSize: '13px', fontWeight: isActive ? '700' : '500' }}>
                        {item.label}
                      </span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 ? (
                      <span style={{
                        background: '#ff3f6c',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '10px'
                      }}>
                        {item.badge}
                      </span>
                    ) : (
                      isActive && <ChevronRight size={14} style={{ color: '#ff3f6c' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Footer */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #1f2937'
      }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
        >
          <LogOut size={16} />
          <span>Exit Panel</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;

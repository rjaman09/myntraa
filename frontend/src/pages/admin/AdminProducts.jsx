import React, { useState, useEffect } from 'react';
import { Plus, Trash, RotateCcw, Package, ArrowLeft, Upload, Edit, Eye, EyeOff } from 'lucide-react';

const AdminProducts = ({ adminToken, addToast }) => {
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // View state: 'list' or 'create' or 'edit'
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [bonus, setBonus] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Load products list
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/products', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProductsList(data);
      }
    } catch (e) {
      addToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [adminToken]);

  // Handle Create / Edit Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price || !bonus || !image) {
      addToast('Name, price, bonus, and image URL are required', 'error');
      return;
    }

    const payload = {
      name,
      price: parseFloat(price),
      bonus: parseFloat(bonus),
      description,
      image,
      isActive
    };

    try {
      const url = view === 'edit' ? `/api/admin/products/${editingId}` : '/api/admin/products';
      const response = await fetch(url, {
        method: 'POST', // Backend route PUT is maps to router.post('/products/:id') or POST
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        addToast(view === 'edit' ? 'Product updated successfully!' : 'Product created successfully!');
        resetForm();
        setView('list');
        fetchProducts();
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to save product', 'error');
      }
    } catch (e) {
      addToast('Connection error', 'error');
    }
  };

  // Toggle active status switch directly from list
  const handleToggleActive = async (id, currentVal) => {
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isActive: !currentVal })
      });
      if (response.ok) {
        addToast('Product status updated');
        fetchProducts();
      }
    } catch (e) {
      addToast('Failed to toggle status', 'error');
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setBonus('');
    setDescription('');
    setImage('');
    setIsActive(true);
    setEditingId(null);
  };

  const startEdit = (product) => {
    setName(product.name);
    setPrice(product.price.toString());
    setBonus(product.bonus.toString());
    setDescription(product.description || '');
    setImage(product.image);
    setIsActive(product.isActive === true || product.isActive === 1);
    setEditingId(product.id);
    setView('edit');
  };

  // Filters
  const filteredProducts = productsList.filter(p => {
    const searchLower = search.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(searchLower) || 
                      p.description?.toLowerCase().includes(searchLower);
    
    const isActiveBool = p.isActive === true || p.isActive === 1;
    const statusMatch = statusFilter === 'all' || 
                        (statusFilter === 'active' && isActiveBool) || 
                        (statusFilter === 'inactive' && !isActiveBool);
    return nameMatch && statusMatch;
  });

  const totalProducts = productsList.length;
  const activeProducts = productsList.filter(p => p.isActive === true || p.isActive === 1).length;

  // List View Layout
  if (view === 'list') {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Title & Top controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'white' }}>Products</h2>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>Manage global product items catalog.</p>
          </div>
          <button
            onClick={() => { resetForm(); setView('create'); }}
            style={{
              background: '#ff3f6c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} />
            <span>New product</span>
          </button>
        </div>

        {/* Metrics summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {[
            { label: 'TOTAL PRODUCTS', val: totalProducts, color: 'white' },
            { label: 'ACTIVE IN CATALOG', val: activeProducts, color: '#10b981' }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.5px' }}>{item.label}</span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: item.color }}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <input 
              type="text"
              placeholder="Search products by name or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'white',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button 
              type="button"
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              style={{
                background: 'none',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#9ca3af',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Product Catalog Grid / List */}
        <div style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#e5e7eb', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#111827', borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                  <th style={{ padding: '14px 16px' }}>PRODUCT</th>
                  <th style={{ padding: '14px 16px' }}>PRICE</th>
                  <th style={{ padding: '14px 16px' }}>BONUS</th>
                  <th style={{ padding: '14px 16px' }}>STATUS</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      No products found. Click "New Product" to build your catalog.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(item => {
                    const isActiveBool = item.isActive === true || item.isActive === 1;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #374151' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#374151', flexShrink: 0 }}>
                              <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: 'white' }}>{item.name}</div>
                              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{item.description || 'No description'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '800', color: 'white' }}>
                          ₹ {parseFloat(item.price).toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '800', color: '#10b981' }}>
                          ₹ {parseFloat(item.bonus).toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {/* Toggle Switch */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleActive(item.id, isActiveBool)}
                              style={{
                                background: isActiveBool ? '#ff3f6c' : '#374151',
                                border: 'none',
                                borderRadius: '12px',
                                width: '36px',
                                height: '20px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <span style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: 'white',
                                position: 'absolute',
                                top: '3px',
                                left: isActiveBool ? '19px' : '3px',
                                transition: 'all 0.2s'
                              }} />
                            </button>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: isActiveBool ? '#10b981' : '#9ca3af' }}>
                              {isActiveBool ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button 
                            onClick={() => startEdit(item)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#60a5fa',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px'
                            }}
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  }

  // Create / Edit Form View Layout
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title with Back Arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => { resetForm(); setView('list'); }}
          style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'white' }}>
            {view === 'edit' ? 'Edit product' : 'New product'}
          </h2>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
            {view === 'edit' ? 'Update displaying info, price, and active status.' : 'Category of everything you sell – name it once, ring it everywhere.'}
          </p>
        </div>
      </div>

      {/* Form Grid */}
      <form onSubmit={handleSubmit} style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Panel: Details card */}
        <div style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'white', margin: 0 }}>Basics</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>DISPLAY NAME</label>
            <input 
              type="text"
              placeholder="e.g. Myntra Silk Dress"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '10px 12px',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>SELLING PRICE (₹)</label>
              <input 
                type="number"
                placeholder="0.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
                style={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>BONUS AMOUNT (₹)</label>
              <input 
                type="number"
                placeholder="0.00"
                value={bonus}
                onChange={e => setBonus(e.target.value)}
                style={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>SHORT DESCRIPTION</label>
            <textarea 
              rows="3"
              placeholder="Display description in catalog..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '10px 12px',
                color: 'white',
                fontSize: '13px',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af' }}>IMAGE URL</label>
            <input 
              type="text"
              placeholder="Paste absolute path or Web link to image..."
              value={image}
              onChange={e => setImage(e.target.value)}
              style={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '10px 12px',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Right Panel: Status options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Status Settings Card */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'white', margin: 0 }}>Status</h4>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox"
                id="isActiveCheck"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#ff3f6c',
                  cursor: 'pointer'
                }}
              />
              <label htmlFor="isActiveCheck" style={{ fontSize: '12px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                Available for sale
              </label>
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, lineHeight: '1.4' }}>
              When off, this product is hidden from task assignments drawer.
            </p>
          </div>

          {/* Photo Preview Card */}
          <div style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'white', margin: '0 0 4px 0', alignSelf: 'flex-start' }}>Product photo</h4>
            
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#111827',
              border: '2px dashed #374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {image ? (
                <img src={image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                  <Upload size={24} />
                  <span style={{ fontSize: '10px' }}>Enter Image URL</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => { resetForm(); setView('list'); }}
              style={{
                flex: 1,
                background: 'none',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#9ca3af',
                padding: '10px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Discard
            </button>
            <button
              type="submit"
              style={{
                flex: 1.5,
                background: '#ff3f6c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {view === 'edit' ? 'Update product' : 'Create product'}
            </button>
          </div>

        </div>

      </form>
    </div>
  );
};

export default AdminProducts;

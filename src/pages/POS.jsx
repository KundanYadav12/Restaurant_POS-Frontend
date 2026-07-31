import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardMedia, CardContent, Typography, TextField, Button, Chip, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, useMediaQuery, IconButton, CircularProgress, InputAdornment, Tooltip } from '@mui/material';
import { Search, ShoppingCart, CreditCard, RefreshCw, Printer, AlertCircle, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function POSScreen({ user, token, onLogout, isFocusMode, onFocusModeChange }) {
  const { notify } = useNotify();

  // Role-Based Access Control (RBAC): Active Ticket panel is ONLY available for Cashier role.
  // Restricted for Admin, Manager, Super Admin, Owner accounts.
  const userRole = (user?.role || JSON.parse(localStorage.getItem('pos_user') || '{}')?.role || '').toLowerCase();
  const isCashier = userRole === 'cashier';

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [mobileTab, setMobileTab] = useState(0); // 0 = Menu Grid, 1 = Cart summary

  // Account persistent display sizing: small (compact), medium (standard), large (spacious)
  const [cardSize, setCardSize] = useState(() => localStorage.getItem('pos_card_size') || 'medium');

  // POS Focus Mode (Kiosk Mode) State & Persistence
  const [focusMode, setFocusMode] = useState(() => {
    return isFocusMode !== undefined ? isFocusMode : (localStorage.getItem('pos_focus_mode') === 'true');
  });

  useEffect(() => {
    if (isFocusMode !== undefined) {
      setFocusMode(isFocusMode);
    }
  }, [isFocusMode]);

  const handleToggleFocusMode = () => {
    const nextMode = !focusMode;
    setFocusMode(nextMode);
    localStorage.setItem('pos_focus_mode', nextMode.toString());

    if (onFocusModeChange) {
      onFocusModeChange(nextMode);
    }

    if (nextMode) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log('Fullscreen request note:', err.message);
        });
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.log('Exit fullscreen note:', err.message);
        });
      }
    }
  };

  // Cart State
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [tableOrTakeaway, setTableOrTakeaway] = useState('Takeaway');

  // Checkout Popups State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('cash');
  const [lastOrderDetails, setLastOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isMobileOrTablet = useMediaQuery('(max-width:900px)');

  // Draggable Active Ticket Panel Resizing State & Persistence
  const DEFAULT_TICKET_WIDTH = 360;
  const MIN_TICKET_WIDTH = 280;
  const MAX_TICKET_WIDTH = 560;

  const [ticketPanelWidth, setTicketPanelWidth] = useState(() => {
    const saved = localStorage.getItem('pos_ticket_panel_width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_TICKET_WIDTH && parsed <= MAX_TICKET_WIDTH) {
        return parsed;
      }
    }
    return DEFAULT_TICKET_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const posContainerRef = React.useRef(null);

  const handleResizeStart = (e) => {
    if (isMobileOrTablet) return;
    e.preventDefault();
    setIsResizing(true);
  };

  const handleResetWidth = () => {
    setTicketPanelWidth(DEFAULT_TICKET_WIDTH);
    localStorage.setItem('pos_ticket_panel_width', DEFAULT_TICKET_WIDTH.toString());
  };

  const handleKeyDownDivider = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setTicketPanelWidth(w => {
        const next = Math.min(MAX_TICKET_WIDTH, w + 16);
        localStorage.setItem('pos_ticket_panel_width', next.toString());
        return next;
      });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setTicketPanelWidth(w => {
        const next = Math.max(MIN_TICKET_WIDTH, w - 16);
        localStorage.setItem('pos_ticket_panel_width', next.toString());
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setTicketPanelWidth(MIN_TICKET_WIDTH);
      localStorage.setItem('pos_ticket_panel_width', MIN_TICKET_WIDTH.toString());
    } else if (e.key === 'End') {
      e.preventDefault();
      setTicketPanelWidth(MAX_TICKET_WIDTH);
      localStorage.setItem('pos_ticket_panel_width', MAX_TICKET_WIDTH.toString());
    }
  };

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e) => {
      if (!posContainerRef.current) return;
      const containerRect = posContainerRef.current.getBoundingClientRect();
      const pointerX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      if (!pointerX) return;

      const newWidth = containerRect.right - pointerX;
      const clampedWidth = Math.max(MIN_TICKET_WIDTH, Math.min(MAX_TICKET_WIDTH, newWidth));

      setTicketPanelWidth(clampedWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      setTicketPanelWidth(w => {
        localStorage.setItem('pos_ticket_panel_width', w.toString());
        return w;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isResizing, isMobileOrTablet]);

  // Fetch Categories & Menu with safety handlers
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const catRes = await apiFetch('/api/categories');
      if (catRes.ok) {
        const categoriesData = await catRes.json();
        if (Array.isArray(categoriesData)) {
          const sortedCats = [...categoriesData].sort((a, b) => (a.seq || 0) - (b.seq || 0) || a.id - b.id);
          setCategories(sortedCats);
          setActiveCategory(null); // Default to 'All Items' view
        } else {
          setCategories([]);
        }
      } else {
        setCategories([]);
      }
      
      const menuRes = await apiFetch('/api/menu');
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (Array.isArray(menuData)) {
          setMenuItems(menuData);
          setFilteredItems(menuData);
        } else {
          setMenuItems([]);
          setFilteredItems([]);
        }
      } else {
        setMenuItems([]);
        setFilteredItems([]);
      }
    } catch (err) {
      console.error('Error fetching POS data:', err);
      setCategories([]);
      setMenuItems([]);
      setFilteredItems([]);
    }
  };

  // Filter menu items on conditions
  useEffect(() => {
    let result = menuItems;

    if (activeCategory) {
      result = result.filter(item => item.category_id === activeCategory);
    }

    if (searchTerm) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (vegOnly) {
      result = result.filter(item => item.is_veg === 1);
    }

    setFilteredItems(result);
  }, [activeCategory, searchTerm, vegOnly, menuItems]);

  // Click 1: Add/Increase item in cart (Cashier only)
  const handleItemClick = (item) => {
    if (!isCashier) return; // RBAC guard: Non-cashiers cannot build or modify active tickets
    if (!item.is_available) return;

    setCart(prevCart => {
      const existing = prevCart.find(cartItem => cartItem.menu_item_id === item.id);
      if (existing) {
        return prevCart.map(cartItem => 
          cartItem.menu_item_id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, {
        menu_item_id: item.id,
        name: item.name,
        price: isNaN(parseFloat(item.price)) ? 0 : parseFloat(item.price),
        gst_rate: isNaN(parseFloat(item.gst_rate)) ? 0 : parseFloat(item.gst_rate),
        quantity: 1,
        notes: ''
      }];
    });
  };

  const handleDecreaseQty = (itemId) => {
    setCart(prevCart => {
      const existing = prevCart.find(cartItem => cartItem.menu_item_id === itemId);
      if (existing.quantity === 1) {
        return prevCart.filter(cartItem => cartItem.menu_item_id !== itemId);
      }
      return prevCart.map(cartItem =>
        cartItem.menu_item_id === itemId
          ? { ...cartItem, quantity: cartItem.quantity - 1 }
          : cartItem
      );
    });
  };

  // Math totals calculation
  const calculateTotals = () => {
    let subtotal = 0;
    let tax_amount = 0;
    cart.forEach(item => {
      const itemPrice = isNaN(parseFloat(item.price)) ? 0 : parseFloat(item.price);
      const itemGst = isNaN(parseFloat(item.gst_rate)) ? 0 : parseFloat(item.gst_rate);
      const itemCost = itemPrice * (item.quantity || 1);
      subtotal += itemCost;
      tax_amount += itemCost * (itemGst / 100);
    });
    const discount_amount = isNaN(parseFloat(discount)) ? 0 : parseFloat(discount);
    const total_amount = Math.max(0, subtotal + tax_amount - discount_amount);
    return {
      subtotal: parseFloat((subtotal || 0).toFixed(2)),
      tax_amount: parseFloat((tax_amount || 0).toFixed(2)),
      discount_amount: parseFloat((discount_amount || 0).toFixed(2)),
      total_amount: parseFloat((total_amount || 0).toFixed(2))
    };
  };

  const totals = calculateTotals();

  // Click 2: Place Order -> Trigger confirmation dialog
  const handlePlaceOrderClick = () => {
    if (cart.length === 0) return;
    setCheckoutModalOpen(true);
  };

  // Click 3: Confirm Checkout Payment Mode
  const handlePaymentSelect = async (mode) => {
    setLoading(true);
    setError('');

    try {
      const orderPayload = {
        items: cart,
        payment_mode: mode,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        discount_amount: totals.discount_amount,
        total_amount: totals.total_amount,
        table_number_or_takeaway: tableOrTakeaway,
        notes: orderNotes
      };

      const response = await apiFetch('/api/orders', {
        method: 'POST',
        body: orderPayload
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed.');
      }

      setLastOrderDetails(data);
      setCart([]);
      setDiscount(0);
      setOrderNotes('');
      setCheckoutModalOpen(false);
      setMobileTab(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerReprint = async () => {
    if (!lastOrderDetails || !lastOrderDetails.orderId) return;
    try {
      await apiFetch(`/api/orders/${lastOrderDetails.orderId}/reprint`, {
        method: 'POST'
      });
      notify.success('Reprint request queued for thermal printer.', 'Reprint Job Queued');
    } catch (err) {
      console.error(err);
      notify.error('Failed to trigger receipt reprint.', 'Printer Error');
    }
  };

  // Render Cart Item Panel
  const renderCartPanel = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCart size={18} color="#f97316" />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Active Ticket</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isMobileOrTablet && ticketPanelWidth !== DEFAULT_TICKET_WIDTH && (
            <Tooltip title="Reset Ticket panel width (or double-click divider)">
              <IconButton size="small" onClick={handleResetWidth} sx={{ color: 'text.secondary', p: 0.5 }}>
                <RotateCcw size={14} />
              </IconButton>
            </Tooltip>
          )}
          <Chip label={`${cart.reduce((a, b) => a + b.quantity, 0)} items`} size="small" />
        </Box>
      </Box>

      {/* Cart Scroll list */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {cart.map(item => (
          <Box key={item.menu_item_id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>Rs. {(item.price * item.quantity).toFixed(2)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 20, px: 1 }}>
              <Button onClick={() => handleDecreaseQty(item.menu_item_id)} size="small" sx={{ minWidth: 24, p: 0, color: 'text.primary' }}>-</Button>
              <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 15, textAlign: 'center' }}>{item.quantity}</Typography>
              <Button onClick={() => handleItemClick({ id: item.menu_item_id, name: item.name, price: item.price, is_available: true })} size="small" sx={{ minWidth: 24, p: 0, color: 'text.primary' }}>+</Button>
            </Box>
          </Box>
        ))}

        {cart.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 2, color: 'text.secondary', pt: '10vh', pb: 4 }}>
            <ShoppingCart size={48} strokeWidth={1.5} color="#94a3b8" />
            <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 600, color: 'text.secondary' }}>
              Ticket is empty.<br />Tap menu cards to add items.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Redesigned Active Ticket Summary & Checkout Footer */}
      {cart.length > 0 && (
        <Box sx={{
          p: '1rem 1.25rem',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Vertical Price Breakdown Rows */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
            
            {/* Subtotal Row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.4 }}>
              <Typography variant="body2" sx={{ color: '#6B7280', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: 500 }}>
                Subtotal
              </Typography>
              <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, fontSize: 'clamp(0.875rem, 1.2vw, 1rem)' }}>
                Rs. {totals.subtotal.toFixed(2)}
              </Typography>
            </Box>

            {/* GST Tax Row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.4 }}>
              <Typography variant="body2" sx={{ color: '#6B7280', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: 500 }}>
                GST Tax
              </Typography>
              <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, fontSize: 'clamp(0.875rem, 1.2vw, 1rem)' }}>
                Rs. {totals.tax_amount.toFixed(2)}
              </Typography>
            </Box>

            {/* Discount Row with Right-Aligned Rounded Input Field */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.4 }}>
              <Typography variant="body2" sx={{ color: '#6B7280', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: 500 }}>
                Discount
              </Typography>
              <TextField
                type="number"
                size="small"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value || 0)))}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start" sx={{ '& .MuiTypography-root': { fontSize: '11px', fontWeight: 700, color: '#6B7280' } }}>Rs</InputAdornment>
                  }
                }}
                sx={{
                  width: '100px',
                  '& .MuiOutlinedInput-root': {
                    height: '36px',
                    borderRadius: '999px',
                    bgcolor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    fontSize: '13px',
                    fontWeight: 700,
                    px: 1,
                    '&.Mui-focused fieldset': {
                      borderColor: '#F97316'
                    }
                  },
                  '& .MuiInputBase-input': {
                    textAlign: 'center',
                    padding: '4px 2px'
                  }
                }}
              />
            </Box>

            {/* Horizontal Dashed Divider */}
            <Box sx={{ borderTop: '1px dashed #D1D5DB', my: 1 }} />

            {/* Net Total Row with Strong Visual Emphasis */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B', fontSize: 'clamp(1.1rem, 1.5vw, 1.35rem)' }}>
                Net Total
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F97316', fontSize: 'clamp(1.15rem, 1.6vw, 1.4rem)' }}>
                Rs. {totals.total_amount.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {/* Checkout Button */}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handlePlaceOrderClick}
            sx={{
              mt: 1.5,
              minHeight: '48px',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: '#ea580c',
                boxShadow: '0 6px 20px rgba(249, 115, 22, 0.45)'
              }
            }}
          >
            Checkout Order (Click 2)
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', width: '100%', maxWidth: { xl: '1920px' }, mx: 'auto' }}>
      
      {/* POS Focus Mode Kiosk Header Banner */}
      {focusMode && (
        <Box sx={{
          bgcolor: '#0f172a',
          color: '#ffffff',
          px: { xs: 2, md: 3 },
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1e293b',
          zIndex: 1200
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip label="POS KIOSK MODE" size="small" color="primary" sx={{ fontWeight: 900, fontSize: '11px', px: 0.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.5px', color: '#f8fafc' }}>
              {user?.restaurant_name || 'POS Terminal'} | Cashier: {user?.name || user?.username || 'Active'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="small"
            onClick={handleToggleFocusMode}
            startIcon={<Minimize2 size={15} />}
            sx={{
              fontWeight: 800,
              borderRadius: '999px',
              px: 2,
              py: 0.5,
              fontSize: '12px',
              bgcolor: '#f59e0b',
              color: '#000000',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
              '&:hover': { bgcolor: '#d97706', color: '#ffffff' }
            }}
          >
            Exit POS Focus Mode
          </Button>
        </Box>
      )}

      {/* Mobile view segment selector tabs (Cashier role only) */}
      {isMobileOrTablet && isCashier && (
        <Tabs
          value={mobileTab}
          onChange={(e, newVal) => setMobileTab(newVal)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '& .MuiTabs-indicator': {
              display: 'none'
            },
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: '13px',
              borderBottom: '3px solid transparent',
              transition: 'all 0.2s',
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
                borderBottom: '3px solid',
                borderColor: 'primary.main'
              }
            }
          }}
        >
          <Tab label="Menu items" />
          <Tab label={`Active Ticket (${cart.reduce((a, b) => a + b.quantity, 0)})`} />
        </Tabs>
      )}

      {/* Main Fluid 2-Column Resizable Split */}
      <Box
        ref={posContainerRef}
        sx={{
          flex: 1,
          height: focusMode ? 'calc(100vh - 48px)' : { md: 'calc(100vh - 70px)' },
          display: 'flex',
          overflow: 'hidden',
          width: '100%',
          position: 'relative',
          userSelect: isResizing ? 'none' : 'auto'
        }}
      >
        {/* Left Side: Category Chips and Menu Card Grid (Fluid Width, minWidth 400px) */}
        {(!isMobileOrTablet || mobileTab === 0) && (
          <Box sx={{
            flex: 1,
            minWidth: isMobileOrTablet ? '100%' : '400px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            p: { xs: 2, md: 3 },
            gap: 2.5
          }}>
            
            {/* Filtering header */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  placeholder="Search dishes by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: <Search size={16} style={{ marginRight: 8, color: '#94a3b8' }} />
                    }
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Enter POS Focus Mode Toggle Button */}
                {!focusMode && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={handleToggleFocusMode}
                    startIcon={<Maximize2 size={16} />}
                    sx={{
                      fontWeight: 800,
                      fontSize: '13px',
                      height: 38,
                      px: 2,
                      borderRadius: '999px',
                      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 16px rgba(249, 115, 22, 0.45)'
                      }
                    }}
                  >
                    Enter POS Focus Mode
                  </Button>
                )}

                {/* Standardized Veg-Only green pill toggle */}
                <Chip
                  label="🟢 Veg Only"
                  onClick={() => setVegOnly(prev => !prev)}
                  color={vegOnly ? 'success' : 'default'}
                  variant={vegOnly ? 'default' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    fontSize: '13px',
                    height: 38,
                    px: 1,
                    borderColor: 'success.main',
                    color: vegOnly ? '#fff' : 'success.main',
                    bgcolor: vegOnly ? 'success.main' : 'transparent',
                    '&:hover': {
                      bgcolor: vegOnly ? 'success.dark' : 'rgba(46, 125, 50, 0.04)'
                    }
                  }}
                />

                {/* Grid size controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover', p: 0.5, borderRadius: 20, border: 1, borderColor: 'divider' }}>
                  {['small', 'medium', 'large'].map(size => (
                    <Chip
                      key={size}
                      label={size === 'small' ? 'Compact' : size === 'medium' ? 'Standard' : 'Spacious'}
                      onClick={() => {
                        setCardSize(size);
                        localStorage.setItem('pos_card_size', size);
                      }}
                      color={cardSize === size ? 'primary' : 'default'}
                      variant={cardSize === size ? 'default' : 'outlined'}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        height: 28,
                        fontSize: '11px',
                        border: 'none',
                        '&:hover': {
                          bgcolor: cardSize === size ? 'primary.dark' : 'action.selected'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Categories horizontal list with trailing fade effect */}
            <Box sx={{ position: 'relative', width: '100%' }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  overflowX: 'auto',
                  pb: 1.5,
                  pr: 5,
                  scrollSnapType: 'x mandatory',
                  scrollBehavior: 'smooth',
                  whiteSpace: 'nowrap',
                  WebkitOverflowScrolling: 'touch',
                  '&::-webkit-scrollbar': { display: 'none' }
                }}
              >
                {/* All Items Chip */}
                <Chip
                  label="🌟 All Items"
                  onClick={() => setActiveCategory(null)}
                  color={activeCategory === null ? 'primary' : 'default'}
                  variant={activeCategory === null ? 'default' : 'outlined'}
                  sx={{
                    fontWeight: 800,
                    fontSize: '13px',
                    scrollSnapAlign: 'start',
                    flexShrink: 0,
                    '& .MuiChip-label': {
                      whiteSpace: 'nowrap',
                      overflow: 'visible'
                    }
                  }}
                />

                {categories.map(cat => (
                  <Chip
                    key={cat.id}
                    label={cat.name}
                    onClick={() => setActiveCategory(cat.id)}
                    color={activeCategory === cat.id ? 'primary' : 'default'}
                    variant={activeCategory === cat.id ? 'default' : 'outlined'}
                    sx={{
                      fontWeight: 800,
                      fontSize: '13px',
                      scrollSnapAlign: 'start',
                      flexShrink: 0,
                      '& .MuiChip-label': {
                        whiteSpace: 'nowrap',
                        overflow: 'visible'
                      }
                    }}
                  />
                ))}
              </Box>
              {/* Fade gradient mask on the right edge */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '50px',
                  height: '80%',
                  background: theme => `linear-gradient(to right, transparent, ${theme.palette.background.default})`,
                  pointerEvents: 'none',
                  zIndex: 2
                }}
              />
            </Box>

            {/* Food Menu Items Responsive CSS Grid (Ultra-Compact Reflow) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize === 'small' ? '120px' : cardSize === 'medium' ? '145px' : '175px'}, 1fr))`,
                gap: cardSize === 'small' ? '0.65rem' : cardSize === 'medium' ? '0.85rem' : '1rem',
                width: '100%'
              }}
            >
              {filteredItems.map(item => (
                <Card
                  key={item.id}
                  onClick={() => isCashier && handleItemClick(item)}
                  sx={{
                    cursor: isCashier ? 'pointer' : 'default',
                    position: 'relative',
                    borderRadius: cardSize === 'small' ? '12px' : '16px',
                    overflow: 'hidden',
                    aspectRatio: cardSize === 'small' ? '1/1' : cardSize === 'medium' ? '1/1' : '4/5',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    opacity: item.is_available ? 1 : 0.65,
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                      '& .card-bg-image': {
                        transform: 'scale(1.08)'
                      }
                    },
                    '&:active': {
                      transform: 'scale(0.97)'
                    }
                  }}
                >
                  {/* Full-bleed Background Image with smooth hover scale */}
                  {item.image_url ? (
                    <CardMedia
                      component="img"
                      image={item.image_url}
                      alt={item.name}
                      className="card-bg-image"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease'
                      }}
                    />
                  ) : (
                    <Box
                      className="card-bg-image"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: cardSize === 'small' ? '28px' : cardSize === 'medium' ? '36px' : '44px',
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        transition: 'transform 0.4s ease'
                      }}
                    >
                      {item.name.includes('Burger') && '🍔'}
                      {item.name.includes('Fries') && '🍟'}
                      {item.name.includes('Pizza') && '🍕'}
                      {item.name.includes('Cone') && '🍦'}
                      {item.name.includes('McFlurry') && '🍨'}
                      {item.name.includes('Coke') && '🥤'}
                      {item.name.includes('Fanta') && '🥤'}
                      {item.name.includes('Coffee') && '☕'}
                      {item.name.includes('Latte') && '☕'}
                      {item.name.includes('Cappuccino') && '☕'}
                      {item.name.includes('Macchiato') && '☕'}
                      {item.name.includes('Croissant') && '🥐'}
                      {item.name.includes('Muffin') && '🧁'}
                      {item.name.includes('Frappuccino') && '🍹'}
                      {!['Burger', 'Fries', 'Pizza', 'Cone', 'McFlurry', 'Coke', 'Fanta', 'Coffee', 'Latte', 'Cappuccino', 'Macchiato', 'Croissant', 'Muffin', 'Frappuccino'].some(x => item.name.includes(x)) && '🍽️'}
                    </Box>
                  )}

                  {/* Gradient Scrim Overlay for Readability (WCAG AA Contrast) */}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.05) 75%, transparent 100%)',
                      pointerEvents: 'none',
                      zIndex: 2
                    }}
                  />

                  {/* Top-Left Veg / Non-Veg Badge */}
                  <Chip
                    label={item.is_veg === 1 ? 'Veg' : 'Non-Veg'}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 10,
                      fontWeight: 800,
                      height: cardSize === 'small' ? 16 : 18,
                      fontSize: cardSize === 'small' ? '9px' : '10px',
                      bgcolor: item.is_veg === 1 ? '#16a34a' : '#dc2626',
                      color: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      borderRadius: '999px',
                      px: 0.2
                    }}
                  />

                  {/* Content Overlay (Bottom Alignment) */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      p: cardSize === 'small' ? '0.5rem 0.6rem' : cardSize === 'medium' ? 1.2 : 1.5,
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: cardSize === 'small' ? '0.15rem' : '0.2rem'
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        fontSize: cardSize === 'small' ? 'clamp(0.75rem, 2.5vw, 0.9rem)' : cardSize === 'medium' ? '12px' : '13px',
                        color: '#ffffff',
                        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                        ...(cardSize === 'small' ? {
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block'
                        } : {
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2
                        })
                      }}
                    >
                      {item.name}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: cardSize === 'small' ? '0.4rem' : '0.2rem',
                        width: '100%',
                        mt: 0.2
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          fontSize: cardSize === 'small' ? 'clamp(0.7rem, 2.5vw, 0.85rem)' : cardSize === 'medium' ? '12px' : '13px',
                          color: '#FFB020',
                          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                          whiteSpace: 'nowrap',
                          ...(cardSize === 'small' ? {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '60%',
                            flexShrink: 1
                          } : {})
                        }}
                      >
                        Rs. {parseFloat(item.price).toFixed(2)}
                      </Typography>

                      {!item.is_available ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#ef4444',
                            fontWeight: 800,
                            fontSize: cardSize === 'small' ? '10px' : '11px',
                            flexShrink: 0
                          }}
                        >
                          Out
                        </Typography>
                      ) : isCashier ? (
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            borderRadius: '999px',
                            bgcolor: '#ffffff',
                            color: '#f97316',
                            fontWeight: 800,
                            fontSize: cardSize === 'small' ? 'clamp(0.7rem, 2.5vw, 0.75rem)' : cardSize === 'medium' ? '11px' : '12px',
                            minWidth: cardSize === 'small' ? '50px' : 'auto',
                            minHeight: cardSize === 'small' ? '28px' : '30px',
                            px: cardSize === 'small' ? '0.6rem' : 1.8,
                            py: cardSize === 'small' ? '0.2rem' : 0,
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: '#f97316',
                              color: '#ffffff'
                            }
                          }}
                        >
                          Add
                        </Button>
                      ) : (
                        <Chip
                          label="Available"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 800, fontSize: '10px', height: 22, bgcolor: 'rgba(22, 163, 74, 0.1)', borderColor: '#16a34a', color: '#16a34a' }}
                        />
                      )}
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>

            {filteredItems.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>No dishes found matching selection.</Box>
            )}
          </Box>
        )}

        {/* Draggable Vertical Resize Divider Handle (Desktop / Laptop / TV only - Cashier Role Only) */}
        {!isMobileOrTablet && isCashier && (
          <Box
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-valuenow={ticketPanelWidth}
            aria-valuemin={MIN_TICKET_WIDTH}
            aria-valuemax={MAX_TICKET_WIDTH}
            aria-label="Resize Active Ticket Panel"
            onPointerDown={handleResizeStart}
            onDoubleClick={handleResetWidth}
            onKeyDown={handleKeyDownDivider}
            sx={{
              width: '8px',
              cursor: 'col-resize',
              position: 'relative',
              zIndex: 20,
              flexShrink: 0,
              bgcolor: isResizing ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isResizing ? 'none' : 'background-color 0.2s ease',
              userSelect: 'none',
              touchAction: 'none',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '3px',
                width: '2px',
                bgcolor: isResizing ? '#f97316' : 'divider',
                transition: 'background-color 0.2s ease'
              },
              '&:hover': {
                bgcolor: 'rgba(249, 115, 22, 0.12)',
                '&::before': {
                  bgcolor: '#f97316'
                },
                '& .resize-handle-grip': {
                  opacity: 1,
                  bgcolor: '#f97316'
                }
              },
              '&:focus-visible': {
                outline: '2px solid #f97316',
                outlineOffset: '-2px'
              }
            }}
          >
            {/* Visual Grip Pill Indicator */}
            <Box
              className="resize-handle-grip"
              sx={{
                width: '4px',
                height: '24px',
                borderRadius: '999px',
                bgcolor: isResizing ? '#f97316' : '#94a3b8',
                opacity: isResizing ? 1 : 0.5,
                transition: 'all 0.2s ease',
                zIndex: 21
              }}
            />
          </Box>
        )}

        {/* Right Side: Active Ticket Panel (Cashier Role Only) */}
        {isCashier && (!isMobileOrTablet || mobileTab === 1) && (
          <Box
            sx={{
              width: isMobileOrTablet ? '100%' : `${ticketPanelWidth}px`,
              flexShrink: 0,
              height: '100%',
              borderLeft: isMobileOrTablet ? 'none' : '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              transition: isResizing ? 'none' : 'width 0.1s ease'
            }}
          >
            {renderCartPanel()}
          </Box>
        )}
      </Box>

      {/* Floating checkout bar for mobile screen viewports (Cashier Role Only) */}
      {isMobileOrTablet && isCashier && cart.length > 0 && mobileTab === 0 && (
        <Box sx={{
          position: 'fixed',
          bottom: 16,
          left: '5%',
          right: '5%',
          width: '90%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: '12px',
          p: 1.8,
          boxShadow: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              🛒 {cart.reduce((a, b) => a + b.quantity, 0)} Items Added
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.9, display: 'block' }}>
              Total: Rs. {totals.total_amount.toFixed(2)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="inherit"
            onClick={() => setMobileTab(1)}
            size="small"
            sx={{
              color: 'primary.main',
              fontWeight: 800,
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f1f5f9' }
            }}
          >
            View Ticket & Pay
          </Button>
        </Box>
      )}

      {/* CONFIRMATION & PAYMENT MODAL */}
      <Dialog
        open={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 0.5,
            boxShadow: '0 20px 40px rgba(0,0,0,0.18)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', pt: 2.5, px: 3, pb: 1 }}>
          Confirm Takeaway Checkout
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, px: 3, py: 1 }}>
          {error && (
            <Box sx={{ bgcolor: 'error.light', color: 'error.contrastText', p: 1.5, borderRadius: 2, fontWeight: 600 }}>
              {error}
            </Box>
          )}

          {/* Breakdown summary */}
          <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2.5, fontSize: 13, border: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, borderBottom: 1, borderColor: 'divider', pb: 0.8, textTransform: 'uppercase', fontSize: '11px', color: 'text.secondary' }}>
              Order items summary
            </Typography>
            {cart.map(item => (
              <Box key={item.menu_item_id} sx={{ display: 'flex', justifyContent: 'space-between', my: 0.6 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name} x {item.quantity}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Rs. {(item.price * item.quantity).toFixed(2)}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed', borderColor: 'divider', pt: 1.2, mt: 1.2, fontWeight: 'bold' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Total Payable</Typography>
              <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                Rs. {totals.total_amount.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {/* Order Notes Field */}
          <TextField
            label="Order Notes / Customer Mobile"
            placeholder="Special instructions or customer information"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            fullWidth
            size="small"
          />

          {/* Payment Method Selector Heading */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
              Choose Payment Method
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Select a payment option to complete takeaway order.
            </Typography>
          </Box>
          
          {/* 2x2 Clean Payment Grid (1-Click Instant Payment Execution) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 1.5,
              width: '100%'
            }}
          >
            {[
              { id: 'cash', label: 'Cash', icon: '💵', desc: 'Instant Cash' },
              { id: 'upi', label: 'UPI Scan', icon: '📱', desc: 'QR Code' },
              { id: 'card', label: 'Credit Card', icon: '💳', desc: 'POS Terminal' },
              { id: 'split', label: 'Split Bill', icon: '⚖️', desc: 'Multi-Pay' }
            ].map(method => (
              <Card
                key={method.id}
                variant="outlined"
                onClick={() => handlePaymentSelect(method.id)}
                sx={{
                  cursor: 'pointer',
                  minHeight: '96px',
                  p: 1.5,
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  position: 'relative',
                  borderColor: 'divider',
                  borderWidth: 1,
                  bgcolor: 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(249, 115, 22, 0.08)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(249, 115, 22, 0.2)'
                  },
                  '&:active': {
                    transform: 'scale(0.97)'
                  }
                }}
              >
                <span style={{ fontSize: 26 }}>{method.icon}</span>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {method.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                  {method.desc}
                </Typography>
              </Card>
            ))}
          </Box>
        </DialogContent>

        {/* Modal Footer with ONLY Cancel Button (Clicking payment method immediately saves & prints) */}
        <DialogActions
          sx={{
            display: 'flex',
            justify: 'flex-start',
            alignItems: 'center',
            pt: 2,
            pb: 2.5,
            px: 3,
            borderTop: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setCheckoutModalOpen(false)}
            sx={{ fontWeight: 700, px: 3 }}
          >
            Cancel (Go Back to Order)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

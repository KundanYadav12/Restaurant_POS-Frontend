import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, Button, TextField, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab, useMediaQuery, IconButton, CircularProgress, Checkbox, TablePagination, InputAdornment, TableSortLabel, Tooltip, FormControl, InputLabel, Badge, Switch, FormControlLabel } from '@mui/material';
import { Plus, Edit2, Trash2, Shield, Settings, FileText, Wifi, List, RefreshCw, Download, Layers, GripVertical, Search, X, Filter, ArrowUpDown, CheckSquare, Square, Utensils, CheckCircle, XCircle, Printer, Users, UserPlus, Key, ArrowUp, ArrowDown } from 'lucide-react';
import { apiFetch, getApiUrl } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function AdminPanel({ token }) {
  const { notify, confirmDialog } = useNotify();
  const [activeTab, setActiveTab] = useState(0); // 0 = menu, 1 = categories, 2 = printers, 3 = reports, 4 = receipt settings, 5 = staff
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [reports, setReports] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Staff User Dialog States
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('cashier');
  const [staffActive, setStaffActive] = useState(true);

  // Dialog configurations
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'add_menu', 'edit_menu', 'add_printer', 'add_category'
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Form states
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [menuGst, setMenuGst] = useState('5');
  const [menuCategoryId, setMenuCategoryId] = useState('');
  const [menuVeg, setMenuVeg] = useState('1');
  const [menuSpicy, setMenuSpicy] = useState('0');
  const [menuAvailable, setMenuAvailable] = useState('1');
  const [menuSku, setMenuSku] = useState('');
  const [menuDesc, setMenuDesc] = useState('');
  const [menuImageUrl, setMenuImageUrl] = useState('');
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [menuPrinterId, setMenuPrinterId] = useState('');

  const [printerName, setPrinterName] = useState('');
  const [printerType, setPrinterType] = useState('lan');
  const [printerIp, setPrinterIp] = useState('');
  const [printerPort, setPrinterPort] = useState('9100');
  const [printerWidth, setPrinterWidth] = useState('80');
  const [printerRole, setPrinterRole] = useState('receipt');
  const [printerAutoCut, setPrinterAutoCut] = useState('1');
  const [printerCashDrawer, setPrinterCashDrawer] = useState('1');
  const [printerDefaultReceipt, setPrinterDefaultReceipt] = useState(false);
  const [printerDefaultKot, setPrinterDefaultKot] = useState(false);
  const [printerStatus, setPrinterStatus] = useState('online');
  
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [draggedCategoryIdx, setDraggedCategoryIdx] = useState(null);

  // Receipt & KOT Customization state
  const [receiptSettings, setReceiptSettings] = useState({
    restaurant_name: '',
    branch_name: 'Main Branch',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    gst_number: '',
    fssai_number: '',
    logo_url: '',
    header_message: 'Welcome to Our Restaurant!',
    footer_message: 'Visit us again soon.',
    thank_you_message: 'Thank You! Visit Again.',
    terms_conditions: 'Goods once sold cannot be returned.',
    paper_size: '80mm',
    font_size: 'normal',
    header_alignment: 'center',
    show_logo: 1,
    show_qr_code: 1,
    show_customer_details: 1,
    show_cashier_name: 1,
    show_tax_details: 1,
    show_payment_details: 1,
    show_footer_notes: 1,
    kot_header: 'KITCHEN ORDER TICKET',
    kitchen_name: 'Main Kitchen',
    kot_footer_note: 'Prepare with priority',
    show_kot_order_notes: 1,
    show_kot_time: 1
  });

  const [receiptPreviewMode, setReceiptPreviewMode] = useState('receipt'); // 'receipt' or 'kot'
  const [savingReceiptSettings, setSavingReceiptSettings] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);

  const isMobileOrTablet = useMediaQuery('(max-width:900px)');
  const isMobile = isMobileOrTablet;

  // Table search, filter, pagination, sorting & selection states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dietFilter, setDietFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'available', 'unavailable'
  const [sortField, setSortField] = useState('name'); // 'name', 'price', 'is_available', 'category_name'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const sortDirection = sortOrder;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState([]);

  const activeFilterCount = (searchTerm.trim() ? 1 : 0) + 
    (categoryFilter !== 'all' ? 1 : 0) + 
    (dietFilter !== 'all' ? 1 : 0) + 
    (statusFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setDietFilter('all');
    setStatusFilter('all');
    setPage(0);
  };

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Memoized Filtered & Sorted items
  const processedItems = React.useMemo(() => {
    let result = [...menuItems];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category_id?.toString() === categoryFilter.toString());
    }

    if (dietFilter === 'veg') {
      result = result.filter(item => Number(item.is_veg) === 1);
    } else if (dietFilter === 'nonveg' || dietFilter === 'non-veg') {
      result = result.filter(item => Number(item.is_veg) === 0);
    }

    if (statusFilter === 'available') {
      result = result.filter(item => item.is_available === 1);
    } else if (statusFilter === 'unavailable') {
      result = result.filter(item => item.is_available === 0);
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'price') {
        valA = parseFloat(valA || 0);
        valB = parseFloat(valB || 0);
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [menuItems, debouncedSearch, categoryFilter, dietFilter, statusFilter, sortField, sortOrder]);

  // Paginated slice
  const paginatedItems = React.useMemo(() => {
    const start = page * rowsPerPage;
    return processedItems.slice(start, start + rowsPerPage);
  }, [processedItems, page, rowsPerPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentPageIds = paginatedItems.map(item => item.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...currentPageIds])));
    } else {
      const pageIdsSet = new Set(paginatedItems.map(item => item.id));
      setSelectedIds(selectedIds.filter(id => !pageIdsSet.has(id)));
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (isAvailable) => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedIds.map(id => {
          const item = menuItems.find(m => m.id === id);
          if (!item) return Promise.resolve();
          return apiFetch(`/api/menu/${id}`, {
            method: 'PUT',
            body: { ...item, is_available: isAvailable ? 1 : 0 }
          });
        })
      );
      notify.success(`Updated availability status for ${selectedIds.length} menu items.`, 'Bulk Update Complete');
      setSelectedIds([]);
      await fetchData();
    } catch (err) {
      notify.error('Failed to update status for selected items.', 'Bulk Operation Error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    const isConfirmed = await confirmDialog({
      title: `Delete ${selectedIds.length} Menu Items`,
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected dishes? This action cannot be undone.`,
      confirmText: `Delete ${selectedIds.length} Items`,
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      setLoading(true);
      await Promise.all(
        selectedIds.map(id => apiFetch(`/api/menu/${id}`, { method: 'DELETE' }))
      );
      notify.success(`Deleted ${selectedIds.length} selected menu items.`, 'Bulk Delete Complete');
      setSelectedIds([]);
      await fetchData();
    } catch (err) {
      notify.error('Failed to delete selected items.', 'Bulk Delete Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 0) {
        const catRes = await apiFetch('/api/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(Array.isArray(catData) ? catData : []);
        } else {
          setCategories([]);
        }

        const menuRes = await apiFetch('/api/menu');
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenuItems(Array.isArray(menuData) ? menuData : []);
        } else {
          const menuErr = await menuRes.json();
          setError(menuErr.error || 'Failed to fetch menu items.');
          setMenuItems([]);
        }

        const printRes = await apiFetch('/api/printers');
        if (printRes.ok) {
          const printData = await printRes.json();
          setPrinters(Array.isArray(printData) ? printData : []);
        } else {
          setPrinters([]);
        }
      } else if (activeTab === 1) {
        const catRes = await apiFetch('/api/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(Array.isArray(catData) ? catData : []);
        } else {
          setCategories([]);
        }
      } else if (activeTab === 2) {
        const printRes = await apiFetch('/api/printers');
        if (printRes.ok) {
          const printData = await printRes.json();
          setPrinters(Array.isArray(printData) ? printData : []);
        } else {
          setPrinters([]);
        }
      } else if (activeTab === 3) {
        const repRes = await apiFetch('/api/reports/admin');
        if (repRes.ok) {
          setReports(await repRes.json());
        } else {
          setReports(null);
          setError('Failed to fetch sales report summary.');
        }
      } else if (activeTab === 4) {
        const settingsRes = await apiFetch('/api/settings/receipt');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setReceiptSettings(settingsData);
        }
      } else if (activeTab === 5) {
        const usersRes = await apiFetch('/api/auth/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setStaffUsers(Array.isArray(usersData) ? usersData : []);
        } else {
          setStaffUsers([]);
        }
      }
    } catch (err) {
      setError('Failed to fetch records.');
      setCategories([]);
      setMenuItems([]);
      setPrinters([]);
      setStaffUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Staff User Management Functions
  const handleOpenAddStaff = () => {
    setSelectedStaff(null);
    setStaffName('');
    setStaffUsername('');
    setStaffEmail('');
    setStaffPassword('');
    setStaffRole('cashier');
    setStaffActive(true);
    setStaffDialogOpen(true);
  };

  const handleOpenEditStaff = (user) => {
    setSelectedStaff(user);
    setStaffName(user.name || '');
    setStaffUsername(user.username || '');
    setStaffEmail(user.email || '');
    setStaffPassword(''); // Leave empty unless resetting password
    setStaffRole(user.role || 'cashier');
    setStaffActive(Boolean(user.is_active));
    setStaffDialogOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !staffUsername) {
      notify.error('Name and Username are required.', 'Validation Error');
      return;
    }

    setLoading(true);
    try {
      if (selectedStaff) {
        // Edit Staff User
        const payload = {
          name: staffName,
          email: staffEmail,
          role: staffRole,
          is_active: staffActive ? 1 : 0
        };
        if (staffPassword) {
          payload.password = staffPassword;
        }

        const res = await apiFetch(`/api/auth/users/${selectedStaff.id}`, {
          method: 'PUT',
          body: payload
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update staff user.');

        notify.success('Staff user account updated successfully.', 'Staff Updated');
      } else {
        // Add New Staff User
        if (!staffPassword || staffPassword.length < 6) {
          notify.error('Password must be at least 6 characters long.', 'Validation Error');
          setLoading(false);
          return;
        }

        const res = await apiFetch('/api/auth/users', {
          method: 'POST',
          body: {
            name: staffName,
            username: staffUsername,
            email: staffEmail,
            password: staffPassword,
            role: staffRole
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Failed to create staff user.');

        notify.success(`Staff user "${staffName}" created successfully. Credentials active.`, 'Staff Created');
      }

      setStaffDialogOpen(false);
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Staff Action Error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (user) => {
    const isConfirmed = await confirmDialog({
      title: `Delete Staff Account "${user.name}"`,
      message: `Are you sure you want to delete staff user "${user.name}" (${user.username})? They will no longer be able to log into the terminal.`,
      confirmText: 'Delete User Account',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`/api/auth/users/${user.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete staff user.');

      notify.success(`Staff user account "${user.name}" deleted.`, 'Staff Deleted');
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Delete Error');
    }
  };

  const handleSaveReceiptSettings = async () => {
    setSavingReceiptSettings(true);
    try {
      const res = await apiFetch('/api/settings/receipt', {
        method: 'POST',
        body: receiptSettings
      });
      if (res.ok) {
        const data = await res.json();
        setReceiptSettings(data.settings);
        notify.success('Receipt & KOT settings saved successfully.', 'Settings Saved');
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save settings.', 'Error');
      }
    } catch (err) {
      notify.error('Failed to save receipt settings.', 'Error');
    } finally {
      setSavingReceiptSettings(false);
    }
  };

  const handleTestPrint = async (type) => {
    setTestingPrint(true);
    try {
      const res = await apiFetch('/api/settings/receipt/test-print', {
        method: 'POST',
        body: { print_type: type }
      });
      if (res.ok) {
        const data = await res.json();
        notify.success(data.message, 'Test Print Dispatched');
      } else {
        notify.error('Failed to execute test print.', 'Error');
      }
    } catch (err) {
      notify.error('Failed to execute test print.', 'Error');
    } finally {
      setTestingPrint(false);
    }
  };

  const handleOpenAddMenu = () => {
    setDialogType('add_menu');
    setSelectedEntity(null);
    setMenuName('');
    setMenuPrice('');
    setMenuCategoryId(categories[0]?.id || '');
    setMenuVeg('1');
    setMenuSpicy('0');
    setMenuAvailable('1');
    setMenuSku('');
    setMenuDesc('');
    setMenuImageUrl('');
    setMenuImageFile(null);
    setMenuPrinterId('');
    setDialogOpen(true);
  };

  const handleOpenEditMenu = (item) => {
    setDialogType('edit_menu');
    setSelectedEntity(item);
    setMenuName(item.name);
    setMenuPrice(item.price);
    setMenuCategoryId(item.category_id.toString());
    setMenuVeg(item.is_veg.toString());
    setMenuSpicy(item.spicy_level.toString());
    setMenuAvailable(item.is_available.toString());
    setMenuSku(item.sku || '');
    setMenuDesc(item.description || '');
    setMenuImageUrl(item.image_url || '');
    setMenuImageFile(null);
    setMenuPrinterId(item.printer_id ? item.printer_id.toString() : '');
    setDialogOpen(true);
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', menuName);
    formData.append('price', menuPrice);
    formData.append('gst_rate', menuGst);
    formData.append('category_id', menuCategoryId);
    formData.append('is_veg', menuVeg);
    formData.append('spicy_level', menuSpicy);
    formData.append('is_available', menuAvailable);
    formData.append('sku', menuSku);
    formData.append('description', menuDesc);
    if (menuPrinterId) formData.append('printer_id', menuPrinterId);

    if (menuImageFile) {
      formData.append('image', menuImageFile);
    } else if (menuImageUrl) {
      formData.append('image_url', menuImageUrl);
    }

    try {
      const url = getApiUrl(dialogType === 'add_menu' ? '/api/menu' : `/api/menu/${selectedEntity.id}`);
      const method = dialogType === 'add_menu' ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error('Save menu item failed.');
      notify.success('Menu item saved successfully.', 'Item Saved');
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Save Error');
    }
  };

  const handleDeleteMenu = async (id) => {
    const isConfirmed = await confirmDialog({
      title: 'Delete Menu Item',
      message: 'Are you sure you want to delete this menu item? It will no longer appear on POS terminals.',
      confirmText: 'Delete Item',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      await fetch(getApiUrl(`/api/menu/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      notify.success('Menu item deleted successfully.', 'Item Deleted');
      fetchData();
    } catch (err) {
      notify.error('Failed to delete menu item.', 'Delete Error');
    }
  };

  // Category Sequence Reorder Functions
  const handleCategoryDragStart = (e, index) => {
    setDraggedCategoryIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedCategoryIdx === null || draggedCategoryIdx === dropIndex) return;

    const updatedCategories = [...categories];
    const [draggedItem] = updatedCategories.splice(draggedCategoryIdx, 1);
    updatedCategories.splice(dropIndex, 0, draggedItem);

    const reorderedWithSeq = updatedCategories.map((cat, idx) => ({
      ...cat,
      seq: idx + 1
    }));

    setCategories(reorderedWithSeq);
    setDraggedCategoryIdx(null);

    await saveCategorySequence(reorderedWithSeq);
  };

  const handleMoveCategory = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updatedCategories = [...categories];
    const temp = updatedCategories[index];
    updatedCategories[index] = updatedCategories[targetIndex];
    updatedCategories[targetIndex] = temp;

    const reorderedWithSeq = updatedCategories.map((cat, idx) => ({
      ...cat,
      seq: idx + 1
    }));

    setCategories(reorderedWithSeq);
    await saveCategorySequence(reorderedWithSeq);
  };

  const saveCategorySequence = async (reorderedList) => {
    try {
      const sequences = reorderedList.map((cat, idx) => ({
        id: cat.id,
        seq: idx + 1
      }));

      const res = await apiFetch('/api/categories/reorder', {
        method: 'POST',
        body: { sequences }
      });

      if (res.ok) {
        notify.success('Category sequence saved permanently.', 'Sequence Saved');
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save sequence.', 'Error');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      notify.error('Failed to save category sequence.', 'Error');
      fetchData();
    }
  };

  const handleOpenAddPrinter = () => {
    setDialogType('add_printer');
    setSelectedEntity(null);
    setPrinterName('');
    setPrinterType('lan');
    setPrinterIp('');
    setPrinterPort('9100');
    setPrinterWidth('80');
    setPrinterRole('receipt');
    setPrinterAutoCut('1');
    setPrinterCashDrawer('1');
    setPrinterDefaultReceipt(false);
    setPrinterDefaultKot(false);
    setPrinterStatus('online');
    setDialogOpen(true);
  };

  const handleOpenEditPrinter = (printer) => {
    setDialogType('edit_printer');
    setSelectedEntity(printer);
    setPrinterName(printer.name || '');
    setPrinterType(printer.type || 'lan');
    setPrinterIp(printer.ip_address || '');
    setPrinterPort((printer.port || 9100).toString());
    setPrinterWidth((printer.paper_width || 80).toString());
    setPrinterRole(printer.role || 'receipt');
    setPrinterAutoCut(printer.auto_cut !== undefined ? printer.auto_cut.toString() : '1');
    setPrinterCashDrawer(printer.cash_drawer !== undefined ? printer.cash_drawer.toString() : '1');
    setPrinterDefaultReceipt(Boolean(printer.is_default_receipt));
    setPrinterDefaultKot(Boolean(printer.is_default_kot));
    setPrinterStatus(printer.status || 'online');
    setDialogOpen(true);
  };

  const handleTogglePrinterStatus = async (printer) => {
    const nextStatus = printer.status === 'offline' ? 'online' : 'offline';
    try {
      const res = await apiFetch(`/api/printers/${printer.id}/status`, {
        method: 'PUT',
        body: { status: nextStatus }
      });
      if (!res.ok) {
        await apiFetch(`/api/printers/${printer.id}`, {
          method: 'PUT',
          body: { ...printer, status: nextStatus }
        });
      }
      notify.success(`Printer "${printer.name}" is now ${nextStatus.toUpperCase()}.`, 'Printer Status Updated');
      fetchData();
    } catch (err) {
      notify.error('Failed to toggle printer status.', 'Error');
    }
  };

  const handleSavePrinter = async (e) => {
    e.preventDefault();
    const payload = {
      name: printerName,
      type: printerType,
      ip_address: printerIp,
      port: parseInt(printerPort || 9100),
      paper_width: printerWidth,
      role: printerRole,
      auto_cut: parseInt(printerAutoCut),
      cash_drawer: parseInt(printerCashDrawer),
      is_default_receipt: printerDefaultReceipt,
      is_default_kot: printerDefaultKot,
      status: printerStatus
    };

    try {
      const isEdit = dialogType === 'edit_printer' && selectedEntity;
      const url = isEdit ? `/api/printers/${selectedEntity.id}` : '/api/printers';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        body: payload
      });
      if (!response.ok) throw new Error('Save printer configuration failed.');
      notify.success('Printer configuration saved successfully.', 'Printer Saved');
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Printer Error');
    }
  };

  const handleDeletePrinter = async (id) => {
    const isConfirmed = await confirmDialog({
      title: 'Delete Printer Configuration',
      message: 'Are you sure you want to delete this thermal printer setup?',
      confirmText: 'Delete Printer',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      await apiFetch(`/api/printers/${id}`, {
        method: 'DELETE'
      });
      notify.success('Printer configuration deleted.', 'Printer Removed');
      fetchData();
    } catch (err) {
      notify.error('Failed to delete printer configuration.', 'Delete Error');
    }
  };

  const handleTestPrinter = async (printer) => {
    try {
      const response = await apiFetch('/api/printers/test', {
        method: 'POST',
        body: { ip_address: printer.ip_address, port: printer.port }
      });
      const data = await response.json();
      if (response.ok) {
        notify.success(`Printer "${printer.name}" socket (${printer.ip_address}:${printer.port}) is ONLINE and ready.`, 'Socket Test Success');
      } else {
        notify.error(`Connection Test Failed: ${data.error}`, 'Socket Offline');
      }
    } catch (err) {
      notify.error('Failed to connect to printer TCP socket.', 'Network Error');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(getApiUrl('/api/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: categoryName, description: categoryDesc })
      });
      if (!response.ok) throw new Error('Create category failed.');
      notify.success('Menu category created successfully.', 'Category Created');
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Category Error');
    }
  };

  const handleDeleteCategory = async (id) => {
    const isConfirmed = await confirmDialog({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category?',
      confirmText: 'Delete Category',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      await fetch(getApiUrl(`/api/categories/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      notify.success('Category deleted successfully.', 'Category Deleted');
      fetchData();
    } catch (err) {
      notify.error('Failed to delete category.', 'Delete Error');
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          width: '100%',
          maxWidth: '1600px',
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4, xl: 6 },
          pt: { xs: 2, md: 3 },
          pb: { xs: 5, md: 8, xl: 10 },
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}
      >
        {/* Unified Horizontal Tab Navigation Bar */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%', mb: 0.5 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 800,
                fontSize: { xs: '0.85rem', md: '0.95rem' },
                textTransform: 'none',
                minHeight: 48,
                px: { xs: 2, md: 3 },
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: 'rgba(249, 115, 22, 0.04)'
                }
              }
            }}
          >
            <Tab icon={<List size={18} />} iconPosition="start" label="Menu Items" />
            <Tab icon={<Layers size={18} />} iconPosition="start" label="Categories" />
            <Tab icon={<Wifi size={18} />} iconPosition="start" label="Printers" />
            <Tab icon={<FileText size={18} />} iconPosition="start" label="Sales Reports" />
            <Tab icon={<Settings size={18} />} iconPosition="start" label="Receipt & KOT Settings" />
            <Tab icon={<Users size={18} />} iconPosition="start" label="Staff & Cashiers" />
          </Tabs>
        </Box>

        {error && (
          <Box sx={{ bgcolor: 'error.light', color: 'error.contrastText', p: 1.5, borderRadius: 2, fontWeight: 600 }}>
            {error}
          </Box>
        )}

        {/* --- FOOD ITEMS SUB-TAB --- */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, width: '100%' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>Manage Food Menu Items</Typography>
                <Typography variant="caption" color="text.secondary">Configure dish prices, GST levels, categories, and availability.</Typography>
              </Box>
              <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleOpenAddMenu} sx={{ fontWeight: 800, px: 2.5, py: 1 }}>
                Add Menu Item
              </Button>
            </Box>

            {/* SEARCH & FILTER TOOLBAR */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper', width: '100%' }}>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                {/* Search Bar */}
                <Grid xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search dish name or SKU..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={18} style={{ color: '#64748b' }} />
                          </InputAdornment>
                        ),
                        endAdornment: searchTerm ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setSearchTerm('')}>
                              <X size={16} />
                            </IconButton>
                          </InputAdornment>
                        ) : null
                      }
                    }}
                  />
                </Grid>

                {/* Category Filter */}
                <Grid xs={12} sm={6} md={3}>
                  <Select
                    fullWidth
                    size="small"
                    value={categoryFilter}
                    onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
                    displayEmpty
                  >
                    <MenuItem value="all">📁 All Categories ({menuItems.length})</MenuItem>
                    {(categories || []).map(cat => (
                      <MenuItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>

                {/* Diet Filter */}
                <Grid xs={6} sm={4} md={2.5}>
                  <Select
                    fullWidth
                    size="small"
                    value={dietFilter}
                    onChange={e => { setDietFilter(e.target.value); setPage(0); }}
                  >
                    <MenuItem value="all">🥗 All Diets</MenuItem>
                    <MenuItem value="veg">🟢 Veg Only</MenuItem>
                    <MenuItem value="nonveg">🔴 Non-Veg Only</MenuItem>
                  </Select>
                </Grid>

                {/* Availability Filter */}
                <Grid xs={6} sm={4} md={2.5}>
                  <Select
                    fullWidth
                    size="small"
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                  >
                    <MenuItem value="all">⚡ All Statuses</MenuItem>
                    <MenuItem value="available">✅ Available</MenuItem>
                    <MenuItem value="unavailable">❌ Sold Out</MenuItem>
                  </Select>
                </Grid>
              </Grid>

              {/* Active Removable Filter Chips */}
              {activeFilterCount > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.5 }}>
                    Active Filters ({activeFilterCount}):
                  </Typography>

                  {searchTerm && (
                    <Chip
                      size="small"
                      label={`Search: "${searchTerm}"`}
                      onDelete={() => setSearchTerm('')}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}

                  {categoryFilter !== 'all' && (
                    <Chip
                      size="small"
                      label={`Category: ${categories.find(c => c.id.toString() === categoryFilter)?.name || categoryFilter}`}
                      onDelete={() => setCategoryFilter('all')}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}

                  {dietFilter !== 'all' && (
                    <Chip
                      size="small"
                      label={`Diet: ${dietFilter === 'veg' ? 'Veg Only' : 'Non-Veg Only'}`}
                      onDelete={() => setDietFilter('all')}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}

                  {statusFilter !== 'all' && (
                    <Chip
                      size="small"
                      label={`Status: ${statusFilter === 'available' ? 'Available' : 'Sold Out'}`}
                      onDelete={() => setStatusFilter('all')}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}

                  <Button
                    size="small"
                    onClick={clearAllFilters}
                    sx={{ fontSize: '11px', textTransform: 'none', fontWeight: 700, color: 'error.main', ml: 'auto' }}
                  >
                    Clear All Filters
                  </Button>
                </Box>
              )}
            </Paper>

            {/* BULK ACTION BAR */}
            {selectedIds.length > 0 && (
              <Paper
                elevation={4}
                sx={{
                  p: 1.5,
                  px: 2.5,
                  borderRadius: 2.5,
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  width: '100%'
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {selectedIds.length} item(s) selected
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleBulkStatusChange(true)}
                    sx={{ fontWeight: 700, fontSize: '12px' }}
                  >
                    Mark Available
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={() => handleBulkStatusChange(false)}
                    sx={{ fontWeight: 700, fontSize: '12px' }}
                  >
                    Mark Sold Out
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<Trash2 size={14} />}
                    onClick={handleBulkDelete}
                    sx={{ fontWeight: 700, fontSize: '12px' }}
                  >
                    Delete Selected
                  </Button>
                  <IconButton size="small" onClick={() => setSelectedIds([])} sx={{ color: '#94a3b8' }}>
                    <X size={16} />
                  </IconButton>
                </Box>
              </Paper>
            )}

            {/* DESKTOP TABLE VIEW */}
            {!isMobileOrTablet ? (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, maxHeight: '65vh', overflow: 'auto', width: '100%' }}>
                <Table stickyHeader sx={{ width: '100%' }}>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                        <Checkbox
                          size="small"
                          indeterminate={selectedIds.length > 0 && selectedIds.length < processedItems.length}
                          checked={processedItems.length > 0 && selectedIds.length === processedItems.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: 60, bgcolor: '#f8fafc' }}>Item</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc' }}>
                        <TableSortLabel
                          active={sortField === 'name'}
                          direction={sortField === 'name' ? sortDirection : 'asc'}
                          onClick={() => handleSort('name')}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Item Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc' }}>
                        <TableSortLabel
                          active={sortField === 'category_id'}
                          direction={sortField === 'category_id' ? sortDirection : 'asc'}
                          onClick={() => handleSort('category_id')}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Category
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc' }}>
                        <TableSortLabel
                          active={sortField === 'price'}
                          direction={sortField === 'price' ? sortDirection : 'asc'}
                          onClick={() => handleSort('price')}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Price (INR)
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Diet</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc' }}>
                        <TableSortLabel
                          active={sortField === 'is_available'}
                          direction={sortField === 'is_available' ? sortDirection : 'asc'}
                          onClick={() => handleSort('is_available')}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Status
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', bgcolor: '#f8fafc' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            No menu items match your search & filter criteria.
                          </Typography>
                          <Button size="small" onClick={clearAllFilters} sx={{ mt: 1, fontWeight: 700 }}>
                            Reset Filters
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map((item, idx) => {
                        const isSelected = selectedIds.includes(item.id);
                        const cat = categories.find(c => c.id === item.category_id);
                        return (
                          <TableRow
                            key={item.id}
                            hover
                            selected={isSelected}
                            sx={{
                              bgcolor: idx % 2 === 1 ? 'action.hover' : 'background.paper',
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={isSelected}
                                onChange={() => handleSelectRow(item.id)}
                              />
                            </TableCell>
                            <TableCell>
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                                />
                              ) : (
                                <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'action.selected', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                  {item.is_veg === 1 ? '🥗' : '🍖'}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                  {item.name}
                                </Typography>
                                {item.sku && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    SKU: {item.sku}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={cat ? cat.name : 'Uncategorized'}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: '11px' }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>
                              Rs. {parseFloat(item.price).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {item.is_veg === 1 ? (
                                <Chip label="🟢 Veg" size="small" color="success" sx={{ fontWeight: 700, fontSize: '11px' }} />
                              ) : (
                                <Chip label="🔴 Non-Veg" size="small" color="error" sx={{ fontWeight: 700, fontSize: '11px' }} />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.is_available ? 'Available' : 'Sold Out'}
                                color={item.is_available ? 'success' : 'default'}
                                size="small"
                                sx={{ fontWeight: 800, fontSize: '11px' }}
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                <IconButton onClick={() => handleOpenEditMenu(item)} size="small" color="primary">
                                  <Edit2 size={16} />
                                </IconButton>
                                <IconButton onClick={() => handleDeleteMenu(item.id)} size="small" color="error">
                                  <Trash2 size={16} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              /* MOBILE RESPONSIVE STACKED CARDS VIEW */
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
                {paginatedItems.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No items match your filter criteria.
                    </Typography>
                  </Paper>
                ) : (
                  paginatedItems.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    const cat = categories.find(c => c.id === item.category_id);
                    return (
                      <Card
                        key={item.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          bgcolor: isSelected ? 'action.selected' : 'background.paper',
                          border: isSelected ? '2px solid #f97316' : '1px solid #e2e8f0',
                          width: '100%'
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => handleSelectRow(item.id)}
                            sx={{ p: 0, mt: 0.5 }}
                          />
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover' }}
                            />
                          ) : (
                            <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                              {item.is_veg === 1 ? '🥗' : '🍖'}
                            </Box>
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                {item.name}
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                Rs. {parseFloat(item.price).toFixed(2)}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1, alignItems: 'center' }}>
                              <Chip label={cat ? cat.name : 'General'} size="small" variant="outlined" sx={{ fontSize: '10px', height: 22 }} />
                              {item.is_veg === 1 ? (
                                <Chip label="🟢 Veg" size="small" color="success" sx={{ fontSize: '10px', height: 22 }} />
                              ) : (
                                <Chip label="🔴 Non-Veg" size="small" color="error" sx={{ fontSize: '10px', height: 22 }} />
                              )}
                              <Chip
                                label={item.is_available ? 'Available' : 'Sold Out'}
                                color={item.is_available ? 'success' : 'default'}
                                size="small"
                                sx={{ fontSize: '10px', height: 22, fontWeight: 700 }}
                              />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Edit2 size={14} />}
                                onClick={() => handleOpenEditMenu(item)}
                                sx={{ fontWeight: 700, fontSize: '11px' }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Trash2 size={14} />}
                                onClick={() => handleDeleteMenu(item.id)}
                                sx={{ fontWeight: 700, fontSize: '11px' }}
                              >
                                Delete
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      </Card>
                    );
                  })
                )}
              </Box>
            )}

            {/* PAGINATION CONTROLS */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 1, width: '100%' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Showing {processedItems.length > 0 ? page * rowsPerPage + 1 : 0}–{Math.min((page + 1) * rowsPerPage, processedItems.length)} of {processedItems.length} items
              </Typography>
              <TablePagination
                component="div"
                count={processedItems.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{ border: 'none' }}
              />
            </Box>
          </Box>
        )}

        {/* --- CATEGORIES SUB-TAB --- */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, width: '100%' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>Manage Menu Categories</Typography>
                <Typography variant="caption" color="text.secondary">Define custom layout category filters & display sequences.</Typography>
              </Box>
              <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => { setDialogType('add_category'); setCategoryName(''); setCategoryDesc(''); setDialogOpen(true); }} sx={{ fontWeight: 800, px: 2.5, py: 1 }}>
                Add Category
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%' }}>
              <Table sx={{ width: '100%' }}>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: 50 }}>Drag</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 90 }}>Move</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 60 }}>Seq</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 180 }}>Category Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '100%', minWidth: 300 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', minWidth: 100 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((cat, index) => (
                    <TableRow
                      key={cat.id}
                      draggable
                      onDragStart={(e) => handleCategoryDragStart(e, index)}
                      onDragOver={handleCategoryDragOver}
                      onDrop={(e) => handleCategoryDrop(e, index)}
                      onDragEnd={() => setDraggedCategoryIdx(null)}
                      sx={{
                        cursor: 'grab',
                        bgcolor: draggedCategoryIdx === index ? 'action.selected' : 'background.paper',
                        opacity: draggedCategoryIdx === index ? 0.5 : 1,
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', color: 'text.secondary' }}>
                          <GripVertical size={18} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Move Up">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === 0}
                                onClick={() => handleMoveCategory(index, -1)}
                                sx={{ p: 0.5 }}
                              >
                                <ArrowUp size={16} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Move Down">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === categories.length - 1}
                                onClick={() => handleMoveCategory(index, 1)}
                                sx={{ p: 0.5 }}
                              >
                                <ArrowDown size={16} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{cat.seq || index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{cat.name}</TableCell>
                      <TableCell color="text.secondary">{cat.description || 'No description notes'}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <IconButton onClick={() => handleDeleteCategory(cat.id)} size="small" color="error">
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* --- PRINTERS SUB-TAB --- */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, width: '100%' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>Printers & Terminals</Typography>
                <Typography variant="caption" color="text.secondary">Register hardware LAN IP addresses & dynamic ESC/POS configurations.</Typography>
              </Box>
              <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleOpenAddPrinter} sx={{ fontWeight: 800, px: 2.5, py: 1 }}>
                Add Printer
              </Button>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem',
                width: '100%'
              }}
            >
              {printers.map(printer => (
                <Card variant="outlined" key={printer.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 3 }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{printer.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Tooltip title={`Click to set status to ${printer.status === 'offline' ? 'ONLINE' : 'OFFLINE'}`}>
                          <Chip
                            label={printer.status === 'offline' ? '🔴 Offline' : '🟢 Online'}
                            size="small"
                            color={printer.status === 'offline' ? 'error' : 'success'}
                            variant="outlined"
                            onClick={() => handleTogglePrinterStatus(printer)}
                            clickable
                            sx={{ fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                          />
                        </Tooltip>
                        <Chip label={printer.role} size="small" color="primary" sx={{ fontWeight: 700, textTransform: 'uppercase' }} />
                      </Box>
                    </Box>

                    <Box sx={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 0.5, color: 'text.secondary' }}>
                      <Box>IP Address: <b>{printer.ip_address}:{printer.port || 9100}</b></Box>
                      <Box>Paper Width: <b>{printer.paper_width || 80}mm Thermal</b></Box>
                      <Box>Interface: <b>{(printer.type || 'lan').toUpperCase()}</b></Box>
                      {printer.is_default_receipt === 1 && <Chip label="⭐ Default Receipt Printer" size="small" color="warning" sx={{ width: 'fit-content', mt: 0.5, fontWeight: 700 }} />}
                      {printer.is_default_kot === 1 && <Chip label="👨‍🍳 Default KOT Printer" size="small" color="secondary" sx={{ width: 'fit-content', mt: 0.5, fontWeight: 700 }} />}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button onClick={() => handleTestPrinter(printer)} variant="outlined" size="small" sx={{ flex: 1, fontWeight: 700 }}>Test Socket</Button>
                      <IconButton onClick={() => handleOpenEditPrinter(printer)} size="small" color="primary"><Edit2 size={16} /></IconButton>
                      <IconButton onClick={() => handleDeletePrinter(printer.id)} size="small" color="error"><Trash2 size={16} /></IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* --- REPORTS SUB-TAB --- */}
        {activeTab === 3 && reports && reports.summary && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, width: '100%' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>Sales Dashboard Overview</Typography>
                <Typography variant="caption" color="text.secondary">View aggregates, revenue metrics, and tax summaries.</Typography>
              </Box>
              <Button variant="outlined" startIcon={<Download size={16} />} href={`/api/reports/export/sales-csv?token=${token}`} target="_blank" sx={{ fontWeight: 800, px: 2.5, py: 1 }}>
                Export CSV Logs
              </Button>
            </Box>

            {/* Aggregates Reflow CSS Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
                width: '100%'
              }}
            >
              <Box sx={{ p: 2.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Gross Revenue</Typography>
                <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800, mt: 0.5 }}>Rs. {reports.summary.totalRevenue.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ p: 2.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Tax Collected</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>Rs. {reports.summary.totalTax.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ p: 2.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Discounts Applied</Typography>
                <Typography variant="h5" color="warning.main" sx={{ fontWeight: 800, mt: 0.5 }}>Rs. {reports.summary.totalDiscount.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ p: 2.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Orders</Typography>
                <Typography variant="h5" color="secondary.main" sx={{ fontWeight: 800, mt: 0.5 }}>{reports.summary.totalOrders}</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* --- TAB 4: RECEIPT & KOT CUSTOMIZATION --- */}
        {activeTab === 4 && (
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Header Action Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Receipt & Kitchen Order Ticket (KOT) Customization
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Fully dynamic, database-driven templates. Changes immediately apply to thermal prints and POS previews.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => handleTestPrint('BOTH')}
                  disabled={testingPrint}
                  startIcon={<Printer size={16} />}
                  sx={{ fontWeight: 800 }}
                >
                  {testingPrint ? 'Printing...' : 'Test Thermal Print'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveReceiptSettings}
                  disabled={savingReceiptSettings}
                  sx={{ fontWeight: 800, px: 3 }}
                >
                  {savingReceiptSettings ? <CircularProgress size={20} color="inherit" /> : 'Save Settings'}
                </Button>
              </Box>
            </Box>

            {/* Main Split Grid: [ Form Controls 60% | Real-time Thermal Paper Preview 40% ] */}
            <Grid container spacing={3}>
              <Grid xs={12} lg={7} xl={8}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  
                  {/* Card 1: Business Branding & Contact Details */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      🏪 Restaurant Branding & Licensing
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="Restaurant Display Name"
                          size="small"
                          fullWidth
                          value={receiptSettings.restaurant_name || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, restaurant_name: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="Branch Name / Outlet"
                          size="small"
                          fullWidth
                          value={receiptSettings.branch_name || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, branch_name: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12}>
                        <TextField
                          label="Address"
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          value={receiptSettings.address || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, address: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="Phone Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.phone || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, phone: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="WhatsApp Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.whatsapp || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, whatsapp: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="Email Address"
                          size="small"
                          fullWidth
                          value={receiptSettings.email || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, email: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="Website URL"
                          size="small"
                          fullWidth
                          value={receiptSettings.website || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, website: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="GSTIN Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.gst_number || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, gst_number: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="FSSAI License Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.fssai_number || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, fssai_number: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12}>
                        <TextField
                          label="Restaurant Logo Image URL"
                          size="small"
                          fullWidth
                          placeholder="https://example.com/logo.png"
                          value={receiptSettings.logo_url || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, logo_url: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Card 2: Header & Footer Text Messages */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      💬 Custom Messages & Notes
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="Header Welcome Message"
                          size="small"
                          fullWidth
                          value={receiptSettings.header_message || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, header_message: e.target.value })}
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          label="Thank You Message"
                          size="small"
                          fullWidth
                          value={receiptSettings.thank_you_message || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, thank_you_message: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Footer Message / Social Handle"
                          size="small"
                          fullWidth
                          value={receiptSettings.footer_message || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, footer_message: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Terms & Conditions"
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          value={receiptSettings.terms_conditions || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, terms_conditions: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Card 3: Thermal Print Formatting Controls */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      🖨️ Paper Layout & Formatting
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Paper Width</InputLabel>
                          <Select
                            value={receiptSettings.paper_size || '80mm'}
                            label="Paper Width"
                            onChange={e => setReceiptSettings({ ...receiptSettings, paper_size: e.target.value })}
                          >
                            <MenuItem value="80mm">80mm (Standard)</MenuItem>
                            <MenuItem value="58mm">58mm (Compact)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Font Scale</InputLabel>
                          <Select
                            value={receiptSettings.font_size || 'normal'}
                            label="Font Scale"
                            onChange={e => setReceiptSettings({ ...receiptSettings, font_size: e.target.value })}
                          >
                            <MenuItem value="small">Small (Dense)</MenuItem>
                            <MenuItem value="normal">Normal (Standard)</MenuItem>
                            <MenuItem value="large">Large (High-Visibility)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Header Alignment</InputLabel>
                          <Select
                            value={receiptSettings.header_alignment || 'center'}
                            label="Header Alignment"
                            onChange={e => setReceiptSettings({ ...receiptSettings, header_alignment: e.target.value })}
                          >
                            <MenuItem value="left">Left Aligned</MenuItem>
                            <MenuItem value="center">Centered</MenuItem>
                            <MenuItem value="right">Right Aligned</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Card 4: Toggle Display Elements */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      🎛️ Receipt Display Feature Toggles
                    </Typography>

                    <Grid container spacing={1}>
                      {[
                        { key: 'show_logo', label: 'Show Restaurant Logo' },
                        { key: 'show_qr_code', label: 'Show QR Code' },
                        { key: 'show_customer_details', label: 'Show Customer Details' },
                        { key: 'show_cashier_name', label: 'Show Cashier Name' },
                        { key: 'show_tax_details', label: 'Show GST / Tax Breakup' },
                        { key: 'show_payment_details', label: 'Show Payment Mode' },
                        { key: 'show_footer_notes', label: 'Show Terms & Footer Notes' }
                      ].map(t => (
                        <Grid item xs={12} sm={6} key={t.key}>
                          <Box
                            onClick={() => setReceiptSettings({ ...receiptSettings, [t.key]: receiptSettings[t.key] ? 0 : 1 })}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: 1,
                              borderColor: receiptSettings[t.key] ? 'primary.main' : 'divider',
                              bgcolor: receiptSettings[t.key] ? 'rgba(249, 115, 22, 0.05)' : 'background.paper',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.label}</Typography>
                            {receiptSettings[t.key] ? <CheckCircle size={18} color="#f97316" /> : <XCircle size={18} color="#94a3b8" />}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>

                  {/* Card 5: KOT Template Customization */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2, borderColor: 'secondary.main', borderWidth: 1.5 }}>
                    <Typography variant="subtitle1" color="secondary.main" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      👨‍🍳 Kitchen Order Ticket (KOT) Template
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="KOT Header Title"
                          size="small"
                          fullWidth
                          value={receiptSettings.kot_header || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, kot_header: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Kitchen / Station Name"
                          size="small"
                          fullWidth
                          value={receiptSettings.kitchen_name || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, kitchen_name: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="KOT Footer Instruction"
                          size="small"
                          fullWidth
                          value={receiptSettings.kot_footer_note || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, kot_footer_note: e.target.value })}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Box
                          onClick={() => setReceiptSettings({ ...receiptSettings, show_kot_order_notes: receiptSettings.show_kot_order_notes ? 0 : 1 })}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: 1,
                            borderColor: receiptSettings.show_kot_order_notes ? 'secondary.main' : 'divider',
                            bgcolor: receiptSettings.show_kot_order_notes ? 'rgba(16, 185, 129, 0.05)' : 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            cursor: 'pointer'
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Show Item / Order Notes</Typography>
                          {receiptSettings.show_kot_order_notes ? <CheckCircle size={18} color="#10b981" /> : <XCircle size={18} color="#94a3b8" />}
                        </Box>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Box
                          onClick={() => setReceiptSettings({ ...receiptSettings, show_kot_time: receiptSettings.show_kot_time ? 0 : 1 })}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: 1,
                            borderColor: receiptSettings.show_kot_time ? 'secondary.main' : 'divider',
                            bgcolor: receiptSettings.show_kot_time ? 'rgba(16, 185, 129, 0.05)' : 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            cursor: 'pointer'
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Show Order Timestamp</Typography>
                          {receiptSettings.show_kot_time ? <CheckCircle size={18} color="#10b981" /> : <XCircle size={18} color="#94a3b8" />}
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>

                </Box>
              </Grid>

              {/* Live Side-by-Side Thermal Paper Preview Column */}
              <Grid item xs={12} lg={5} xl={4}>
                <Box
                  sx={{
                    position: 'sticky',
                    top: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  {/* Mode Selector Header */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 0.5,
                      borderRadius: 3,
                      display: 'flex',
                      width: '100%',
                      maxWidth: '340px'
                    }}
                  >
                    <Button
                      fullWidth
                      variant={receiptPreviewMode === 'receipt' ? 'contained' : 'text'}
                      color="primary"
                      size="small"
                      onClick={() => setReceiptPreviewMode('receipt')}
                      sx={{ fontWeight: 800, borderRadius: 2 }}
                    >
                      Receipt Preview 🧾
                    </Button>
                    <Button
                      fullWidth
                      variant={receiptPreviewMode === 'kot' ? 'contained' : 'text'}
                      color="secondary"
                      size="small"
                      onClick={() => setReceiptPreviewMode('kot')}
                      sx={{ fontWeight: 800, borderRadius: 2 }}
                    >
                      KOT Preview 👨‍🍳
                    </Button>
                  </Paper>

                  {/* Simulated Thermal Paper Strip */}
                  <Box
                    sx={{
                      width: receiptSettings.paper_size === '58mm' ? '260px' : '330px',
                      bgcolor: '#fffef9',
                      color: '#1e293b',
                      p: 2.5,
                      borderRadius: 1,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: receiptSettings.font_size === 'small' ? '11px' : (receiptSettings.font_size === 'large' ? '14px' : '12px'),
                      lineHeight: 1.4,
                      transition: 'all 0.3s ease',
                      wordBreak: 'break-word'
                    }}
                  >
                    {receiptPreviewMode === 'receipt' ? (
                      /* CUSTOMER RECEIPT PREVIEW */
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Logo */}
                        {Boolean(receiptSettings.show_logo) && receiptSettings.logo_url && (
                          <Box sx={{ textAlign: receiptSettings.header_alignment || 'center', mb: 0.5 }}>
                            <img src={receiptSettings.logo_url} alt="Logo" style={{ maxHeight: 40, objectFit: 'contain' }} />
                          </Box>
                        )}

                        {/* Header */}
                        <Box sx={{ textAlign: receiptSettings.header_alignment || 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontFamily: 'inherit', fontWeight: 800, textTransform: 'uppercase' }}>
                            {receiptSettings.restaurant_name || 'RESTAURANT POS'}
                          </Typography>
                          {receiptSettings.branch_name && <div>{receiptSettings.branch_name}</div>}
                          {receiptSettings.address && <div>{receiptSettings.address}</div>}
                          {receiptSettings.phone && <div>Ph: {receiptSettings.phone}</div>}
                          {receiptSettings.whatsapp && <div>WA: {receiptSettings.whatsapp}</div>}
                          {receiptSettings.email && <div>Email: {receiptSettings.email}</div>}
                          {receiptSettings.website && <div>Web: {receiptSettings.website}</div>}
                          {receiptSettings.gst_number && <div>GSTIN: {receiptSettings.gst_number}</div>}
                          {receiptSettings.fssai_number && <div>FSSAI: {receiptSettings.fssai_number}</div>}
                          {receiptSettings.header_message && <div style={{ marginTop: 4, fontStyle: 'italic' }}>* {receiptSettings.header_message} *</div>}
                        </Box>

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        {/* Order Info */}
                        <div>Bill No : #ORD-20260728-999</div>
                        {Boolean(receiptSettings.show_cashier_name) && <div>Cashier : Admin Tester</div>}
                        <div>Date    : {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                        {Boolean(receiptSettings.show_payment_details) && <div>Payment : CASH | Table #4</div>}
                        {Boolean(receiptSettings.show_customer_details) && <div>Customer: John Doe (9876543210)</div>}

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        {/* Items Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>Item</span>
                          <span>Qty</span>
                          <span>Price</span>
                        </div>
                        <div style={{ borderBottom: '1px dashed #475569' }} />

                        {/* Sample Items */}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Paneer Butter Masala</span>
                          <span>1</span>
                          <span>220.00</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>* Extra Gravy</div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Garlic Naan</span>
                          <span>2</span>
                          <span>80.00</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Mango Lassi</span>
                          <span>1</span>
                          <span>50.00</span>
                        </div>

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Subtotal:</span>
                          <span>Rs. 350.00</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Discount:</span>
                          <span>-Rs. 25.00</span>
                        </div>
                        {Boolean(receiptSettings.show_tax_details) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>GST Tax (5%):</span>
                            <span>Rs. 16.25</span>
                          </div>
                        )}

                        <div style={{ borderBottom: '2px solid #000', margin: '4px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1em' }}>
                          <span>TOTAL:</span>
                          <span>Rs. 341.25</span>
                        </div>

                        <div style={{ borderBottom: '2px solid #000', margin: '4px 0' }} />

                        {/* Footer */}
                        <Box sx={{ textAlign: 'center', mt: 1 }}>
                          <div style={{ fontWeight: 'bold' }}>{receiptSettings.thank_you_message || 'Thank You! Visit Again.'}</div>
                          {receiptSettings.footer_message && <div>{receiptSettings.footer_message}</div>}
                          {Boolean(receiptSettings.show_footer_notes) && receiptSettings.terms_conditions && (
                            <div style={{ fontSize: '9px', marginTop: 4 }}>T&C: {receiptSettings.terms_conditions}</div>
                          )}
                        </Box>

                        {/* Optional QR Code graphic */}
                        {Boolean(receiptSettings.show_qr_code) && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                            <Box sx={{ border: '2px solid #000', p: 0.5, borderRadius: 1, textAlign: 'center', fontSize: '9px' }}>
                              [ QR Code Digital Payment ]
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      /* KITCHEN ORDER TICKET (KOT) PREVIEW */
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontFamily: 'inherit', fontWeight: 800, textTransform: 'uppercase' }}>
                            {receiptSettings.kot_header || 'KITCHEN ORDER TICKET'}
                          </Typography>
                          {receiptSettings.kitchen_name && <div style={{ fontWeight: 'bold' }}>[ {receiptSettings.kitchen_name.toUpperCase()} ]</div>}
                          <div>Order #ORD-20260728-999 | Table #4</div>
                          {Boolean(receiptSettings.show_kot_time) && <div>Time: {new Date().toLocaleTimeString()}</div>}
                        </Box>

                        <div style={{ borderBottom: '2px solid #000', margin: '4px 0' }} />

                        <div style={{ fontWeight: 'bold' }}>
                          <div>1 x PANEER BUTTER MASALA</div>
                          <div style={{ marginLeft: 12, fontSize: '11px', color: '#15803d' }}>&gt;&gt;&gt; NOTE: EXTRA GRAVY</div>
                          <div style={{ marginTop: 4 }}>2 x GARLIC NAAN</div>
                          <div style={{ marginLeft: 12, fontSize: '11px', color: '#15803d' }}>&gt;&gt;&gt; NOTE: CRISPY</div>
                          <div style={{ marginTop: 4 }}>1 x MANGO LASSI</div>
                        </div>

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        {Boolean(receiptSettings.show_kot_order_notes) && (
                          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                            ORDER NOTE: CUSTOMER PREFERS MEDIUM SPICE
                          </div>
                        )}

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        <Box sx={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold', mt: 0.5 }}>
                          * {receiptSettings.kot_footer_note || 'Prepare with priority'} *
                          <div style={{ fontSize: '10px', marginTop: 4 }}>[ KOT END ]</div>
                        </Box>
                      </Box>
                    )}
                  </Box>

                </Box>
              </Grid>
            </Grid>

          </Box>
        )}

        {/* --- STAFF & CASHIERS SUB-TAB --- */}
        {activeTab === 5 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, width: '100%' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>Manage Restaurant Staff & Cashiers</Typography>
                <Typography variant="caption" color="text.secondary">Create terminal login credentials for Cashiers, Managers, and Staff members.</Typography>
              </Box>
              <Button variant="contained" startIcon={<UserPlus size={16} />} onClick={handleOpenAddStaff} sx={{ fontWeight: 800, px: 2.5, py: 1 }}>
                Add Cashier / Staff
              </Button>
            </Box>

            {/* Staff Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Staff Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Username / Login ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email Address</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Account Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staffUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No staff accounts found. Click "Add Cashier / Staff" to create your first terminal user.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell sx={{ fontWeight: 700 }}>{user.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>
                          {user.username}
                        </TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={(user.role || 'cashier').toUpperCase()}
                            color={user.role === 'admin' ? 'secondary' : user.role === 'manager' ? 'info' : 'primary'}
                            size="small"
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'ACTIVE' : 'INACTIVE'}
                            color={user.is_active ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Edit Staff Credentials">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEditStaff(user)}>
                                <Edit2 size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Staff Account">
                              <IconButton size="small" color="error" onClick={() => handleDeleteStaff(user)}>
                                <Trash2 size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

      {/* --- CRUD FORM POPUP --- */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {dialogType === 'add_menu' && 'Add Menu Item'}
          {dialogType === 'edit_menu' && 'Modify Menu Item'}
          {dialogType === 'add_printer' && 'Add Printer'}
          {dialogType === 'add_category' && 'Add Category'}
        </DialogTitle>

        <form onSubmit={
          dialogType.includes('menu') ? handleSaveMenu :
          dialogType.includes('printer') ? handleSavePrinter :
          handleSaveCategory
        }>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dialogType.includes('menu') && (
              <>
                <TextField label="Item Name" size="small" fullWidth value={menuName} onChange={e => setMenuName(e.target.value)} required />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField label="Price (INR)" type="number" size="small" fullWidth value={menuPrice} onChange={e => setMenuPrice(e.target.value)} required />
                  </Grid>
                  <Grid item xs={6}>
                    <Select size="small" fullWidth value={menuCategoryId} onChange={e => setMenuCategoryId(e.target.value)}>
                      {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </Select>
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Select size="small" fullWidth value={menuVeg} onChange={e => setMenuVeg(e.target.value)}>
                      <MenuItem value="1">🟢 Veg</MenuItem>
                      <MenuItem value="0">🔴 Non-Veg</MenuItem>
                    </Select>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="SKU / Barcode" size="small" fullWidth value={menuSku} onChange={e => setMenuSku(e.target.value)} />
                  </Grid>
                </Grid>

                <TextField label="Description" size="small" fullWidth value={menuDesc} onChange={e => setMenuDesc(e.target.value)} multiline rows={2} />
                <FormControl fullWidth size="small">
                  <InputLabel>Associated Kitchen / Bar Printer</InputLabel>
                  <Select
                    value={menuPrinterId}
                    label="Associated Kitchen / Bar Printer"
                    onChange={e => setMenuPrinterId(e.target.value)}
                  >
                    <MenuItem value="">Default Kitchen Printer (Fallback)</MenuItem>
                    {printers.map(p => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name} ({p.role ? p.role.toUpperCase() : 'PRINTER'})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* File Upload Control */}
                <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'text.secondary' }}>
                    Food Image File Upload
                  </Typography>
                  
                  <Button variant="contained" component="label" size="small" sx={{ fontWeight: 'bold' }}>
                    📷 Select Image File
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setMenuImageFile(file);
                          setMenuImageUrl(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </Button>

                  {menuImageUrl && (
                    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                      <img src={menuImageUrl} alt="Preview" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                      <Button size="small" color="error" onClick={() => { setMenuImageFile(null); setMenuImageUrl(''); }}>
                        Remove
                      </Button>
                    </Box>
                  )}
                </Box>
              </>
            )}

            {dialogType.includes('printer') && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Printer Name / Location" size="small" fullWidth value={printerName} onChange={e => setPrinterName(e.target.value)} required placeholder="e.g. Kitchen Printer 1" />
                <TextField label="IP Address / Host" size="small" fullWidth value={printerIp} onChange={e => setPrinterIp(e.target.value)} required placeholder="192.168.1.100" />
                <TextField label="Port" size="small" fullWidth value={printerPort} onChange={e => setPrinterPort(e.target.value)} required placeholder="9100" />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Select size="small" fullWidth value={printerType} onChange={e => setPrinterType(e.target.value)}>
                      <MenuItem value="lan">LAN / Network (TCP)</MenuItem>
                      <MenuItem value="usb">USB</MenuItem>
                      <MenuItem value="bluetooth">Bluetooth</MenuItem>
                      <MenuItem value="network">Network Socket</MenuItem>
                    </Select>
                  </Grid>
                  <Grid item xs={6}>
                    <Select size="small" fullWidth value={printerWidth} onChange={e => setPrinterWidth(e.target.value)}>
                      <MenuItem value="80">80mm Thermal</MenuItem>
                      <MenuItem value="58">58mm Thermal</MenuItem>
                    </Select>
                  </Grid>
                </Grid>

                <Select size="small" fullWidth value={printerRole} onChange={e => setPrinterRole(e.target.value)}>
                  <MenuItem value="receipt">Receipt (Counter)</MenuItem>
                  <MenuItem value="kitchen">Kitchen (KOT)</MenuItem>
                  <MenuItem value="bar">Bar Printer</MenuItem>
                  <MenuItem value="dessert">Dessert Printer</MenuItem>
                </Select>

                <FormControl fullWidth size="small">
                  <InputLabel>Online / Offline Status</InputLabel>
                  <Select
                    value={printerStatus}
                    label="Online / Offline Status"
                    onChange={e => setPrinterStatus(e.target.value)}
                  >
                    <MenuItem value="online">🟢 Online (Active & Ready to Print)</MenuItem>
                    <MenuItem value="offline">🔴 Offline (Disabled / Maintenance)</MenuItem>
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Select size="small" fullWidth value={printerAutoCut} onChange={e => setPrinterAutoCut(e.target.value)}>
                      <MenuItem value="1">✂️ Auto-Cutter ON</MenuItem>
                      <MenuItem value="0">Disabled</MenuItem>
                    </Select>
                  </Grid>
                  <Grid item xs={6}>
                    <Select size="small" fullWidth value={printerCashDrawer} onChange={e => setPrinterCashDrawer(e.target.value)}>
                      <MenuItem value="1">💵 Cash Drawer Pulse ON</MenuItem>
                      <MenuItem value="0">Disabled</MenuItem>
                    </Select>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
                  <Button
                    variant={printerDefaultReceipt ? 'contained' : 'outlined'}
                    color="warning"
                    size="small"
                    onClick={() => setPrinterDefaultReceipt(prev => !prev)}
                    sx={{ fontWeight: 800 }}
                  >
                    {printerDefaultReceipt ? '⭐ Set as Default Receipt Printer' : 'Set as Default Receipt Printer'}
                  </Button>
                  <Button
                    variant={printerDefaultKot ? 'contained' : 'outlined'}
                    color="secondary"
                    size="small"
                    onClick={() => setPrinterDefaultKot(prev => !prev)}
                    sx={{ fontWeight: 800 }}
                  >
                    {printerDefaultKot ? '👨‍🍳 Set as Default KOT Printer' : 'Set as Default KOT Printer'}
                  </Button>
                </Box>
              </Box>
            )}

            {dialogType.includes('category') && (
              <>
                <TextField label="Category Name" size="small" fullWidth value={categoryName} onChange={e => setCategoryName(e.target.value)} required />
                <TextField label="Description" size="small" fullWidth value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)} />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* --- ADD / EDIT STAFF DIALOG --- */}
      <Dialog open={staffDialogOpen} onClose={() => setStaffDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {selectedStaff ? 'Edit Staff User Credentials' : 'Add Cashier / Staff User'}
        </DialogTitle>
        <form onSubmit={handleSaveStaff}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Staff Full Name"
              size="small"
              fullWidth
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
            <TextField
              label="Username (Login ID)"
              size="small"
              fullWidth
              value={staffUsername}
              onChange={e => setStaffUsername(e.target.value)}
              placeholder="e.g. cashier1"
              disabled={Boolean(selectedStaff)}
              required
            />
            <TextField
              label="Email Address (Optional)"
              type="email"
              size="small"
              fullWidth
              value={staffEmail}
              onChange={e => setStaffEmail(e.target.value)}
              placeholder="rahul@example.com"
            />
            <TextField
              label={selectedStaff ? 'Reset Password (Leave blank to keep current)' : 'Password'}
              type="password"
              size="small"
              fullWidth
              value={staffPassword}
              onChange={e => setStaffPassword(e.target.value)}
              required={!selectedStaff}
              placeholder="Min 6 characters"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={staffRole}
                label="Role"
                onChange={e => setStaffRole(e.target.value)}
              >
                <MenuItem value="cashier">Cashier (POS & Shift Control)</MenuItem>
                <MenuItem value="manager">Manager (Reports & Refunds)</MenuItem>
                <MenuItem value="admin">Admin (Full Control)</MenuItem>
              </Select>
            </FormControl>

            {selectedStaff && (
              <FormControlLabel
                control={
                  <Switch
                    checked={staffActive}
                    onChange={e => setStaffActive(e.target.checked)}
                    color="success"
                  />
                }
                label={staffActive ? 'Account Active' : 'Account Suspended'}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStaffDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedStaff ? 'Save Changes' : 'Create Staff User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  </Box>
);
}

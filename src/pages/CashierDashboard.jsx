import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, Button, Divider, Paper, CircularProgress, Chip } from '@mui/material';
import LogOutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function CashierDashboard({ user, token, onLogout }) {
  const { notify, confirmDialog } = useNotify();
  const [shiftData, setShiftData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShiftSummary();
  }, []);

  const fetchShiftSummary = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/orders/shift-summary');
      if (response.ok) {
        setShiftData(await response.json());
      }
    } catch (err) {
      console.error(err);
      notify.error('Failed to load shift summary.', 'Sync Error');
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    const isConfirmed = await confirmDialog({
      title: 'Close Shift & Logout',
      message: 'Are you sure you want to end your shift and logout? Shift collections will be committed to audit reports.',
      confirmText: 'Close Shift & Logout',
      isDestructive: false
    });

    if (isConfirmed) {
      notify.info('Shift closed successfully.', 'Shift Complete');
      onLogout();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">Fetching shift summary...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        
        {/* Active shift header */}
        <Card variant="outlined" sx={{ p: 1, border: 1, borderColor: 'divider', boxShadow: 1 }}>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Cashier Shift Active</Typography>
              <Typography variant="caption" color="text.secondary">
                Cashier: <b>{user.name}</b> | Store: <b>{user.restaurant_name}</b>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchShiftSummary}>
                Sync Shift
              </Button>
              <Button variant="contained" color="error" startIcon={<LogOutIcon />} onClick={handleEndShift}>
                End Shift & Logout
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Breakdown Cards */}
        {shiftData && (
          <Grid container spacing={3}>
            <Grid xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>STARTING FLOAT</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                  Rs. {parseFloat(shiftData.starting_cash || 0).toFixed(2)}
                </Typography>
              </Paper>
            </Grid>

            <Grid xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>SHIFT SALES ({shiftData.total_orders || 0})</Typography>
                <Typography variant="h5" color="primary" sx={{ fontWeight: 800, mt: 1 }}>
                  Rs. {parseFloat(shiftData.total_sales || 0).toFixed(2)}
                </Typography>
              </Paper>
            </Grid>

            <Grid xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>EXPECTED CASH IN DRAWER</Typography>
                <Typography variant="h5" color="success.main" sx={{ fontWeight: 800, mt: 1 }}>
                  Rs. {(parseFloat(shiftData.starting_cash || 0) + parseFloat(shiftData.cash_sales || 0)).toFixed(2)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Payment Type Breakdown */}
        {shiftData && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Payment Method Collections</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Cash Collections</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>Rs. {parseFloat(shiftData.cash_sales || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">UPI / Digital Payments</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>Rs. {parseFloat(shiftData.upi_sales || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Card Collections</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>Rs. {parseFloat(shiftData.card_sales || 0).toFixed(2)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

      </Box>
    </Container>
  );
}

<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Mock response - always succeeds for testing
echo json_encode([
    'success' => true,
    'message' => 'Demo mode - Payment successful',
    'checkoutRequestID' => 'DEMO_' . time()
]);
?>

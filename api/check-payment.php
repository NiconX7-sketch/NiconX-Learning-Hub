<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Mock response - always says paid
echo json_encode([
    'success' => true,
    'paid' => true,
    'expires_at' => date('Y-m-d H:i:s', strtotime('+8 hours'))
]);
?>

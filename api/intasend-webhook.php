<?php
header('Content-Type: application/json');

// Log incoming webhook for debugging
$rawInput = file_get_contents('php://input');
$webhookData = json_decode($rawInput, true);

// Log to file for debugging (create a logs folder)
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}
file_put_contents($logDir . '/webhook-' . date('Y-m-d') . '.log', 
    date('Y-m-d H:i:s') . ' - ' . $rawInput . PHP_EOL, FILE_APPEND);

// Supabase configuration
$supabaseUrl = getenv('SUPABASE_URL');
$supabaseKey = getenv('SUPABASE_ANON_KEY');

// Check if payment was successful
$state = $webhookData['invoice']['state'] ?? $webhookData['state'] ?? '';
$mpesaReceipt = $webhookData['invoice']['mpesa_receipt'] ?? $webhookData['mpesa_receipt'] ?? '';
$phoneNumber = $webhookData['invoice']['phone_number'] ?? $webhookData['phone_number'] ?? '';
$amount = $webhookData['invoice']['amount'] ?? $webhookData['amount'] ?? 20;
$apiRef = $webhookData['invoice']['api_ref'] ?? $webhookData['api_ref'] ?? '';

// Extract class level from api_ref
preg_match('/NICONX_.*?_(.*?)_/', $apiRef, $matches);
$classLevel = $matches[1] ?? 'grade4';

// Clean phone number (remove any formatting)
$phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);
if (substr($phoneNumber, 0, 3) === '254') {
    $phoneNumber = '0' . substr($phoneNumber, 3);
}

// Payment states: COMPLETE, PAID, FAILED, PENDING
if ($state === 'COMPLETE' || $state === 'PAID') {
    // Payment successful - create session in Supabase
    $expiresAt = date('Y-m-d H:i:s', strtotime('+8 hours'));
    
    // Insert payment session
    $insertData = [
        'phone' => $phoneNumber,
        'class_level' => $classLevel,
        'amount' => $amount,
        'mpesa_receipt' => $mpesaReceipt,
        'expires_at' => $expiresAt,
        'status' => 'active'
    ];
    
    $ch = curl_init($supabaseUrl . '/rest/v1/payment_sessions');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($insertData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    file_put_contents($logDir . '/webhook-' . date('Y-m-d') . '.log', 
        date('Y-m-d H:i:s') . ' - Supabase insert result: ' . $httpCode . ' - ' . $result . PHP_EOL, FILE_APPEND);
    
    echo json_encode(['status' => 'success', 'message' => 'Session created']);
} elseif ($state === 'FAILED') {
    file_put_contents($logDir . '/webhook-' . date('Y-m-d') . '.log', 
        date('Y-m-d H:i:s') . ' - Payment FAILED for ' . $phoneNumber . PHP_EOL, FILE_APPEND);
    echo json_encode(['status' => 'failed', 'message' => 'Payment failed']);
} else {
    echo json_encode(['status' => 'ignored', 'message' => 'Payment not complete']);
}
?>

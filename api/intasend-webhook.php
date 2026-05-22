<?php
header('Content-Type: application/json');

// Log incoming webhook for debugging
$rawInput = file_get_contents('php://input');
$webhookData = json_decode($rawInput, true);

// Write to log file for debugging
file_put_contents('webhook-log.txt', date('Y-m-d H:i:s') . ': ' . $rawInput . PHP_EOL, FILE_APPEND);

// Verify webhook authenticity (optional but recommended)
$signature = $_SERVER['HTTP_X_INTASEND_SIGNATURE'] ?? '';
// TODO: Verify signature using your secret key

// Check if payment was successful
$state = $webhookData['invoice']['state'] ?? $webhookData['state'] ?? '';
$invoiceId = $webhookData['invoice']['id'] ?? $webhookData['id'] ?? '';
$mpesaReceipt = $webhookData['invoice']['mpesa_receipt'] ?? $webhookData['mpesa_receipt'] ?? '';
$phoneNumber = $webhookData['invoice']['phone_number'] ?? $webhookData['phone_number'] ?? '';
$amount = $webhookData['invoice']['amount'] ?? $webhookData['amount'] ?? 20;
$apiRef = $webhookData['invoice']['api_ref'] ?? $webhookData['api_ref'] ?? '';

// Extract class level from api_ref (format: NICONX_timestamp_classlevel_random)
preg_match('/NICONX_.*?_(.*?)_/', $apiRef, $matches);
$classLevel = $matches[1] ?? 'grade4';

if ($state === 'COMPLETE' || $state === 'PAID') {
    // Payment successful - create session in Supabase
    require_once('supabase-config.php'); // You'll create this
    
    $expiresAt = date('Y-m-d H:i:s', strtotime('+8 hours'));
    
    $supabaseUrl = getenv('SUPABASE_URL');
    $supabaseKey = getenv('SUPABASE_ANON_KEY');
    
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
    curl_exec($ch);
    curl_close($ch);
    
    echo json_encode(['status' => 'success', 'message' => 'Session created']);
} else {
    echo json_encode(['status' => 'ignored', 'message' => 'Payment not complete']);
}
?>

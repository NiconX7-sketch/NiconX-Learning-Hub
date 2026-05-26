<?php
// PesaPal IPN Webhook - Called when payment status changes
header('Content-Type: application/json');

// Log incoming IPN for debugging
$rawInput = file_get_contents('php://input');
$ipnData = json_decode($rawInput, true);

// Log to file
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}
file_put_contents($logDir . '/pesapal-ipn.log', 
    date('Y-m-d H:i:s') . ' - ' . $rawInput . PHP_EOL, FILE_APPEND);

// Get credentials
$consumerKey = getenv('PESAPAL_CONSUMER_KEY');
$consumerSecret = getenv('PESAPAL_CONSUMER_SECRET');
$isSandbox = getenv('PESAPAL_MODE') !== 'live';

// PesaPal sends: order_tracking_id, order_merchant_reference, order_notification_type, order_payment_method, order_amount, order_currency
$trackingId = $ipnData['order_tracking_id'] ?? '';
$merchantReference = $ipnData['order_merchant_reference'] ?? '';
$notificationType = $ipnData['order_notification_type'] ?? ''; // IPNCHANGE, PAYMENT, etc.
$paymentMethod = $ipnData['order_payment_method'] ?? '';
$amount = $ipnData['order_amount'] ?? 20;
$currency = $ipnData['order_currency'] ?? 'KES';

// Extract class level from merchant reference (format: NICONX_timestamp_classlevel_random)
preg_match('/NICONX_.*?_(.*?)_/', $merchantReference, $matches);
$classLevel = $matches[1] ?? 'grade4';

// Extract phone from reference or get from database
$phone = '0712345678'; // You should store this when initiating payment

// Supabase configuration
$supabaseUrl = getenv('SUPABASE_URL');
$supabaseKey = getenv('SUPABASE_ANON_KEY');

// First, get the payment status from PesaPal to confirm [citation:3]
$statusApiUrl = $isSandbox
    ? 'https://cybqa.pesapal.com/pesapalv3/api/Transactions/GetTransactionStatus'
    : 'https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus';

// Get auth token
$authUrl = $isSandbox 
    ? 'https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken'
    : 'https://pay.pesapal.com/v3/api/Auth/RequestToken';

$authData = json_encode([
    'consumer_key' => $consumerKey,
    'consumer_secret' => $consumerSecret
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $authUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $authData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$authResponse = curl_exec($ch);
$authResult = json_decode($authResponse, true);
curl_close($ch);

if (isset($authResult['token'])) {
    // Query transaction status
    $ch = curl_init($statusApiUrl . '?orderTrackingId=' . urlencode($trackingId));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $authResult['token'],
        'Accept: application/json'
    ]);
    $statusResponse = curl_exec($ch);
    curl_close($ch);
    
    $statusData = json_decode($statusResponse, true);
    
    if (isset($statusData['payment_status_description']) && $statusData['payment_status_description'] === 'Completed') {
        // Payment successful - create session in Supabase
        $expiresAt = date('Y-m-d H:i:s', strtotime('+8 hours'));
        
        $insertData = [
            'phone' => $phone,
            'class_level' => $classLevel,
            'amount' => $amount,
            'mpesa_receipt' => $trackingId,
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
        
        file_put_contents($logDir . '/pesapal-ipn.log', 
            date('Y-m-d H:i:s') . ' - Payment confirmed for ' . $phone . PHP_EOL, FILE_APPEND);
    }
}

// Always return 200 OK to PesaPal
echo json_encode(['status' => 'success']);
?>

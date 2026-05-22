<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Get IntaSend credentials from environment variables (LIVE MODE)
$publishableKey = getenv('INTASEND_PUBLISHABLE_KEY');
$secretKey = getenv('INTASEND_SECRET_KEY');
$walletId = getenv('INTASEND_WALLET_ID');
$isTestMode = false; // FORCE LIVE MODE

// LIVE API URL - Production
$apiUrl = 'https://payment.intasend.com/api/';

// Get request data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Invalid request data']);
    exit;
}

$phoneNumber = $data['phone'] ?? '';
$amount = $data['amount'] ?? 20;
$classLevel = $data['class_level'] ?? '';
$email = $data['email'] ?? 'student@niconxlearning.co.ke';

// Format phone number to 254XXXXXXXXX (M-Pesa format)
$phoneNumber = preg_replace('/^0/', '254', $phoneNumber);
$phoneNumber = preg_replace('/^\+/', '', $phoneNumber);

// Validate
if (empty($phoneNumber) || strlen($phoneNumber) < 10) {
    echo json_encode(['success' => false, 'message' => 'Invalid phone number. Use format: 0712345678']);
    exit;
}

// Prepare STK Push request to IntaSend LIVE
$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, $apiUrl . 'mpesa/stk-push/');
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, true); // Important for live
curl_setopt($curl, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $secretKey,
    'Content-Type: application/json'
]);

$postData = [
    'phone_number' => $phoneNumber,
    'amount' => (int)$amount,
    'api_ref' => 'NICONX_' . time() . '_' . $classLevel . '_' . uniqid(),
    'currency' => 'KES',
    'email' => $email,
    'narrative' => 'NiconX Learning Access - ' . strtoupper($classLevel)
];

// Add wallet_id (REQUIRED for live)
if (!empty($walletId)) {
    $postData['wallet_id'] = $walletId;
}

// Add callback URL for webhook
$callbackUrl = getenv('INTASEND_CALLBACK_URL') ?: 'https://' . $_SERVER['HTTP_HOST'] . '/api/intasend-webhook.php';
$postData['webhook'] = $callbackUrl;

curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($postData));

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$curlError = curl_error($curl);
curl_close($curl);

// Log for debugging
error_log("IntaSend LIVE STK Response Code: " . $httpCode);
error_log("IntaSend LIVE STK Response: " . $response);

if ($curlError) {
    echo json_encode([
        'success' => false, 
        'message' => 'Connection error: ' . $curlError
    ]);
    exit;
}

$result = json_decode($response, true);

if ($httpCode === 200 || $httpCode === 201) {
    if (isset($result['success']) && $result['success'] === true) {
        echo json_encode([
            'success' => true,
            'message' => 'STK Push sent to ' . $phoneNumber . '. Enter PIN on your phone.',
            'invoice_id' => $result['invoice_id'] ?? null,
            'checkout_id' => $result['id'] ?? null
        ]);
    } else {
        $errorMsg = $result['message'] ?? $result['error'] ?? 'STK Push failed';
        echo json_encode([
            'success' => false,
            'message' => $errorMsg
        ]);
    }
} else {
    $errorMsg = $result['message'] ?? $result['error'] ?? 'Payment initiation failed. Please try again.';
    echo json_encode([
        'success' => false,
        'message' => $errorMsg
    ]);
}
?>

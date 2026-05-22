<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Get IntaSend credentials from environment variables
$publishableKey = getenv('INTASEND_PUBLISHABLE_KEY');
$secretKey = getenv('INTASEND_SECRET_KEY');
$walletId = getenv('INTASEND_WALLET_ID');
$isTestMode = getenv('INTASEND_TEST_MODE') === 'true' || getenv('INTASEND_TEST_MODE') === '1';

// If in test mode, use sandbox URL
$apiUrl = $isTestMode 
    ? 'https://sandbox.intasend.com/api/' 
    : 'https://payment.intasend.com/api/';

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

// Format phone number to 254XXXXXXXXX
$phoneNumber = preg_replace('/^0/', '254', $phoneNumber);
$phoneNumber = preg_replace('/^\+/', '', $phoneNumber);

// Validate
if (empty($phoneNumber) || strlen($phoneNumber) < 10) {
    echo json_encode(['success' => false, 'message' => 'Invalid phone number']);
    exit;
}

// Prepare STK Push request
$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, $apiUrl . 'mpesa/stk-push/');
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
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
    'narrative' => 'NiconX Learning - ' . strtoupper($classLevel)
];

// Add wallet_id if available
if (!empty($walletId)) {
    $postData['wallet_id'] = $walletId;
}

// Add callback URL for webhook
$callbackUrl = getenv('INTASEND_CALLBACK_URL') ?: 'https://' . $_SERVER['HTTP_HOST'] . '/api/intasend-webhook.php';
$postData['webhook'] = $callbackUrl;

curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($postData));

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

$result = json_decode($response, true);

// Log response for debugging
error_log("IntaSend STK Push Response: " . $response);

if ($httpCode === 200 || $httpCode === 201) {
    if (isset($result['success']) && $result['success'] === true) {
        echo json_encode([
            'success' => true,
            'message' => 'STK Push sent to your phone',
            'invoice_id' => $result['invoice_id'] ?? null,
            'checkout_id' => $result['id'] ?? null
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => $result['message'] ?? 'STK Push failed. Please try again.'
        ]);
    }
} else {
    $errorMsg = $result['message'] ?? $result['error'] ?? 'Payment initiation failed';
    echo json_encode([
        'success' => false,
        'message' => $errorMsg
    ]);
}
?>

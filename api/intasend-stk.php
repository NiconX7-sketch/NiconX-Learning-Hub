<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Load environment variables
$publishableKey = getenv('INTASEND_PUBLISHABLE_KEY') ?: 'YOUR_PUBLISHABLE_KEY';
$secretKey = getenv('INTASEND_SECRET_KEY') ?: 'YOUR_SECRET_KEY';
$isTestMode = getenv('INTASEND_TEST_MODE') ?: true;

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
$phoneNumber = $data['phone'] ?? '';
$amount = $data['amount'] ?? 20;
$classLevel = $data['class_level'] ?? '';
$email = $data['email'] ?? 'student@niconxlearning.co.ke';

// Validate phone number (format to 254XXXXXXXXX)
$phoneNumber = preg_replace('/^0/', '254', $phoneNumber);
$phoneNumber = preg_replace('/^\+/', '', $phoneNumber);

if (empty($phoneNumber) || strlen($phoneNumber) < 10) {
    echo json_encode(['success' => false, 'message' => 'Invalid phone number']);
    exit;
}

// Set API URL based on test/production mode
$apiUrl = $isTestMode 
    ? 'https://sandbox.intasend.com/api/' 
    : 'https://payment.intasend.com/api/';

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
    'amount' => $amount,
    'api_ref' => 'NICONX_' . time() . '_' . uniqid(),
    'currency' => 'KES',
    'email' => $email,
    'narrative' => 'NiconX Learning Hub - ' . strtoupper($classLevel) . ' Access'
];

// Add callback URL for webhook
$callbackUrl = getenv('INTASEND_CALLBACK_URL') ?: 'https://nicon-x-learning-hub.vercel.app/api/intasend-webhook.php';
$postData['webhook'] = $callbackUrl;

curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($postData));

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

$result = json_decode($response, true);

if ($httpCode === 200 || $httpCode === 201) {
    // STK Push initiated successfully
    echo json_encode([
        'success' => true,
        'message' => 'STK Push sent to your phone',
        'invoice_id' => $result['invoice_id'] ?? null,
        'checkout_id' => $result['id'] ?? null
    ]);
} else {
    $errorMsg = $result['message'] ?? $result['error'] ?? 'Payment initiation failed';
    echo json_encode([
        'success' => false,
        'message' => $errorMsg
    ]);
}
?>
